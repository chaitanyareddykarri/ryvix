import type {Pool,PoolClient} from 'pg';
import {DeviceError,deviceUuid,digest} from './device-protocol';

export async function githubReleaseRequest(path:string,token:string,method='GET',body?:unknown,request:typeof fetch=fetch){
  const response=await request(`https://api.github.com${path}`,{method,redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok||!response.body){await response.body?.cancel();throw new DeviceError('GitHub release request was rejected or unavailable.',502);}
  const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,text='';
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>2_000_000)throw new DeviceError('GitHub response too large.',502);text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}return JSON.parse(text);
}
export class ReleaseStore{
  constructor(private readonly pool:Pool,private readonly github=githubReleaseRequest){}
  private async tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private async audit(c:PoolClient,project:string,user:string,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,$2,'user',$3,$4,'Approved release lifecycle; merge is not deployment success','success')`,[project,user,action,digest(id)]);}
  private async scope(c:PoolClient,org:string,user:string,task:string,target:string){
    const rows=await c.query(`SELECT t.id,t.project_id,pr.id AS pr_id,pr.pr_number,pr.commit_sha,r.id AS repository_id,r.full_name,r.default_branch,ta.base_branch,d.updated_at::text AS target_version
      FROM tasks t JOIN projects p ON p.id=t.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      JOIN plans pl ON pl.id=t.active_plan_id AND pl.task_id=t.id JOIN pull_requests pr ON pr.task_id=t.id
      JOIN repositories r ON r.id=pr.repository_id AND r.project_id=p.id JOIN task_artifacts ta ON ta.task_id=t.id AND ta.repository_id=r.id
      JOIN deployment_targets d ON d.id=$4 AND d.repository_id=r.id JOIN environments e ON e.id=d.environment_id AND e.project_id=p.id
      WHERE t.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin') AND pl.approved_by IS NOT NULL
      AND t.status='completed' FOR UPDATE OF t,pr FOR SHARE OF m,pl,d,r,e`,[task,org,user,target]);
    if(!rows.rows[0])throw new DeviceError('Approved task, target and release administrator access required.',403);return rows.rows[0];
  }
  private async token(c:PoolClient,project:string){const result=await c.query(`SELECT v.decrypted_secret FROM connectors co JOIN environments e ON e.id=co.environment_id
    JOIN connector_credentials cc ON cc.connector_id=co.id AND cc.credential_type='oauth_token' JOIN vault.decrypted_secrets v ON v.id::text=cc.vault_secret_ref
    WHERE e.project_id=$1 AND co.connector_type='github' AND co.status='active' AND (cc.expires_at IS NULL OR cc.expires_at>now())
    ORDER BY co.updated_at DESC LIMIT 1 FOR SHARE OF co,cc`,[project]);if(!result.rows[0])throw new DeviceError('Project GitHub connection required.',409);return result.rows[0].decrypted_secret as string;}
  async list(org:string,user:string){return (await this.pool.query(`SELECT t.id AS task_id,pr.html_url,pr.commit_sha,r.full_name,d.id AS target_id,d.provider_environment,
    e.name AS environment_name,d.updated_at::text AS target_version,rr.id AS release_id,rr.status,rr.merge_sha FROM tasks t JOIN projects p ON p.id=t.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id JOIN plans pl ON pl.id=t.active_plan_id AND pl.task_id=t.id
    JOIN pull_requests pr ON pr.task_id=t.id JOIN repositories r ON r.id=pr.repository_id AND r.project_id=p.id
    JOIN deployment_targets d ON d.repository_id=r.id JOIN environments e ON e.id=d.environment_id AND e.project_id=p.id
    LEFT JOIN release_requests rr ON rr.task_id=t.id WHERE p.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin')
    AND t.status='completed' AND pl.approved_by IS NOT NULL AND (rr.id IS NULL OR rr.target_id=d.id) ORDER BY t.created_at DESC LIMIT 100`,[org,user])).rows;}
  async approve(org:string,user:string,task:string,target:string,expectedHead:string,expectedTargetVersion:string){
    if(!deviceUuid.test(task)||!deviceUuid.test(target)||! /^[a-f0-9]{40,64}$/.test(expectedHead||''))throw new DeviceError('Task, target and reviewed commit required.');
    const release=await this.tx(async c=>{const s=await this.scope(c,org,user,task,target);
      if(s.target_version!==expectedTargetVersion)throw new DeviceError('Deployment mapping changed; reload before approving.',409);
      if(s.commit_sha!==expectedHead)throw new DeviceError('Reviewed commit changed; reload before approving.',409);
      const old=(await c.query('SELECT * FROM release_requests WHERE task_id=$1 FOR UPDATE',[task])).rows[0];
      if(old){if(old.target_id!==target||old.head_sha!==expectedHead)throw new DeviceError('Release already bound to another approval.',409);return old;}
      const inserted=(await c.query(`INSERT INTO release_requests(task_id,repository_id,target_id,approved_by,head_sha,target_version,status) VALUES($1,$2,$3,$4,$5,$6,'approved') RETURNING *`,[task,s.repository_id,target,user,expectedHead,s.target_version])).rows[0];
      await this.audit(c,s.project_id,user,'release.approve',inserted.id);return inserted;
    });
    if(release.status!=='approved')return {id:release.id,status:release.status};
    // Validate provider state before creating a durable one-attempt merge claim.
    const ready=await this.tx(async c=>{const s=await this.scope(c,org,user,task,target);
      const r=(await c.query('SELECT *,target_version::text AS target_version FROM release_requests WHERE id=$1 FOR UPDATE',[release.id])).rows[0];
      if(r.status!=='approved')return null;if(r.approved_by!==user)throw new DeviceError('Original release approver required.',403);
      if(r.target_version!==s.target_version)throw new DeviceError('Approved deployment mapping changed.',409);
      if(s.commit_sha!==expectedHead||! /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(s.full_name))throw new DeviceError('Release source changed.',409);
      const token=await this.token(c,s.project_id),base=`/repos/${s.full_name}`;
      const pr=await this.github(`${base}/pulls/${s.pr_number}`,token);
      if(pr.head?.sha!==expectedHead||pr.base?.ref!==s.base_branch||pr.base?.ref!==s.default_branch||pr.base?.repo?.full_name?.toLowerCase()!==s.full_name.toLowerCase()||pr.merged||pr.state!=='open'||pr.draft||pr.mergeable!==true||pr.mergeable_state!=='clean')
        throw new DeviceError('PR head, base, reviews or checks are not ready for release.',409);
      const branch=await this.github(`${base}/branches/${encodeURIComponent(s.base_branch)}`,token);
      if(branch.protected!==true)throw new DeviceError('Protect the deployment branch and require its CI checks before releasing.',409);
      const checks=await this.github(`${base}/commits/${expectedHead}/check-runs?per_page=100`,token);
      const statuses=await this.github(`${base}/commits/${expectedHead}/status?per_page=100`,token);
      if(!Array.isArray(checks.check_runs)||!Array.isArray(statuses.statuses)||checks.total_count>100||statuses.total_count>100||
        checks.check_runs.length+statuses.statuses.length===0||checks.check_runs.some((check:any)=>check.status!=='completed'||!['success','skipped','neutral'].includes(check.conclusion))||
        statuses.statuses.some((status:any)=>status.state!=='success'))throw new DeviceError('All reported CI checks must pass before releasing.',409);
      await c.query("UPDATE release_requests SET status='dispatching',dispatched_at=now() WHERE id=$1",[r.id]);await this.audit(c,s.project_id,user,'release.merge.dispatch',r.id);
      return {...s,token,base};
    });if(!ready)return {id:release.id,status:'dispatching'};
    let merged:string|null=null;
    try{const result=await this.github(`${ready.base}/pulls/${ready.pr_number}/merge`,ready.token,'PUT',{sha:expectedHead,merge_method:'merge'});
      if(result.merged===true&&/^[a-f0-9]{40,64}$/.test(result.sha||''))merged=result.sha;
    }catch{}
    await this.tx(async c=>{await c.query('UPDATE release_requests SET status=$2,merge_sha=$3,merged_at=CASE WHEN $3::text IS NOT NULL THEN now() ELSE NULL END WHERE id=$1',[release.id,merged?'merged':'unknown',merged]);
      if(merged)await c.query("UPDATE pull_requests SET status='merged',updated_at=now() WHERE id=$1",[ready.pr_id]);await this.audit(c,ready.project_id,user,merged?'release.merged':'release.unknown',release.id);});
    return {id:release.id,status:merged?'merged':'unknown',mergeSha:merged,deploymentConfirmed:false};
  }
  async reconcile(org:string,user:string,task:string,target:string){return this.tx(async c=>{
    const s=await this.scope(c,org,user,task,target),r=(await c.query('SELECT * FROM release_requests WHERE task_id=$1 AND target_id=$2 FOR UPDATE',[task,target])).rows[0];
    if(!r||!['unknown','dispatching'].includes(r.status))throw new DeviceError('No uncertain release to reconcile.',409);
    const token=await this.token(c,s.project_id),pr=await this.github(`/repos/${s.full_name}/pulls/${s.pr_number}`,token);
    if(pr.head?.sha!==r.head_sha||pr.base?.ref!==s.base_branch||pr.base?.repo?.full_name?.toLowerCase()!==s.full_name.toLowerCase()||!pr.merged||! /^[a-f0-9]{40,64}$/.test(pr.merge_commit_sha||''))return {status:r.status};
    await c.query("UPDATE release_requests SET status='merged',merge_sha=$2,merged_at=now() WHERE id=$1",[r.id,pr.merge_commit_sha]);
    await c.query("UPDATE pull_requests SET status='merged',updated_at=now() WHERE id=$1",[s.pr_id]);await this.audit(c,s.project_id,user,'release.reconciled',r.id);return {status:'merged',deploymentConfirmed:false};
  });}
}
