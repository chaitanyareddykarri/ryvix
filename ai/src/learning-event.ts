import { ContextBuilder } from './context/context-builder';

/** Redact values recursively without turning serialized JSON into invalid syntax. */
export function sanitizeLearningEvent(input: Record<string,unknown>): Record<string,unknown> {
  const clean=(value:unknown,depth:number):unknown=>{
    if(depth>12)throw new Error('Learning event nesting exceeds limit');
    if(typeof value==='string')return ContextBuilder.sanitizeText(value);
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Non-finite learning value');
    if(Array.isArray(value))return value.map(item=>clean(item,depth+1));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[
      key,/(password|passwd|secret|token|api[_-]?key|private[_-]?key|authorization)/i.test(key)?'[REDACTED_SECRET]':clean(item,depth+1),
    ]));
    return value;
  };
  return clean(input,0) as Record<string,unknown>;
}
