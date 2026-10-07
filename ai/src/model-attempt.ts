import type {TokenUsage} from './token-usage';
export type ModelAttempt={id:string;provider:string;model:string;status:'started'|'completed'|'failed'|'cancelled';latencyMs:number;usage:TokenUsage|null};
export type AttemptObserver=(attempt:ModelAttempt)=>Promise<void>;
/** Production callers must supply a backend-authorized durable accounting callback. */
export function requireAttemptObserver(observer?:AttemptObserver):void {
  if(process.env.NODE_ENV==='production'&&typeof observer!=='function')throw new Error('Production model calls require scoped usage accounting');
}
