import type { Language } from '../types';

/**
 * Keep backend/service failures understandable in Arabic UI without exposing
 * raw English infrastructure messages. Existing Arabic messages are preserved.
 */
export function getLocalizedErrorMessage(value: unknown, lang: Language | string): string {
  const message = value instanceof Error
    ? value.message
    : typeof value === 'string'
      ? value
      : '';

  if (lang !== 'ar') return message || 'An unexpected error occurred. Please try again.';
  if (!message.trim()) return 'حصلت مشكلة غير متوقعة. جرّب تاني.';
  if (/[\u0600-\u06FF]/.test(message)) return message;

  const normalized = message.toLowerCase();

  if (/failed to fetch|network|connection|offline|internet|load failed/.test(normalized)) {
    return 'الاتصال بالإنترنت مش مستقر. اتأكد من الاتصال وجرّب تاني.';
  }
  if (/timeout|timed out|deadline exceeded/.test(normalized)) {
    return 'الطلب أخد وقت أطول من اللازم. جرّب تاني.';
  }
  if (/unauthorized|not authenticated|authentication required|invalid jwt|token expired|401/.test(normalized)) {
    return 'جلسة تسجيل الدخول انتهت. سجّل دخولك تاني وجرّب.';
  }
  if (/forbidden|permission denied|not allowed|insufficient privilege|403/.test(normalized)) {
    return 'معندكش صلاحية تعمل الإجراء ده.';
  }
  if (/not found|does not exist|no rows|404/.test(normalized)) {
    return 'المحتوى المطلوب مش موجود أو اتنقل.';
  }
  if (/already exists|duplicate|unique constraint|23505/.test(normalized)) {
    return 'البيانات دي موجودة بالفعل.';
  }
  if (/invalid|validation|required field|23502|22p02/.test(normalized)) {
    return 'راجع البيانات اللي دخلتها وجرّب تاني.';
  }

  return 'حصلت مشكلة وإحنا بننفّذ الطلب. جرّب تاني.';
}
