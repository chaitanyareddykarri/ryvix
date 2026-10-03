import 'server-only';
import { queryDirectDb } from './direct-db';
import { githubTokenForProject } from './github-credentials';
import { RequestError } from './tenant-context';
import { ContextBuilder } from '../../ai/src/context/context-builder';

/** Read a bounded, immutable snapshot of an explicitly selected authorized repository. */
export async function repositoryChatContext(org:string,user:string,repositoryId:string,question:string,signal?:AbortSignal) {
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(repositoryId))throw new RequestError('Invalid repository.',400);
  const rows=await queryDirectDb(`SELECT r.project_id,r.full_name,r.default_branch FROM repositories r
    JOIN projects p ON p.id=r.project_id JOIN organization_members m ON m.organization_id=p.organization_id
    WHERE r.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer')`,[repositoryId,org,user]);
  const repo=rows[0]; if(!repo)throw new RequestError('Repository access denied.',403);
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo.full_name))throw new RequestError('Invalid repository configuration.',409);
  const token=await githubTokenForProject(repo.project_id,org,user);
  const abort=AbortSignal.any([AbortSignal.timeout(12000),...(signal?[signal]:[])]);
  async function get(path:string,limit=1500000) {
    const response=await fetch(`https://api.github.com/repos/${repo.full_name}/${path}`,{
      headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},signal:abort,redirect:'error',cache:'no-store'});
    if(!response.ok || !response.body){await response.body?.cancel();throw new RequestError('Repository context unavailable.',502);}
    const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
    try { while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
      if(bytes>limit)throw new RequestError('Repository context exceeds retrieval limit.',422);
      text+=decoder.decode(part.value,{stream:true});}return JSON.parse(text+decoder.decode());
    } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  const commit=await get(`commits/${encodeURIComponent(repo.default_branch || 'HEAD')}`);
  if(!/^[a-f0-9]{40}$/.test(commit.sha))throw new RequestError('Repository commit unavailable.',502);
  const tree=await get(`git/trees/${commit.sha}?recursive=1`);
  const terms=question.toLowerCase().match(/[a-z0-9_-]{4,}/g)||[];
  const files=(tree.tree||[]).filter((item:any)=>item.type==='blob' && item.mode!=='120000' && item.size<=60000 &&
    /\.(md|tsx?|jsx?|py|go|rs|cs|json|ya?ml)$/i.test(item.path) &&
    !/(^|\/)(node_modules|vendor|dist|\.git|\.env|secrets?|credentials?)(\.|\/|$)|lock\.(json|yaml)$/i.test(item.path))
    .map((item:any)=>({...item,score:terms.reduce((score:number,term:string)=>score+(item.path.toLowerCase().includes(term)?3:0),/readme/i.test(item.path)?1:0)}))
    .filter((item:any)=>item.score>0).sort((a:any,b:any)=>b.score-a.score).slice(0,4);
  const sources=[];let budget=12000;
  for(const file of files){
    if(!/^[a-f0-9]{40}$/.test(file.sha))continue;
    const blob=await get(`git/blobs/${file.sha}`,100000);
    if(blob.encoding!=='base64')continue;
    const excerpt=ContextBuilder.sanitizeText(Buffer.from(blob.content,'base64').toString('utf8')).slice(0,Math.min(4000,budget));
    budget-=excerpt.length;
    sources.push({id:`github:${repo.full_name}:${commit.sha}:${file.path}`,kind:'repository file at verified commit',
      title:file.path,date:commit.commit?.committer?.date,excerpt});
  }
  return {sources,projectId:repo.project_id,commit:commit.sha,truncated:!!tree.truncated};
}
