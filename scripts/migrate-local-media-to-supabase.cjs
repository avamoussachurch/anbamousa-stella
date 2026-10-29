#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');
const FEED_BUCKET = process.env.SUPABASE_FEED_MEDIA_BUCKET || 'stella-feed-media-v1';
const SOURCE_BUCKET = process.env.SUPABASE_CURRICULUM_MEDIA_BUCKET || 'stella-curriculum-media-v1';
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

function getLegacyFilename(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const pathname = value.startsWith('/') ? value.split(/[?#]/, 1)[0] : new URL(value).pathname;
    const marker = '/uploads/';
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const filename = decodeURIComponent(pathname.slice(index + marker.length));
    if (!filename || filename.includes('/') || filename.includes('\\') || filename === '.' || filename === '..') return null;
    return filename;
  } catch {
    return null;
  }
}

function mimeTypeFor(filename) {
  const extension = path.extname(filename).toLowerCase();
  const known = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
    '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg', '.aac': 'audio/aac', '.webm': 'video/webm', '.mp4': 'video/mp4',
    '.mov': 'video/quicktime', '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.doc': 'application/msword', '.ppt': 'application/vnd.ms-powerpoint'
  };
  return known[extension] || 'application/octet-stream';
}

async function fetchAll(client, table, columns, urlColumn) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from(table)
      .select(columns)
      .like(urlColumn, '%/uploads/%')
      .range(offset, offset + 499);
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

async function migrateRow(client, record, { table, urlColumn, ownerColumn, bucket, visibility }) {
  const filename = getLegacyFilename(record[urlColumn]);
  if (!filename) return { status: 'invalid' };
  const localPath = path.resolve(uploadsRoot, filename);
  if (!localPath.startsWith(`${uploadsRoot}${path.sep}`) || !fs.existsSync(localPath)) {
    return { status: 'missing' };
  }

  const bytes = fs.readFileSync(localPath);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-160);
  const recordId = String(record.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  if (!recordId) return { status: 'invalid' };
  const objectPath = `legacy/${digest}/${recordId}/${safeFilename}`;
  if (!APPLY) return { status: 'planned' };

  const mimeType = mimeTypeFor(filename);
  const { error: uploadError } = await client.storage.from(bucket).upload(objectPath, bytes, {
    contentType: mimeType,
    cacheControl: '31536000',
    upsert: true
  });
  if (uploadError) throw new Error(`Storage upload failed for a ${table} record: ${uploadError.message}`);

  const reference = `supabase-storage://${bucket}/${objectPath}`;
  const rawOwnerId = record[ownerColumn];
  const ownerId = typeof rawOwnerId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawOwnerId)
    ? rawOwnerId
    : null;
  const { error: metadataError } = await client.from('media_objects').upsert({
    storage_bucket: bucket,
    object_path: objectPath,
    owner_id: ownerId,
    visibility,
    media_type: mimeType.startsWith('image/') ? 'image'
      : mimeType.startsWith('video/') ? 'video'
      : mimeType.startsWith('audio/') ? 'audio' : 'document',
    mime_type: mimeType,
    original_filename: filename,
    byte_size: bytes.length
  }, { onConflict: 'storage_bucket,object_path' });
  if (metadataError) throw new Error(`Metadata write failed for a ${table} record: ${metadataError.message}`);

  const { error: updateError } = await client.from(table)
    .update({ [urlColumn]: reference })
    .eq('id', record.id);
  if (updateError) throw new Error(`Could not update ${table} reference: ${updateError.message}`);
  return { status: 'migrated' };
}

async function main() {
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    throw new Error('Set SUPABASE_URL before running this migration procedure.');
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) throw new Error('Set the server-only SUPABASE_SERVICE_ROLE_KEY before running this procedure.');
  if (!fs.existsSync(uploadsRoot)) throw new Error(`Local uploads directory was not found: ${uploadsRoot}`);

  const client = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const targets = [
    { table: 'feed_posts', urlColumn: 'media_url', ownerColumn: 'author_id', bucket: FEED_BUCKET, visibility: 'public' },
    { table: 'lesson_sources', urlColumn: 'file_url', ownerColumn: 'uploaded_by', bucket: SOURCE_BUCKET, visibility: 'private' }
  ];
  const records = [];
  for (const target of targets) {
    const rows = await fetchAll(client, target.table, `id, ${target.ownerColumn}, ${target.urlColumn}`, target.urlColumn);
    for (const row of rows) records.push({ row, target });
  }

  const counts = { planned: 0, migrated: 0, missing: 0, invalid: 0 };
  for (const { row, target } of records) {
    const result = await migrateRow(client, row, target);
    counts[result.status] += 1;
  }

  console.log(`${APPLY ? 'Migration complete' : 'DRY RUN — no files or database rows changed'}:`);
  console.log(`  eligible records: ${records.length}`);
  console.log(`  ${APPLY ? 'migrated' : 'would migrate'}: ${counts[APPLY ? 'migrated' : 'planned']}`);
  console.log(`  local files missing: ${counts.missing}`);
  console.log(`  unsafe or invalid legacy paths: ${counts.invalid}`);
  if (!APPLY) console.log('Review the counts, preserve a backup, then rerun with --apply to write changes.');
  console.log('Original local files are never deleted by this procedure.');
}

main().catch(error => {
  console.error(`Media migration stopped: ${error.message}`);
  process.exitCode = 1;
});
