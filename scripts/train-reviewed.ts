import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { trainReviewedExamples, type ReviewedExample } from '../ai/src/reviewed-training';

async function main(){
  const project=process.argv[2];if(!project||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(project))throw new Error('Project UUID required');
  const url=new URL(process.env.DATABASE_URL!);for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='120s'");await client.query("SET LOCAL lock_timeout='5s'");
    const locked=await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE NOWAIT',[project]);if(!locked.rows.length)throw new Error('Project unavailable');
    const rows=await client.query(`SELECT * FROM learning_examples WHERE project_id=$1 AND status='approved' ORDER BY id LIMIT 2001 FOR SHARE`,[project]);
    const samples=rows.rows as ReviewedExample[];
    const datasetHash=createHash('sha256').update(JSON.stringify(samples.map(s=>[s.id,s.event_hash,s.label,s.partition]))).digest('hex');
    const existing=await client.query('SELECT id FROM learning_checkpoints WHERE project_id=$1 AND dataset_hash=$2',[project,datasetHash]);
    if(existing.rows.length){await client.query('ROLLBACK');console.log('Dataset already evaluated; no checkpoint changed.');return;}
    const baseline=await client.query(`SELECT c.weights FROM learning_deployments d JOIN learning_checkpoints c ON c.id=d.checkpoint_id
      WHERE d.project_id=$1 AND c.project_id=$1`,[project]);
    const candidate=trainReviewedExamples(samples,baseline.rows[0]?.weights);
    const saved=await client.query(`INSERT INTO learning_checkpoints(project_id,dataset_hash,sample_ids,weights,metrics,eligible)
      VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6) RETURNING id`,[project,datasetHash,samples.map(s=>s.id),JSON.stringify(candidate.weights),JSON.stringify(candidate.metrics),candidate.eligible]);
    await client.query(`INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,'system','learning.train',$2,'Reviewed candidate evaluated; no activation performed','success')`,[project,datasetHash]);
    await client.query('COMMIT');console.log(JSON.stringify({checkpointId:saved.rows[0].id,eligible:candidate.eligible,metrics:candidate.metrics}));
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();await pool.end();}
}
main().catch(()=>{console.error('Reviewed training did not complete. Verify dataset sufficiency, permissions, TLS and worker configuration. No quality score is claimed.');process.exitCode=1;});
