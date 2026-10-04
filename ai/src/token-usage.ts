export interface TokenUsage {promptTokens:number|null;completionTokens:number|null;cachedInputTokens:number|null;cacheWriteTokens:number|null;}
export const tokenCount=(v:unknown):number|null=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=1_000_000_000?v:null;
const count=tokenCount;
export function streamUsage(event:any,claude:boolean,previous?:TokenUsage):TokenUsage|undefined {
  const raw=claude?(event.type==='message_start'?event.message?.usage:event.type==='message_delta'?event.usage:undefined):event.usage||event.x_groq?.usage;
  if(!raw||typeof raw!=='object')return previous;
  const input=count(claude?raw.input_tokens:raw.prompt_tokens),output=count(claude?raw.output_tokens:raw.completion_tokens);
  const cached=count(claude?raw.cache_read_input_tokens:raw.prompt_tokens_details?.cached_tokens);
  const written=count(raw.cache_creation_input_tokens);
  return {promptTokens:input===null?(previous?.promptTokens??null):claude?input+(cached??0)+(written??0):input,
    completionTokens:output??previous?.completionTokens??null,
    cachedInputTokens:cached??previous?.cachedInputTokens??null,cacheWriteTokens:written??previous?.cacheWriteTokens??null};
}

/** Operator-configured estimate, never a provider invoice or a default price. */
export function estimateUsageCost(provider:string,model:string,usage:TokenUsage,raw=process.env.RYVIX_MODEL_RATES_JSON){
  try {
    if(!raw||raw.length>32000||usage.promptTokens===null||usage.completionTokens===null)return null;
    const rate=JSON.parse(raw)[`${provider}:${model}`];
    if(!rate||typeof rate.version!=='string'||rate.version.length>100||!/^[A-Z]{3}$/.test(rate.currency))return null;
    const valid=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000000;
    if(!valid(rate.inputPerMillion)||!valid(rate.outputPerMillion))return null;
    const cached=usage.cachedInputTokens??0,written=usage.cacheWriteTokens??0;
    if(cached+written>usage.promptTokens||(cached&&!valid(rate.cachedInputPerMillion))||(written&&!valid(rate.cacheWritePerMillion)))return null;
    const amount=((usage.promptTokens-cached-written)*rate.inputPerMillion+usage.completionTokens*rate.outputPerMillion+
      cached*(rate.cachedInputPerMillion??0)+written*(rate.cacheWritePerMillion??0))/1_000_000;
    return {amount,currency:rate.currency,rateVersion:rate.version,kind:'configured-rate estimate' as const};
  } catch{return null;}
}
