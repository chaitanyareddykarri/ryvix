import {ContextBuilder} from './context/context-builder';
export function embeddingModel(){const model=process.env.GEMINI_EMBEDDING_MODEL;return process.env.RYVIX_REPOSITORY_SEMANTIC_ENABLED==='true'&&process.env.GEMINI_API_KEY&&model&&/^[\w.-]+$/.test(model)?model:null;}
export async function embedRepositoryTexts(texts:string[],query=false,signal?:AbortSignal):Promise<number[][]>{
  const model=embeddingModel();if(!model||texts.length<1||texts.length>100)throw new Error('Embedding configuration or batch unavailable');
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,{
    method:'POST',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(15000),...(signal?[signal]:[])]),
    headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY!},
    body:JSON.stringify({requests:texts.map(text=>({model:`models/${model}`,taskType:query?'RETRIEVAL_QUERY':'RETRIEVAL_DOCUMENT',
      content:{parts:[{text:ContextBuilder.sanitizeText(text).slice(0,6000)}]}}))})});
  if(!response.ok||!response.body){await response.body?.cancel();throw new Error('Embedding provider unavailable');}
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>8000000)throw new Error('Embedding response limit');chunks.push(part.value);}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const vectors=JSON.parse(Buffer.concat(chunks).toString()).embeddings?.map((e:any)=>e.values);
  if(!Array.isArray(vectors)||vectors.length!==texts.length||vectors.some(v=>!Array.isArray(v)||v.length<1||v.length>4096||v.length!==vectors[0].length||v.some((x:unknown)=>typeof x!=='number'||!Number.isFinite(x))))throw new Error('Invalid embedding vectors');
  return vectors.map((v:number[])=>{const norm=Math.hypot(...v);if(!norm||!Number.isFinite(norm))throw new Error('Invalid embedding norm');return v.map(x=>x/norm);});
}
export function cosineScore(a:number[],b:number[]){return a.length===b.length?a.reduce((sum,x,i)=>sum+x*b[i],0):-1;}
