/** Never redirect OAuth results to a caller-controlled origin. */
export function safeOAuthReturn(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/dashboard';
  try {
    const url = new URL(value,'https://ryvix.invalid');
    return url.origin === 'https://ryvix.invalid' ? url.pathname + url.search : '/dashboard';
  } catch { return '/dashboard'; }
}
