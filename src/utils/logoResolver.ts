declare global {
  interface Window {
    __EMBEDDED_SCHOOL_LOGO__?: string;
  }
}

export function resolveSchoolLogo(logo?: string): string {
  const trimmed = (logo ?? '').trim();
  if (!trimmed) return '';
  if (
    typeof window !== 'undefined' &&
    window.__EMBEDDED_SCHOOL_LOGO__ &&
    trimmed.startsWith('/assets/aistudio/logo_nesaka')
  ) {
    return window.__EMBEDDED_SCHOOL_LOGO__;
  }
  return trimmed;
}
