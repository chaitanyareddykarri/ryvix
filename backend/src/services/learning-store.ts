import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { NEURAL_THREAT_CLASSES, NeuralThreatClassifier } from '../../../ai/src/neural-network';
import { ContextBuilder } from '../../../ai/src/context/context-builder';
import { sanitizeLearningEvent } from '../../../ai/src/learning-event';

export class LearningError extends Error {constructor(message:string,readonly status:number){super(message);}}
export class LearningStore {
  constructor(private readonly pool:Pool){}
  private async transaction<T>(org:string,user:string,project:string,review:boolean,fn:(client:PoolClient)=>Promise<T>) {
    const client=await this.pool.connect();
    try {
      await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");
      const scope=await client.query(`SELECT m.role FROM projects p JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE p.id=$1 AND p.organization_id=$2 AND m.user_id=$3 FOR UPDATE OF m`,[project,org,user]);
      if(!(review?['owner','admin']:['owner','admin','developer']).includes(scope.rows[0]?.role))throw new LearningError('Learning access denied.',403);
      const result=await fn(client);await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
  private async audit(client:PoolClient,project:string,user:string,id:string,action:string) {
    await client.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
      VALUES($1,$2,'user',$3,$4,'Reviewed learning data change','success')`,[project,user,action,createHash('sha256').update(id).digest('hex')]);
  }
  async submit(org:string,user:string,project:string,input:any) {
    if(!NEURAL_THREAT_CLASSES.includes(input.label) || !['train','validation','test'].includes(input.partition) ||
      typeof input.provenance!=='string' || input.provenance.trim().length<20 || input.provenance.length>2000 ||
      !input.event || typeof input.event!=='object' || Array.isArray(input.event))throw new LearningError('Valid label, partition, event and provenance are required.',400);
    const text=JSON.stringify(input.event);if(Buffer.byteLength(text)>32768)throw new LearningError('Example exceeds size limit.',413);
    let event:Record<string,unknown>;
    try{event=sanitizeLearningEvent(input.event);}catch{throw new LearningError('Invalid or excessively nested event.',400);}
    // Hash actual model features, not object key ordering or irrelevant metadata.
    const vector=new NeuralThreatClassifier().vectorize(event);
    if(!Array.from(vector).every(Number.isFinite))throw new LearningError('Invalid event features.',400);
    const hash=createHash('sha256').update(JSON.stringify(Array.from(vector))).digest('hex');
    return this.transaction(org,user,project,false,async client=>{
      const result=await client.query(`INSERT INTO learning_examples(project_id,submitted_by,partition,label,event,event_hash,provenance)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,$7) ON CONFLICT(project_id,event_hash) DO NOTHING RETURNING id,status`,
        [project,user,input.partition,input.label,JSON.stringify(event),hash,ContextBuilder.sanitizeText(input.provenance)]);
      if(!result.rows.length)throw new LearningError('These model features already exist in this project; partition leakage is prohibited.',409);
      await this.audit(client,project,user,result.rows[0].id,'learning.submit');return result.rows[0];
    });
  }
  async review(org:string,user:string,project:string,id:string,approve:boolean,note:string) {
    if(typeof note!=='string'||note.trim().length<20||note.length>2000)throw new LearningError('Explain the label and provenance review in 20–2000 characters.',400);
    return this.transaction(org,user,project,true,async client=>{
      const result=await client.query(`UPDATE learning_examples SET status=$4,reviewed_by=$2,reviewed_at=now(),review_note=$5
        WHERE id=$1 AND project_id=$3 AND status='pending' AND submitted_by<>$2 RETURNING id,status`,
        [id,user,project,approve?'approved':'rejected',ContextBuilder.sanitizeText(note)]);
      if(!result.rows.length)throw new LearningError('Pending example unavailable or independent reviewer required.',409);
      await this.audit(client,project,user,id,approve?'learning.approve':'learning.reject');return result.rows[0];
    });
  }
  async list(org:string,user:string,project:string) {
    return this.transaction(org,user,project,false,async client=>(await client.query(`SELECT id,label,partition,status,provenance,event,submitted_by,reviewed_by,review_note,created_at
      FROM learning_examples WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100`,[project])).rows);
  }
  async checkpoints(org:string,user:string,project:string) {
    return this.transaction(org,user,project,false,async client=>(await client.query(`SELECT c.id,c.dataset_hash,c.metrics,c.eligible,c.created_at,
      (d.checkpoint_id=c.id) AS active FROM learning_checkpoints c LEFT JOIN learning_deployments d ON d.project_id=c.project_id
      WHERE c.project_id=$1 ORDER BY c.created_at DESC LIMIT 30`,[project])).rows);
  }
  async promote(org:string,user:string,project:string,id:string,rollback=false) {
    return this.transaction(org,user,project,true,async client=>{
      await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE',[project]);
      const current=await client.query('SELECT * FROM learning_deployments WHERE project_id=$1 FOR UPDATE',[project]);
      const target=rollback?current.rows[0]?.previous_checkpoint_id:id;
      if(!target)throw new LearningError('No rollback checkpoint available.',409);
      const checkpoint=await client.query('SELECT id,weights,sample_ids FROM learning_checkpoints WHERE project_id=$1 AND id=$2 AND eligible=true',[project,target]);
      if(!checkpoint.rows.length)throw new LearningError('Eligible checkpoint unavailable.',409);
      new NeuralThreatClassifier().loadWeights(checkpoint.rows[0].weights);
      const samples=await client.query("SELECT id FROM learning_examples WHERE project_id=$1 AND id=ANY($2::uuid[]) AND status='approved' FOR SHARE",[project,checkpoint.rows[0].sample_ids]);
      if(samples.rows.length!==checkpoint.rows[0].sample_ids.length)throw new LearningError('Checkpoint review is no longer valid.',409);
      if(current.rows[0]?.checkpoint_id===target)throw new LearningError('Checkpoint already active.',409);
      await client.query(`INSERT INTO learning_deployments(project_id,checkpoint_id,previous_checkpoint_id,promoted_by)
        VALUES($1,$2,$3,$4) ON CONFLICT(project_id) DO UPDATE SET previous_checkpoint_id=learning_deployments.checkpoint_id,
        checkpoint_id=excluded.checkpoint_id,promoted_by=excluded.promoted_by,promoted_at=now()`,[project,target,current.rows[0]?.checkpoint_id||null,user]);
      await this.audit(client,project,user,target,rollback?'learning.rollback':'learning.promote');
      return {checkpointId:target};
    });
  }
  async predict(org:string,user:string,project:string,event:Record<string,unknown>) {
    return this.transaction(org,user,project,false,async client=>{
      const checkpoint=await client.query(`SELECT c.id,c.weights FROM learning_deployments d JOIN learning_checkpoints c ON c.id=d.checkpoint_id
        WHERE d.project_id=$1 AND c.project_id=$1`,[project]);
      if(!checkpoint.rows.length)throw new LearningError('No reviewed classifier is active for this project.',409);
      const model=new NeuralThreatClassifier();model.loadWeights(checkpoint.rows[0].weights);
      const vector=model.vectorize(event);if(!Array.from(vector).every(Number.isFinite))throw new LearningError('Invalid features.',400);
      const prediction=model.predict(vector);
      return {checkpointId:checkpoint.rows[0].id,prediction,limitation:'Classifier probabilities are not calibrated accuracy. No operational action was executed.'};
    });
  }
}
