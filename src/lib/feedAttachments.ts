import { FeedAttachment, Post } from '../types';
import { parseStorageReference } from './mediaStorageReference';

export const MAX_FEED_ATTACHMENTS = 10;

export interface FeedAttachmentRow {
  id: string;
  media_type: FeedAttachment['mediaType'];
  storage_bucket: string | null;
  object_path: string | null;
  external_url: string | null;
  media_thumbnail: string | null;
  media_provider: string | null;
  original_filename: string | null;
  byte_size: number | null;
}

export interface UploadedFeedAttachment {
  id: string;
  mediaType: FeedAttachment['mediaType'];
  mediaUrl: string;
  storageReference?: string;
  mediaThumbnail?: string;
  mediaProvider?: string;
  originalFilename?: string;
  mimeType?: string;
  byteSize?: number;
  file?: File;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

export type FeedPostAttachmentInput = Pick<
  UploadedFeedAttachment,
  'mediaType' | 'mediaUrl' | 'storageReference' | 'mediaThumbnail' | 'mediaProvider' | 'originalFilename' | 'mimeType' | 'byteSize'
>;

export interface FeedPostAttachmentInsertRow {
  post_id: string;
  owner_id: string;
  position: number;
  media_type: FeedAttachment['mediaType'];
  storage_bucket: string | null;
  object_path: string | null;
  external_url: string | null;
  media_thumbnail: string | null;
  media_provider: string | null;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: number | null;
}

export function canAddFeedAttachments(currentCount: number, incomingCount: number): boolean {
  return incomingCount > 0 && currentCount + incomingCount <= MAX_FEED_ATTACHMENTS;
}

export function buildFeedPostAttachmentRows(
  postId: string,
  ownerId: string,
  attachments: FeedPostAttachmentInput[]
): FeedPostAttachmentInsertRow[] {
  return attachments.map((attachment, position) => {
    const reference = attachment.storageReference ||
      (parseStorageReference(attachment.mediaUrl) ? attachment.mediaUrl : undefined);
    const storageReference = reference ? parseStorageReference(reference) : null;
    return {
      post_id: postId,
      owner_id: ownerId,
      position,
      media_type: attachment.mediaType,
      storage_bucket: storageReference?.bucket || null,
      object_path: storageReference?.objectPath || null,
      external_url: storageReference ? null : attachment.mediaUrl,
      media_thumbnail: attachment.mediaThumbnail || null,
      media_provider: attachment.mediaProvider || null,
      original_filename: attachment.originalFilename || null,
      mime_type: attachment.mimeType || null,
      byte_size: attachment.byteSize ?? null
    };
  });
}

export async function uploadFeedAttachmentFile(
  file: File,
  userId: string,
  upload: (file: File, userId: string) => Promise<{
    success: boolean;
    mediaType: 'image' | 'video' | 'audio' | 'embed';
    mediaUrl?: string;
    previewUrl?: string;
    provider?: string;
    sizeKb?: number;
    error?: string;
  }>
): Promise<{ data: UploadedFeedAttachment | null; error: Error | null }> {
  try {
    const result = await upload(file, userId);
    if (!result.success || !result.mediaUrl || !result.previewUrl) {
      return {
        data: null,
        error: new Error(result.error || 'The attachment upload did not complete.')
      };
    }
    return {
      data: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mediaType: result.mediaType,
        mediaUrl: result.previewUrl,
        storageReference: result.mediaUrl,
        mediaProvider: result.provider,
        originalFilename: file.name,
        mimeType: file.type,
        byteSize: file.size,
        file,
        status: 'ready'
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('The attachment upload failed.')
    };
  }
}

export function isOwnedPublicFeedReference(
  reference: string,
  ownerId: string,
  currentUserId: string,
  feedBucket: string
): boolean {
  const parsed = parseStorageReference(reference);
  return Boolean(parsed && parsed.bucket === feedBucket && ownerId === currentUserId);
}

export function mapFeedAttachmentRow(
  row: FeedAttachmentRow,
  getPublicUrl: (bucket: string, objectPath: string) => string
): FeedAttachment {
  const mediaUrl = row.storage_bucket && row.object_path
    ? getPublicUrl(row.storage_bucket, row.object_path)
    : row.external_url || '';
  return {
    id: row.id,
    mediaType: row.media_type,
    mediaUrl,
    mediaThumbnail: row.media_thumbnail || undefined,
    mediaProvider: row.media_provider || undefined,
    originalFilename: row.original_filename || undefined,
    byteSize: row.byte_size ?? undefined
  };
}

export function getPostAttachments(post: Post): FeedAttachment[] {
  if (post.attachments?.length) return post.attachments;
  if (!post.mediaUrl || !post.mediaType) return [];
  return [{
    id: `legacy-${post.id}`,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    mediaThumbnail: post.mediaThumbnail,
    mediaProvider: post.mediaProvider
  }];
}
