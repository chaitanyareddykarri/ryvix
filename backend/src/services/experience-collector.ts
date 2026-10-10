import type {Pool} from 'pg';
import {NeuralThreatClassifier} from '../../../ai/src/neural-classifier';

// Constant, curated SQL only: never copy arbitrary JSON, prompts, logs or credentials.
const sources:Record<string,string>={
  coding:`SELECT t.id::text||':'||t.status AS key,t.updated_at AS observed,
    jsonb_build_object('taskId',t.id,'status',t.status,'repositoryId',a.repository_id,'baseSha',a.base_commit_sha,
      'checkCount',jsonb_array_length(coalesce(a.verification,'[]'::jsonb)),
      'passedChecks',(SELECT count(*) FROM jsonb_array_elements(coalesce(a.verification,'[]'::jsonb)) v WHERE v->>'success'='true'),
      'changedFiles',jsonb_array_length(coalesce(a.files,'[]'::jsonb))) AS evidence
    FROM tasks t LEFT JOIN task_artifacts a ON a.task_id=t.id
    WHERE t.project_id=$1 AND t.status IN ('completed','failed','cancelled')`,
  deployment:`SELECT d.id::text AS key,d.received_at AS observed,
    jsonb_build_object('deploymentId',d.id,'repositoryId',d.repository_id,'commit',d.commit_sha,'status',d.state,
      'limitation','Signed provider result; not proof of application health') AS evidence
    FROM deployment_events d JOIN repositories r ON r.id=d.repository_id WHERE r.project_id=$1`,
  security:`SELECT se.id::text||':'||se.status AS key,se.detected_at AS observed,
    jsonb_build_object('eventId',se.id,'serverId',se.server_id,'type',CASE WHEN se.event_type IN ('auth_bruteforce','http_attack','malware','suspicious_activity') THEN se.event_type ELSE 'other' END,'severity',se.severity,'status',se.status,
      'limitation','Detector observation, not independently verified classification') AS evidence
    FROM security_events se JOIN servers s ON s.id=se.server_id JOIN environments e ON e.id=s.environment_id WHERE e.project_id=$1`,
  service:`SELECT id::text||':'||status AS key,coalesce(completed_at,created_at) AS observed,
    jsonb_build_object('commandId',id,'serverId',server_id,'status',status,'limitation','Service state is not application health') AS evidence
    FROM server_commands WHERE project_id=$1 AND status IN ('succeeded','failed','unknown','expired')`,
  recovery:`SELECT id::text||':'||status AS key,coalesce(observed_at,dispatched_at,created_at) AS observed,
    jsonb_build_object('recoveryId',id,'serverId',server_id,'status',status,'limitation','Observed liveness does not prove a reboot') AS evidence
    FROM cloud_recovery_requests WHERE project_id=$1 AND status IN ('observed_healthy','unknown','expired')`,
  metrics:`SELECT s.id::text||':'||date_trunc('hour',t.bucket_timestamp)::text AS key,
    date_trunc('hour',t.bucket_timestamp)+interval '1 hour' AS observed,
    jsonb_build_object('serverId',s.id,'cpuAvg',avg(t.cpu_avg),'cpuMax',max(t.cpu_max),'ramMax',max(t.ram_percent),
      'diskMax',max(t.disk_used_percent),'buckets',count(*),'limitation','Hourly summary; not an anomaly label') AS evidence
    FROM telemetry_metric_rollups t JOIN servers s ON s.id=t.server_id JOIN environments e ON e.id=s.environment_id
    WHERE e.project_id=$1 AND t.authenticated AND t.bucket_timestamp>=greatest($2::timestamptz,now()-$3*interval '1 day')
      AND t.bucket_timestamp<date_trunc('hour',now()) GROUP BY s.id,date_trunc('hour',t.bucket_timestamp)`
};
export class ExperienceCollector {
  constructor(private readonly pool:Pool){}
  async shadowProject(project:string){
    const c=await this.pool.connect();try{
      await c.query('BEGIN');await c.query("SET LOCAL TIME ZONE 'UTC'");await c.query("SET LOCAL statement_timeout='30s'");await c.query("SET LOCAL lock_timeout='5s'");
      const checkpoint=(await c.query(`SELECT c.id,c.weights,c.sample_ids FROM learning_deployments d
        JOIN learning_checkpoints c ON c.id=d.checkpoint_id AND c.project_id=d.project_id
        JOIN experience_settings s ON s.project_id=d.project_id AND s.enabled
        WHERE d.project_id=$1 AND c.eligible FOR SHARE OF d,c,s`,[project])).rows[0];
      if(!checkpoint){await c.query('COMMIT');return 0;}
      const approved=await c.query("SELECT id FROM learning_examples WHERE project_id=$1 AND id=ANY($2::uuid[]) AND status='approved' FOR SHARE",[project,checkpoint.sample_ids]);
      if(approved.rows.length!==checkpoint.sample_ids.length)throw new Error('Active checkpoint review no longer valid');
      const events=(await c.query(`SELECT e.id,e.evidence FROM experience_events e WHERE e.project_id=$1 AND e.kind='metrics' AND e.expires_at>now()
        AND NOT EXISTS(SELECT 1 FROM experience_predictions p WHERE p.event_id=e.id AND p.checkpoint_id=$2)
        ORDER BY e.observed_at LIMIT 100 FOR SHARE OF e`,[project,checkpoint.id])).rows;
      const model=new NeuralThreatClassifier();model.loadWeights(checkpoint.weights);
      for(const event of events){
        const values=[event.evidence.cpuAvg,event.evidence.ramMax,event.evidence.diskMax].map(Number);
        if(values.some(v=>!Number.isFinite(v)||v<0||v>100))throw new Error('Invalid metric features');
        const prediction=model.predict(model.vectorize({metrics:{cpuPercent:values[0],memPercent:values[1],diskPercent:values[2]}}));
        await c.query(`INSERT INTO experience_predictions(event_id,checkpoint_id,predicted_class) VALUES($1,$2,$3)
          ON CONFLICT DO NOTHING`,[event.id,checkpoint.id,prediction.predictedClass]);
      }
      await c.query('COMMIT');return events.length;
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
  }
  async collectProject(project:string){
    const c=await this.pool.connect();let inserted=0;
    try{await c.query('BEGIN');await c.query("SET LOCAL TIME ZONE 'UTC'");await c.query("SET LOCAL statement_timeout='30s'");await c.query("SET LOCAL lock_timeout='5s'");
      if(!(await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS owned',[`experience:${project}`])).rows[0].owned){await c.query('ROLLBACK');return 0;}
      const s=(await c.query('SELECT * FROM experience_settings WHERE project_id=$1 FOR SHARE',[project])).rows[0];
      await c.query('DELETE FROM experience_events WHERE project_id=$1 AND expires_at<=now()',[project]);
      if(s?.enabled)for(const [kind,source] of Object.entries(sources)){
        const result=await c.query(`WITH source AS (${source})
          INSERT INTO experience_events(project_id,kind,source_key,evidence,observed_at,expires_at)
          SELECT $1,$4,key,evidence,observed,observed+$3*interval '1 day' FROM source
          WHERE observed>=greatest($2::timestamptz,now()-$3*interval '1 day') AND observed<=now()
          AND NOT EXISTS(SELECT 1 FROM experience_events old WHERE old.project_id=$1 AND old.kind=$4 AND old.source_key=source.key)
          ORDER BY observed,key LIMIT 200 ON CONFLICT(project_id,kind,source_key) DO NOTHING RETURNING id`,[project,s.enabled_at,s.retention_days,kind]);
        inserted+=result.rowCount||0;
      }
      if(inserted)await c.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
        VALUES($1::uuid,'system','experience.collect',md5($1::text),$2,'success')`,[project,`${inserted} bounded outcome records collected; no model trained`]);
      await c.query('COMMIT');return inserted;
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
  }
  async run(signal?:AbortSignal){
    let cursor='00000000-0000-0000-0000-000000000000',total=0,failures=0;
    while(!signal?.aborted){
      const projects=(await this.pool.query('SELECT project_id FROM experience_settings WHERE project_id>$1 ORDER BY project_id LIMIT 50',[cursor])).rows;
      if(!projects.length)break;
      for(const p of projects){if(signal?.aborted)break;
        try{total+=await this.collectProject(p.project_id);await this.shadowProject(p.project_id);}catch{failures++;}
        finally{cursor=p.project_id;}}
    }
    await this.pool.query('DELETE FROM personal_memories WHERE expires_at<=now()');
    if(failures)throw new Error('Some project collection or prediction steps failed');
    return total;
  }
}
