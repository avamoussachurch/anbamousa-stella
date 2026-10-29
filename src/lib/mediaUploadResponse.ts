import { parseStorageReference } from './mediaStorageReference';

export interface PersistentMediaUploadResult {
  success: boolean;
  mediaUrl?: string;
  previewUrl?: string;
  provider?: string;
  sizeKb?: number;
  error?: string;
}

export async function parsePersistentMediaUploadResponse(response: {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}): Promise<PersistentMediaUploadResult> {
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || data?.success !== true) {
    return {
      success: false,
      error: typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : `Persistent media upload failed (HTTP ${response.status}).`
    };
  }
  const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl : undefined;
  if (!parseStorageReference(mediaUrl) || typeof data.previewUrl !== 'string' || !data.previewUrl) {
    return { success: false, error: 'The server did not confirm persistent media storage.' };
  }
  return {
    success: true,
    mediaUrl,
    previewUrl: data.previewUrl,
    provider: typeof data.provider === 'string' ? data.provider : undefined,
    sizeKb: typeof data.sizeKb === 'number' ? data.sizeKb : undefined
  };
}
