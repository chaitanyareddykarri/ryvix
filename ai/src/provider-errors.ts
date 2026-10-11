/** Safe diagnostics: never include provider response bodies, URLs or credentials. */
export function providerFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const status = /(?:HTTP\s+|^)(400|401|403|404|413|429|500|502|503|504)\b/.exec(message)?.[1];
  if (status === '401' || status === '403') return 'authentication or permission rejected';
  if (status === '400' || status === '413') return 'request rejected; check context and output limits';
  if (status === '404') return 'model or endpoint unavailable';
  if (status === '429') return 'quota or rate limit reached';
  if (status) return 'provider service unavailable';
  if (/output limit|Empty provider response/.test(message)) return 'empty or truncated response';
  if (error instanceof Error && /Timeout|Abort/.test(error.name)) return 'request timed out';
  return 'network or provider request failed';
}

export class ModelUnavailableError extends Error {
  constructor(reasons: string[]) {
    super(`No AI provider is available. ${reasons.join('; ')}. Check provider settings and retry.`);
    this.name = 'ModelUnavailableError';
  }
}
