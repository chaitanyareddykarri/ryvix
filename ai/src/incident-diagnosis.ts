import { ContextBuilder } from './context/context-builder';

/** Validate provider evidence before it can enter legacy pattern memory. */
export function parseIncidentDiagnosis(content: string) {
  if (content.length > 16000) throw new Error('Invalid incident diagnosis');
  const text = content.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, '$1');
  let value: any;
  try { value = JSON.parse(text); } catch { throw new Error('Invalid incident diagnosis'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid incident diagnosis');
  for (const key of ['threatType', 'diagnosis', 'remediationAction', 'action']) {
    if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 4000) {
      throw new Error('Invalid incident diagnosis');
    }
  }
  if (!/^[A-Z][A-Z0-9_]{0,99}$/.test(value.threatType) ||
      !/^[a-z][a-z0-9_.]{0,99}$/.test(value.action) ||
      !value.params || typeof value.params !== 'object' || Array.isArray(value.params)) {
    throw new Error('Invalid incident diagnosis');
  }
  return JSON.parse(ContextBuilder.sanitizeText(JSON.stringify(value))) as {
    threatType: string; diagnosis: string; remediationAction: string;
    action: string; params: Record<string, unknown>;
  };
}
