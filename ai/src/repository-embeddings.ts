import {ContextBuilder} from './context/context-builder';
import {randomUUID} from 'node:crypto';
import type {AttemptObserver,ModelAttempt} from './model-attempt';
import {requireAttemptObserver} from './model-attempt';
import {tokenCount} from './token-usage';
export function embeddingModel(){const model=process.env.GEMINI_EMBEDDING_MODEL;return process.env.RYVIX_REPOSITORY_SEMANTIC_ENABLED==='true'&&process.env.GEMINI_API_KEY&&model&&/^[\w.-]+$/.test(model)?model:null;}
export async function embedRepositoryTexts(texts:string[],query=false,signal?:AbortSignal,onAttempt?:AttemptObserver):Promise<number[][]>{
  requireAttemptObserver(onAttempt);
  const model=embeddingModel();if(!model||texts.length<1||texts.length>100)throw new Error('Embedding configuration or batch unavailable');
  const deadline=AbortSignal.any([AbortSignal.timeout(15000),...(signal?[signal]:[])]);
  deadline.throwIfAborted();
  const attempt:ModelAttempt={id:randomUUID(),provider:'gemini',model,status:'started',latencyMs:0,usage:null};
  const started=Date.now();await onAttempt?.({...attempt});
  try {
  deadline.throwIfAborted();
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,{
    method:'POST',redirect:'error',signal:deadline,
    headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY!},
    body:JSON.stringify({requests:texts.map(text=>({model:`models/${model}`,taskType:query?'RETRIEVAL_QUERY':'RETRIEVAL_DOCUMENT',
      content:{parts:[{text:ContextBuilder.sanitizeText(text).slice(0,6000)}]}}))})});
  if(!response.ok||!response.body){await response.body?.cancel();throw new Error('Embedding provider unavailable');}
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>8000000)throw new Error('Embedding response limit');chunks.push(part.value);}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const data=JSON.parse(Buffer.concat(chunks).toString());
  if(data.usageMetadata)attempt.usage={promptTokens:tokenCount(data.usageMetadata.promptTokenCount),completionTokens:null,cachedInputTokens:null,cacheWriteTokens:null};
  const vectors=data.embeddings?.map((e:any)=>e.values);
  if(!Array.isArray(vectors)||vectors.length!==texts.length||vectors.some(v=>!Array.isArray(v)||v.length<1||v.length>4096||v.length!==vectors[0].length||v.some((x:unknown)=>typeof x!=='number'||!Number.isFinite(x))))throw new Error('Invalid embedding vectors');
  const normalized=vectors.map((v:number[])=>{const norm=Math.hypot(...v);if(!norm||!Number.isFinite(norm))throw new Error('Invalid embedding norm');return v.map(x=>x/norm);});
  attempt.status='completed';return normalized;
  } catch(error) {attempt.status=deadline.aborted?'cancelled':'failed';throw error;}
  finally {await onAttempt?.({...attempt,latencyMs:Math.min(300000,Math.max(0,Date.now()-started))});}
}
export function cosineScore(a:number[],b:number[]){return a.length===b.length?a.reduce((sum,x,i)=>sum+x*b[i],0):-1;}
