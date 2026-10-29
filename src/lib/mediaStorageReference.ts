const STORAGE_REFERENCE_PREFIX = 'supabase-storage://';

export interface StorageReference {
  bucket: string;
  objectPath: string;
}

export function createStorageReference(bucket: string, objectPath: string): string {
  if (!isSafeStorageSegment(bucket) || !isSafeStoragePath(objectPath)) {
    throw new Error('Invalid Supabase Storage bucket or object path.');
  }
  return `${STORAGE_REFERENCE_PREFIX}${bucket}/${objectPath}`;
}

export function parseStorageReference(value: unknown): StorageReference | null {
  if (typeof value !== 'string' || !value.startsWith(STORAGE_REFERENCE_PREFIX)) {
    return null;
  }
  const remainder = value.slice(STORAGE_REFERENCE_PREFIX.length);
  const slash = remainder.indexOf('/');
  if (slash < 1) return null;

  const bucket = remainder.slice(0, slash);
  const objectPath = remainder.slice(slash + 1);
  if (!isSafeStorageSegment(bucket) || !isSafeStoragePath(objectPath)) return null;
  return { bucket, objectPath };
}

function isSafeStorageSegment(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value);
}

function isSafeStoragePath(value: string): boolean {
  if (!value || value.includes('\\') || /[\u0000-\u001f?#]/.test(value)) return false;
  return value.split('/').every(segment =>
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(segment)
  );
}
