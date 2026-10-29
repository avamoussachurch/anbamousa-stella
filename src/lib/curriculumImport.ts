import { TaxisAttachment } from '../types';

export type CurriculumImportCategory = 'sunday_school' | 'hymns' | 'taxis';
export type CurriculumImportStage = 'ready' | 'creating' | 'uploading' | 'saving' | 'success' | 'error';

export interface CurriculumImportCheckpoint {
  recordId?: string;
  mediaReference?: string;
}

export interface CurriculumImportOperations {
  ensureDraft: (recordId?: string) => Promise<string>;
  upload: () => Promise<string>;
  attach: (recordId: string, mediaReference: string) => Promise<void>;
}

export interface CurriculumImportResult {
  checkpoint: CurriculumImportCheckpoint;
  stage: CurriculumImportStage;
  error?: string;
}

const ACCEPTED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.pptx', '.doc', '.ppt',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp3', '.wav', '.m4a', '.aac', '.ogg',
  '.mp4', '.webm', '.mov'
]);

const HYMN_EXTENSIONS = new Set(['.pdf', '.mp3', '.wav', '.m4a', '.aac', '.ogg']);

export function isAuthorizedCurriculumImporter(
  user: { role?: string } | null | undefined,
  isGuest: boolean,
  isSupabaseConfigured: boolean
): boolean {
  return Boolean(
    user &&
    !isGuest &&
    isSupabaseConfigured &&
    (user.role === 'teacher' || user.role === 'admin')
  );
}

export function getImportFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}

export function validateImportFile(
  category: CurriculumImportCategory,
  file: Pick<File, 'name' | 'size'>
): string | null {
  const extension = getImportFileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    return 'نوع الملف غير مدعوم. اختار PDF أو Word أو PowerPoint أو صورة أو صوت أو فيديو مسموح.';
  }
  if (category === 'hymns' && !HYMN_EXTENSIONS.has(extension)) {
    return 'مكتبة الألحان تقبل حالياً التسجيلات الصوتية وملفات PDF فقط. استخدم قسم مدارس الأحد أو الطقس لباقي أنواع الملفات.';
  }
  if (file.size <= 0) return 'الملف فارغ.';
  if (file.size > 100 * 1024 * 1024) return 'حجم الملف أكبر من الحد المسموح (100 ميجابايت).';
  return null;
}

export function getImportFileFingerprint(file: Pick<File, 'name' | 'size' | 'type' | 'lastModified'>): string {
  return `${file.name.trim().toLocaleLowerCase()}|${file.size}|${file.type.toLocaleLowerCase()}|${file.lastModified}`;
}

export function normalizeImportTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function isDuplicateImportTitle(
  title: string,
  existingTitles: ReadonlySet<string>,
  batchTitles: Iterable<string>
): boolean {
  const normalizedTitle = normalizeImportTitle(title);
  return existingTitles.has(normalizedTitle) ||
    Array.from(batchTitles).some(candidate => normalizeImportTitle(candidate) === normalizedTitle);
}

export function markCurriculumImportDraft<T extends object>(item: T): T & { status: 'draft' } {
  return { ...item, status: 'draft' };
}

export function createTaxisAttachment(
  file: Pick<File, 'name' | 'type' | 'size'>,
  mediaReference: string,
  id: string
): TaxisAttachment {
  const extension = getImportFileExtension(file.name);
  let fileType: TaxisAttachment['fileType'];
  if (file.type.startsWith('audio/')) fileType = 'audio';
  else if (file.type.startsWith('image/')) fileType = 'image';
  else if (extension === '.pdf') fileType = 'pdf';
  else if (['.mp4', '.webm', '.mov'].includes(extension)) fileType = 'video';
  else if (['.ppt', '.pptx'].includes(extension)) fileType = 'presentation';
  else fileType = 'doc';
  return {
    id,
    title: file.name,
    fileUrl: mediaReference,
    fileType,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream'
  };
}

export async function runCurriculumImport(
  initialCheckpoint: CurriculumImportCheckpoint,
  operations: CurriculumImportOperations,
  onStage: (stage: CurriculumImportStage, checkpoint: CurriculumImportCheckpoint) => void
): Promise<CurriculumImportResult> {
  let checkpoint = { ...initialCheckpoint };
  try {
    if (!checkpoint.recordId) {
      onStage('creating', checkpoint);
      checkpoint.recordId = await operations.ensureDraft();
      onStage('creating', checkpoint);
    }

    if (!checkpoint.mediaReference) {
      onStage('uploading', checkpoint);
      checkpoint.mediaReference = await operations.upload();
      onStage('uploading', checkpoint);
    }

    onStage('saving', checkpoint);
    await operations.attach(checkpoint.recordId, checkpoint.mediaReference);
    onStage('success', checkpoint);
    return { checkpoint, stage: 'success' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر استيراد العنصر.';
    onStage('error', checkpoint);
    return { checkpoint, stage: 'error', error: message };
  }
}
