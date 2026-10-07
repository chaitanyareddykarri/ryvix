import { ContextBuilder } from './context/context-builder';
import {randomUUID} from 'node:crypto';
import {requireAttemptObserver,type AttemptObserver,type ModelAttempt} from './model-attempt';
import {tokenCount} from './token-usage';
export interface SourceExcerpt {id:string;title:string;excerpt:string;}
export async function rerankSources<T extends SourceExcerpt>(question:string,sources:T[],signal?:AbortSignal,onAttempt?:AttemptObserver):Promise<{sources:T[];mode:string}> {
  const model=process.env.GEMINI_EMBEDDING_MODEL,key=process.env.GEMINI_API_KEY;
  if(!model||!key||!sources.length)return {sources,mode:'lexical (embeddings not configured or no sources)'};
  if(!/^[a-zA-Z0-9._-]+$/.test(model))return {sources,mode:'lexical (invalid embedding configuration)'};
  try{
    requireAttemptObserver(onAttempt);
    const deadline=AbortSignal.any([AbortSignal.timeout(8000),...(signal?[signal]:[])]);
    deadline.throwIfAborted();
    const attempt:ModelAttempt={id:randomUUID(),provider:'gemini',model,status:'started',latencyMs:0,usage:null};
    const started=Date.now();await onAttempt?.({...attempt});
    try {
    deadline.throwIfAborted();
    const selected=sources.slice(0,20),texts=[question,...selected.map(source=>`${source.title}\n${source.excerpt}`)];
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,{
      method:'POST',redirect:'error',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      signal:deadline,
      body:JSON.stringify({requests:texts.map((text,index)=>({model:`models/${model}`,content:{parts:[{text:ContextBuilder.sanitizeText(text).slice(0,4500)}]},taskType:index===0?'RETRIEVAL_QUERY':'RETRIEVAL_DOCUMENT'}))})});
    if(!response.ok||!response.body){await response.body?.cancel();throw new Error('Embedding provider unavailable');}
    const reader=response.body.getReader();let size=0,text='';const decoder=new TextDecoder();
    try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>1500000)throw new Error('Embedding response too large');text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    const data=JSON.parse(text);
    if(data.usageMetadata)attempt.usage={promptTokens:tokenCount(data.usageMetadata.promptTokenCount),completionTokens:null,cachedInputTokens:null,cacheWriteTokens:null};
    const vectors=data.embeddings?.map((entry:any)=>entry.values) as number[][];
    if(!Array.isArray(vectors)||vectors.length!==texts.length||!vectors[0]?.length||vectors[0].length>8192||
      vectors.some(vector=>!Array.isArray(vector)||vector.length!==vectors[0].length||vector.some(value=>typeof value!=='number'||!Number.isFinite(value))))throw new Error('Invalid embeddings');
    const norm=(v:number[])=>Math.sqrt(v.reduce((sum,x)=>sum+x*x,0));const queryNorm=norm(vectors[0]);
    if(!queryNorm||!Number.isFinite(queryNorm)||vectors.some(vector=>!norm(vector)||!Number.isFinite(norm(vector))))throw new Error('Invalid embedding norm');
    const ranked=selected.map((source,index)=>({source,score:vectors[0].reduce((sum,x,i)=>sum+x*vectors[index+1][i],0)/(queryNorm*norm(vectors[index+1]))}));
    ranked.sort((a,b)=>b.score-a.score);
    attempt.status='completed';
    return {sources:ranked.map(row=>row.source),mode:`semantic reranking of authorized candidates (${model})`};
    }catch(error){attempt.status=deadline.aborted?'cancelled':'failed';throw error;}
    finally {await onAttempt?.({...attempt,latencyMs:Math.min(300000,Math.max(0,Date.now()-started))});}
  }catch{if(signal?.aborted)throw new Error('Retrieval cancelled');return {sources,mode:'lexical (embedding provider unavailable)'};}
}
