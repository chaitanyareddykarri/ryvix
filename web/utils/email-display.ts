/** Client-safe formatting only; no authentication or secret handling. */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'u***@example.com';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
