import type {Pool,PoolClient} from 'pg';
import {digest,deviceUuid,DeviceError} from './device-protocol';
import {probePublicEndpoint} from '../../../services/src/monitoring/public-probe';
export class DeploymentRuntimeStore{
 constructor(private readonly pool:Pool,private readonly probe=probePublicEndpoint){}
 private async transaction<T>(fn:(client:PoolClient)=>Promise<T>){
  const client=await this.pool.connect();try{await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");
   const result=await fn(client);await client.query('COMMIT');return result;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
 }
 private async audit(client:PoolClient,project:string,user:string,action:string,id:string){
  await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
   VALUES($1,$2,'user',$3,$4,'Deployment endpoint observation workflow','success')`,[project,user,action,digest(id)]);
 }
 async configure(org:string,user:string,input:{repositoryId:string;environmentId:string;providerEnvironment:string;endpointUrl:string}){
  let url:URL;try{url=new URL(input.endpointUrl);}catch{throw new DeviceError('Public HTTPS health endpoint required.');}
  if(!deviceUuid.test(input.repositoryId)||!deviceUuid.test(input.environmentId)||typeof input.providerEnvironment!=='string'||
   !input.providerEnvironment.trim()||input.providerEnvironment.length>255||/[\x00-\x1f]/.test(input.providerEnvironment)||
   url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port||url.toString().length>2048)
   throw new DeviceError('Select a repository, environment and HTTPS endpoint without query parameters.');
  return this.transaction(async client=>{
   const scope=await client.query(`SELECT p.id FROM repositories r JOIN projects p ON p.id=r.project_id
    JOIN environments e ON e.project_id=p.id JOIN organization_members m ON m.organization_id=p.organization_id
    WHERE r.id=$1 AND e.id=$2 AND p.organization_id=$3 AND m.user_id=$4 AND m.role IN ('owner','admin','developer')
    AND r.github_verified_at IS NOT NULL FOR SHARE OF m,r,e`,[input.repositoryId,input.environmentId,org,user]);
   if(!scope.rows[0])throw new DeviceError('Verified repository/environment access required.',403);
   const result=await client.query(`INSERT INTO deployment_targets(repository_id,environment_id,provider_environment,endpoint_url)
    VALUES($1,$2,$3,$4) ON CONFLICT(repository_id,provider_environment) DO UPDATE SET environment_id=excluded.environment_id,
    endpoint_url=excluded.endpoint_url,updated_at=clock_timestamp() RETURNING id`,[input.repositoryId,input.environmentId,input.providerEnvironment.trim(),url.toString()]);
   await this.audit(client,scope.rows[0].id,user,'deployment.target.configure',result.rows[0].id);return result.rows[0];
  });
 }
 private async authorized(client:PoolClient,org:string,user:string,id:string){
  const result=await client.query(`SELECT d.*,p.id AS project_id FROM deployment_targets d JOIN repositories r ON r.id=d.repository_id
   JOIN projects p ON p.id=r.project_id JOIN environments e ON e.id=d.environment_id AND e.project_id=p.id
   JOIN organization_members m ON m.organization_id=p.organization_id WHERE d.id=$1 AND p.organization_id=$2
   AND m.user_id=$3 AND m.role IN ('owner','admin','developer') FOR UPDATE OF d FOR SHARE OF m,r,e`,[id,org,user]);
  if(!result.rows[0])throw new DeviceError('Deployment target access denied.',403);return result.rows[0];
 }
 async check(org:string,user:string,id:string){
  if(!deviceUuid.test(id))throw new DeviceError('Valid deployment target required.');
  const selected=await this.transaction(async client=>{
   const target=await this.authorized(client,org,user,id);
   const admitted=await client.query("UPDATE deployment_targets SET last_probe_at=clock_timestamp() WHERE id=$1 AND (last_probe_at IS NULL OR last_probe_at<clock_timestamp()-interval '30 seconds') RETURNING id",[id]);
   if(!admitted.rows.length)throw new DeviceError('Wait 30 seconds between endpoint checks.',429);
   const event=await client.query(`SELECT id,state,commit_sha,provider_created_at FROM deployment_events
    WHERE repository_id=$1 AND environment=$2 AND provider_created_at<=clock_timestamp()
    ORDER BY provider_created_at DESC,github_status_id DESC LIMIT 1`,[target.repository_id,target.provider_environment]);
   if(!event.rows[0])throw new DeviceError('No verified deployment event for this environment.',409);
   await this.audit(client,target.project_id,user,'deployment.runtime.request',id);return {target,event:event.rows[0]};
  });
  const measured=await this.probe(selected.target.endpoint_url),observedAt=new Date();
  return this.transaction(async client=>{
   const current=await this.authorized(client,org,user,id);
   if(current.endpoint_url!==selected.target.endpoint_url||current.environment_id!==selected.target.environment_id||
    new Date(current.updated_at).getTime()!==new Date(selected.target.updated_at).getTime())throw new DeviceError('Target changed during probe; retry.',409);
   const saved=await client.query(`INSERT INTO deployment_runtime_observations(target_id,deployment_event_id,endpoint_url,observed_at,reachable,status_code,latency_ms)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[id,selected.event.id,current.endpoint_url,observedAt,measured.isReachable,measured.statusCode??null,measured.latencyMs]);
   await this.audit(client,current.project_id,user,'deployment.runtime.observed',saved.rows[0].id);
   return {id:saved.rows[0].id,event:selected.event,observedAt,probe:measured,commitVerified:false,
    limitation:'Measured endpoint reachability after the selected provider event; this does not prove the commit is running or whole-application health.'};
  });
 }
 async list(org:string,user:string){
  return (await this.pool.query(`SELECT d.id,d.provider_environment,d.endpoint_url,r.full_name,e.name AS environment_name,
   observation.observed_at,observation.reachable,observation.status_code,observation.commit_sha,observation.provider_state
   FROM deployment_targets d JOIN repositories r ON r.id=d.repository_id JOIN projects p ON p.id=r.project_id
   JOIN environments e ON e.id=d.environment_id AND e.project_id=p.id JOIN organization_members m ON m.organization_id=p.organization_id
   LEFT JOIN LATERAL(SELECT o.observed_at,o.reachable,o.status_code,v.commit_sha,v.state AS provider_state
    FROM deployment_runtime_observations o JOIN deployment_events v ON v.id=o.deployment_event_id
    WHERE o.target_id=d.id AND o.endpoint_url=d.endpoint_url AND o.observed_at>=d.updated_at ORDER BY o.observed_at DESC LIMIT 1) observation ON true
   WHERE p.organization_id=$1 AND m.user_id=$2 ORDER BY d.updated_at DESC LIMIT 100`,[org,user])).rows;
 }
}
