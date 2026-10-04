import {embeddingModel,embedRepositoryTexts,cosineScore} from '../../../ai/src/repository-embeddings';
import {repositoryDependencies} from '../../../ai/src/repository-dependencies';
import type {Pool,PoolClient} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {ContextBuilder} from '../../../ai/src/context/context-builder';
import {sanitizeLearningEvent} from '../../../ai/src/learning-event';
import {ExperienceError} from './experience-store';

const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function indexablePath(path:unknown){
  return typeof path==='string'&&path.length<=512&&!path.startsWith('/')&&!path.includes('..')&&!path.includes('\\')&&
    !/(^|\/)(\.[^/]+|node_modules|vendor|dist|build|coverage|secrets?|credentials?|certs?)(\/|\.|$)/i.test(path)&&
    (/\.(md|tsx?|jsx?|py|go|rs|cs|java|php|rb|c|cc|cpp|h|hpp|css|html|json)$/i.test(path)||path==='go.mod')&&!/(^|\/)(package-lock|composer\.lock|yarn\.lock|pnpm-lock)/i.test(path);
}
export function sanitizeKnowledge(path:string,text:string){
  if(!indexablePath(path)||Buffer.byteLength(text)>32768||text.includes('\0'))throw new Error('File excluded from index');
  if(/\.json$/i.test(path)){
    let value;try{value=JSON.parse(text);}catch{throw new Error('Invalid JSON source');}
    text=JSON.stringify(sanitizeLearningEvent(value),null,2);
  }
  return ContextBuilder.sanitizeText(text).replace(/(?:sk-|ghp_)[a-zA-Z0-9_-]{20,}/g,'[REDACTED_SECRET]');
}
type Snapshot={commit:string;files:Array<{path:string;content:string}>;partial:boolean};
type Job={repository_id:string;project_id:string;full_name:string;default_branch:string;claim_id:string;configured_by:string;commit_sha:string|null;file_count:number};
export type KnowledgeReader=(job:Job,token:string,signal?:AbortSignal)=>Promise<Snapshot>;

export const readKnowledgeSnapshot:KnowledgeReader=async(job,token,signal)=>{
  if(!/^[\w.-]+\/[\w.-]+$/.test(job.full_name))throw new Error('Invalid repository');
  const deadline=AbortSignal.any([AbortSignal.timeout(120000),...(signal?[signal]:[])]);
  async function get(suffix:string,limit=2000000){
    const r=await fetch(`https://api.github.com/repos/${job.full_name}${suffix}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},signal:deadline,redirect:'error',cache:'no-store'});
    if(!r.ok||!r.body){await r.body?.cancel();throw new Error('Repository unavailable');}
    const reader=r.body.getReader();let size=0;const buffers:Uint8Array[]=[];
    try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>limit)throw new Error('Source response too large');buffers.push(chunk.value);}return JSON.parse(Buffer.concat(buffers).toString('utf8'));}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  const metadata=await get('',150000);
  if(metadata.full_name?.toLowerCase()!==job.full_name.toLowerCase()||metadata.archived)throw new Error('Repository mismatch');
  const commit=await get(`/commits/${encodeURIComponent(job.default_branch||metadata.default_branch)}`,300000);
  if(!/^[a-f0-9]{40,64}$/.test(commit.sha))throw new Error('Invalid commit');
  // Even an unchanged commit is rebuilt when there is no stored index. The caller
  // may reuse existing content only after a complete previous snapshot publication.
  if(commit.sha===job.commit_sha&&job.file_count>0)return {commit:commit.sha,files:[],partial:false};
  const tree=await get(`/git/trees/${commit.sha}?recursive=1`);
  if(!Array.isArray(tree.tree))throw new Error('Repository tree unavailable');
  const candidates=tree.tree.filter((f:any)=>f.type==='blob'&&['100644','100755'].includes(f.mode)&&indexablePath(f.path)&&
    Number.isInteger(f.size)&&f.size<=32768&&/^[a-f0-9]{40,64}$/.test(f.sha))
    .sort((a:any,b:any)=>Number(/readme|architecture|package\.json/i.test(b.path))-Number(/readme|architecture|package\.json/i.test(a.path))||a.path.localeCompare(b.path));
  const files:Snapshot['files']=[];let bytes=0,partial=!!tree.truncated||candidates.length>100;
  for(const file of candidates.slice(0,100)){
    const blob=await get(`/git/blobs/${file.sha}`,65000);
    if(blob.encoding!=='base64'||blob.sha!==file.sha||typeof blob.content!=='string')throw new Error('Blob identity mismatch');
    let content:string;try{content=sanitizeKnowledge(file.path,Buffer.from(blob.content,'base64').toString('utf8'));}catch{partial=true;continue;}
    const length=Buffer.byteLength(content);if(length>32768){partial=true;continue;}
    if(bytes+length>1048576){partial=true;break;}bytes+=length;files.push({path:file.path,content});
  }
  return {commit:commit.sha,files,partial};
};

export class RepositoryKnowledge {
  constructor(private readonly pool:Pool,private readonly reader:KnowledgeReader=readKnowledgeSnapshot){}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{
    await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='20s'");
    const result=await fn(c);await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  async list(org:string,user:string){return (await this.pool.query(`SELECT r.id,r.full_name,s.enabled,s.status,s.commit_sha,s.file_count,s.partial,s.indexed_at
    FROM repositories r JOIN projects p ON p.id=r.project_id JOIN organization_members m ON m.organization_id=p.organization_id
    LEFT JOIN repository_knowledge_settings s ON s.repository_id=r.id WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','developer')
    ORDER BY r.full_name LIMIT 100`,[org,user])).rows;}
  async configure(org:string,user:string,repo:string,enabled:boolean){
    if(!uuid.test(repo)||typeof enabled!=='boolean')throw new ExperienceError('Valid repository and enable state required.');
    return this.transaction(async c=>{
      const r=(await c.query(`SELECT r.project_id FROM repositories r JOIN projects p ON p.id=r.project_id
        JOIN organization_members m ON m.organization_id=p.organization_id WHERE r.id=$1 AND p.organization_id=$2 AND m.user_id=$3
        AND m.role IN ('owner','admin') FOR UPDATE OF m FOR SHARE OF r,p`,[repo,org,user])).rows[0];
      if(!r)throw new ExperienceError('Repository indexing access denied.',403);
      const budget=await c.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests)
        VALUES($1,$2,date_trunc('hour',now()),1) ON CONFLICT(organization_id,subject,bucket)
        DO UPDATE SET requests=chat_request_budgets.requests+1 WHERE chat_request_budgets.requests<30 RETURNING requests`,[org,`knowledge:${user}`]);
      if(!budget.rows.length)throw new ExperienceError('Repository indexing change limit reached; retry next hour.',429);
      await c.query(`INSERT INTO repository_knowledge_settings(repository_id,enabled,configured_by,status) VALUES($1,$2,$3,$4)
        ON CONFLICT(repository_id) DO UPDATE SET enabled=excluded.enabled,configured_by=excluded.configured_by,status=excluded.status,
        claim_id=NULL,claim_expires_at=NULL,last_attempt_at=NULL`,[repo,enabled,user,enabled?'queued':'disabled']);
      if(!enabled){await c.query('DELETE FROM repository_knowledge_files WHERE repository_id=$1',[repo]);
        await c.query('UPDATE repository_knowledge_settings SET commit_sha=NULL,indexed_at=NULL,file_count=0,partial=true WHERE repository_id=$1',[repo]);}
      await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1,$2,'user','knowledge.configure',$3,$4,'success')`,[r.project_id,user,createHash('sha256').update(repo).digest('hex'),enabled?'Repository index queued':'Repository index disabled and removed']);
      return {enabled};
    });
  }
  private async lexicalSearch(org:string,user:string,repo:string|null,question:string,expectedCommit?:string){
    if(repo!==null&&!uuid.test(repo))throw new ExperienceError('Valid repository required.');
    const stop=new Set(['the','and','this','that','what','with','from','about','please','same','have','does','could','would','should']);
    const terms=[...new Set(question.toLowerCase().match(/[a-z0-9]{3,}/g)||[])].filter(t=>!stop.has(t)).slice(-20);
    if(!terms.length)return [];
    return (await this.pool.query(`SELECT f.path,s.repository_id,s.commit_sha,s.indexed_at,s.partial,r.full_name,
      ts_headline('english',f.content,websearch_to_tsquery('english',$4),'MaxWords=180,MinWords=40,StartSel=,StopSel=') AS excerpt
      FROM repository_knowledge_files f JOIN repository_knowledge_settings s ON s.repository_id=f.repository_id
      JOIN repositories r ON r.id=s.repository_id JOIN projects p ON p.id=r.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2 AND m.role IN ('owner','admin','developer')
      JOIN organization_members a ON a.organization_id=p.organization_id AND a.user_id=s.configured_by AND a.role IN ('owner','admin')
      WHERE p.organization_id=$1 AND ($3::uuid IS NULL OR r.id=$3) AND s.enabled AND s.status='ready'
      AND s.indexed_at>now()-interval '24 hours' AND ($5::text IS NULL OR s.commit_sha=$5)
      AND f.search_document@@websearch_to_tsquery('english',$4)
      ORDER BY ts_rank(f.search_document,websearch_to_tsquery('english',$4)) DESC,s.indexed_at DESC,f.path LIMIT 6`,[org,user,repo,terms.join(' OR '),expectedCommit||null])).rows;
  }
  private async snapshotRows(org:string,user:string,repo:string|null,expectedCommit?:string){
    return (await this.pool.query(`SELECT f.path,f.content,f.embedding,f.embedding_model,s.repository_id,s.commit_sha,s.indexed_at,s.partial,r.full_name
      FROM repository_knowledge_files f JOIN repository_knowledge_settings s ON s.repository_id=f.repository_id
      JOIN repositories r ON r.id=s.repository_id JOIN projects p ON p.id=r.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2 AND m.role IN ('owner','admin','developer')
      JOIN organization_members a ON a.organization_id=p.organization_id AND a.user_id=s.configured_by AND a.role IN ('owner','admin')
      WHERE p.organization_id=$1 AND ($3::uuid IS NULL OR r.id=$3) AND s.enabled AND s.status='ready'
      AND s.indexed_at>now()-interval '24 hours' AND ($4::text IS NULL OR s.commit_sha=$4)
      ORDER BY s.indexed_at DESC,s.repository_id,f.path LIMIT 100`,[org,user,repo,expectedCommit||null])).rows;
  }
  async search(org:string,user:string,repo:string|null,question:string,expectedCommit?:string){
    const lexical=await this.lexicalSearch(org,user,repo,question,expectedCommit);
    const model=embeddingModel();if(!model)return lexical;
    try{
      const rows=await this.snapshotRows(org,user,repo,expectedCommit);
      const candidates=rows.filter(r=>r.embedding_model===model&&Array.isArray(r.embedding));
      if(!candidates.length)return lexical;
      const [query]=await embedRepositoryTexts([question.slice(0,6000)],true);
      const ranked=candidates.map(row=>({row,score:cosineScore(query,row.embedding)})).filter(r=>Number.isFinite(r.score)&&r.score>0)
        .sort((a,b)=>b.score-a.score).slice(0,4).map(r=>({...r.row,retrieval_kind:'semantic snapshot match'}));
      const selected=[...ranked];
      if(!selected.length)return this.lexicalSearch(org,user,repo,question,expectedCommit);
      for(const root of ranked){
        const group=rows.filter(r=>r.repository_id===root.repository_id);
        for(const edge of repositoryDependencies(group)){
          const other=edge.source===root.path?edge.target:edge.target===root.path?edge.source:null;
          const neighbor=group.find(r=>r.path===other);
          if(neighbor&&!selected.some(r=>r.repository_id===neighbor.repository_id&&r.path===neighbor.path)&&selected.length<6)
            selected.push({...neighbor,retrieval_kind:'static dependency neighbor (not runtime verified)'});
        }
      }
      // Recheck scope and immutable snapshot identity after the external embedding call.
      const current=await this.snapshotRows(org,user,repo,expectedCommit);
      return selected.filter(r=>current.some(c=>c.repository_id===r.repository_id&&c.path===r.path&&c.commit_sha===r.commit_sha))
        .map(({content,embedding,embedding_model,...row})=>({...row,excerpt:content.slice(0,2400)}));
    }catch{return this.lexicalSearch(org,user,repo,question,expectedCommit);}
  }
  async indexOne(signal?:AbortSignal,onlyRepository?:string){
    if(onlyRepository&&!uuid.test(onlyRepository))throw new ExperienceError('Valid repository required.');
    const job=await this.transaction(async c=>{
      const job=(await c.query(`SELECT s.*,r.project_id,r.full_name,r.default_branch FROM repository_knowledge_settings s
        JOIN repositories r ON r.id=s.repository_id JOIN projects p ON p.id=r.project_id
        JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=s.configured_by AND m.role IN ('owner','admin')
        WHERE s.enabled AND ($1::uuid IS NULL OR s.repository_id=$1) AND (s.claim_expires_at IS NULL OR s.claim_expires_at<now())
        AND (s.last_attempt_at IS NULL OR s.last_attempt_at<now()-interval '10 minutes')
        ORDER BY s.last_attempt_at NULLS FIRST,s.repository_id LIMIT 1 FOR UPDATE OF s SKIP LOCKED`,[onlyRepository||null])).rows[0];
      if(!job)return null;
      job.claim_id=randomUUID();await c.query(`UPDATE repository_knowledge_settings SET status='indexing',claim_id=$2,
        claim_expires_at=now()+interval '3 minutes',last_attempt_at=now() WHERE repository_id=$1`,[job.repository_id,job.claim_id]);return job as Job;
    });
    if(!job)return false;
    try{
      const credential=(await this.pool.query(`SELECT secret.decrypted_secret FROM connectors c JOIN environments e ON e.id=c.environment_id
        JOIN connector_credentials cc ON cc.connector_id=c.id AND cc.credential_type='oauth_token'
        JOIN vault.decrypted_secrets secret ON secret.id::text=cc.vault_secret_ref
        JOIN projects p ON p.id=e.project_id JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE e.project_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin') AND c.connector_type='github' AND c.status='active'
        ORDER BY c.id LIMIT 1`,[job.project_id,job.configured_by])).rows[0]?.decrypted_secret;
      if(!credential)throw new Error('Repository credential unavailable');
      const model=embeddingModel();
      const missing=model?(await this.pool.query('SELECT count(*)::int AS n FROM repository_knowledge_files WHERE repository_id=$1 AND (embedding IS NULL OR embedding_model IS DISTINCT FROM $2)',[job.repository_id,model])).rows[0].n:0;
      const snapshot=await this.reader(missing?{...job,commit_sha:null}:job,credential,signal);
      let vectors:number[][]|null=null;
      if(model&&snapshot.files.length)try{vectors=await embedRepositoryTexts(snapshot.files.map(f=>f.path+'\n'+sanitizeKnowledge(f.path,f.content)),false,signal);}catch{if(signal?.aborted)throw new Error('Index cancelled');}
      const byPath=new Map(snapshot.files.map((file,i)=>[file.path,vectors?.[i]]));
      if(!/^[a-f0-9]{40,64}$/.test(snapshot.commit)||snapshot.files.length>100)throw new Error('Invalid knowledge snapshot');
      await this.transaction(async c=>{
        const valid=await c.query(`SELECT s.repository_id FROM repository_knowledge_settings s JOIN repositories r ON r.id=s.repository_id
          JOIN projects p ON p.id=r.project_id JOIN organization_members m ON m.organization_id=p.organization_id
          WHERE s.repository_id=$1 AND s.claim_id=$2 AND s.claim_expires_at>now() AND s.enabled AND s.configured_by=$3
          AND r.full_name=$4 AND r.default_branch IS NOT DISTINCT FROM $5 AND r.project_id=$6
          AND m.user_id=s.configured_by AND m.role IN ('owner','admin')
          FOR UPDATE OF s FOR SHARE OF m,r`,[job.repository_id,job.claim_id,job.configured_by,job.full_name,job.default_branch,job.project_id]);
        if(!valid.rows.length)throw new Error('Index authorization or claim changed');
        const reuse=snapshot.commit===job.commit_sha&&snapshot.files.length===0&&job.file_count>0;
        let bytes=0;
        if(!reuse){await c.query('DELETE FROM repository_knowledge_files WHERE repository_id=$1',[job.repository_id]);
          for(const file of snapshot.files){const content=sanitizeKnowledge(file.path,file.content);bytes+=Buffer.byteLength(content);
            if(bytes>1048576)throw new Error('Index size limit');await c.query('INSERT INTO repository_knowledge_files(repository_id,path,content,embedding_model,embedding) VALUES($1,$2,$3,$4,$5::jsonb)',[job.repository_id,file.path,content,byPath.get(file.path)?model:null,byPath.get(file.path)?JSON.stringify(byPath.get(file.path)):null]);}}
        await c.query(`UPDATE repository_knowledge_settings SET status='ready',indexed_at=now(),commit_sha=$2,
          file_count=CASE WHEN $3 THEN file_count ELSE $4 END,partial=CASE WHEN $3 THEN partial ELSE $5 END,claim_id=NULL,claim_expires_at=NULL WHERE repository_id=$1`,
          [job.repository_id,snapshot.commit,reuse,snapshot.files.length,snapshot.partial]);
        await c.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
          VALUES($1,'system','knowledge.index',$2,'Bounded repository snapshot refreshed; no code executed','success')`,[job.project_id,createHash('sha256').update(snapshot.commit).digest('hex')]);
      });
      return true;
    }catch{
      await this.pool.query(`UPDATE repository_knowledge_settings SET status='unavailable',claim_id=NULL,claim_expires_at=NULL
        WHERE repository_id=$1 AND claim_id=$2`,[job.repository_id,job.claim_id]);throw new Error('Repository indexing failed; check authorization, source limits and provider access.');
    }
  }
}
