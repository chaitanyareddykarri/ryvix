import type {TokenUsage} from './token-usage';
export type ModelAttempt={id:string;provider:string;model:string;status:'started'|'completed'|'failed'|'cancelled';latencyMs:number;usage:TokenUsage|null};
export type AttemptObserver=(attempt:ModelAttempt)=>Promise<void>;
