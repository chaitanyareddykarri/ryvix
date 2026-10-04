import type {Pool,PoolClient} from 'pg';
import {createHash} from 'node:crypto';
import {ContextBuilder} from '../../../ai/src/context/context-builder';
import {ExperienceError} from './experience-store';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export function trainingText(value:unknown,min:number,max:number){
  if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new ExperienceError('Training text length is invalid.');
  const clean=ContextBuilder.sanitizeText(value.trim());
  if(clean!==value.trim()||/-----BEGIN .*PRIVATE KEY-----|(?:sk-|ghp_)[a-zA-Z0-9_-]{20,}/.test(clean))throw new ExperienceError('Remove sensitive content before submission.');
  return clean;
}
export class ExternalTraining{
  constructor(private readonly pool:Pool){}
  private async transaction<T>(org:string,user:string,project:string,fn:(c:PoolClient)=>Promise<T>){
    if(!uuid.test(project))throw new ExperienceError('Project UUID required.');
    const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='20s'");
      const scope=await c.query(`SELECT p.id FROM projects p JOIN organization_members m ON m.organization_id=p.organization_id
        WHERE p.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin') FOR UPDATE OF p FOR SHARE OF m`,[project,org,user]);
      if(!scope.rows.length)throw new ExperienceError('Training administration denied.',403);
      const result=await fn(c);await c.query('COMMIT');return result;
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
  }
  private async audit(c:PoolClient,project:string,user:string,action:string,value:string){await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,$2,'user',$3,$4,'External training dataset control; no provider job submitted','success')`,[project,user,action,hash(value)]);}
  async list(org:string,user:string,project:string){return this.transaction(org,user,project,async c=>(await c.query('SELECT * FROM external_training_examples WHERE project_id=$1 ORDER BY created_at DESC LIMIT 200',[project])).rows);}
  async submit(org:string,user:string,project:string,input:any){
    const question=trainingText(input.question,10,4000),answer=trainingText(input.answer,10,6000),provenance=trainingText(input.provenance,20,2000),group=trainingText(input.evidenceGroup,3,200).toLowerCase();
    if(input.externalTrainingConsent!==true||!['train','validation','test'].includes(input.partition))throw new ExperienceError('Explicit external-training consent and partition required.');
    return this.transaction(org,user,project,async c=>{
      const rows=(await c.query('SELECT partition FROM external_training_examples WHERE project_id=$1 AND evidence_group=$2',[project,group])).rows;
      if(rows.some(r=>r.partition!==input.partition))throw new ExperienceError('Evidence groups cannot cross evaluation partitions.',409);
      const count=(await c.query('SELECT count(*)::int AS n FROM external_training_examples WHERE project_id=$1',[project])).rows[0].n;
      if(count>=2000)throw new ExperienceError('Dataset limit reached.',429);
      const saved=(await c.query(`INSERT INTO external_training_examples(project_id,author_id,question,answer,question_hash,evidence_group,provenance,partition,external_training_consent)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT(project_id,question_hash) DO NOTHING RETURNING id`,
        [project,user,question,answer,hash(question.toLowerCase().replace(/\s+/g,' ')),group,provenance,input.partition])).rows[0];
      if(!saved)throw new ExperienceError('Duplicate question or evaluation leakage.',409);
      await this.audit(c,project,user,'external_training.submit',saved.id);return saved;
    });
  }
  async review(org:string,user:string,project:string,id:string,approve:boolean,note:unknown){
    if(!uuid.test(id)||typeof approve!=='boolean')throw new ExperienceError('Explicit review required.');const text=trainingText(note,20,2000);
    return this.transaction(org,user,project,async c=>{
      const row=await c.query(`UPDATE external_training_examples SET reviewer_id=$3,status=$4,review_note=$5
        WHERE id=$1 AND project_id=$2 AND author_id<>$3 AND status='pending' RETURNING id`,[id,project,user,approve?'approved':'rejected',text]);
      if(!row.rows.length)throw new ExperienceError('Independent pending review required.',409);
      await this.audit(c,project,user,'external_training.review',id);return row.rows[0];
    });
  }
  async revoke(org:string,user:string,project:string,id:string){if(!uuid.test(id))throw new ExperienceError('Example UUID required.');return this.transaction(org,user,project,async c=>{
    await c.query("UPDATE external_training_examples SET status='rejected' WHERE id=$1 AND project_id=$2",[id,project]);await this.audit(c,project,user,'external_training.revoke',id);return {revoked:true};
  });}
  async export(org:string,user:string,project:string,provider:unknown,model:unknown){
    const providerName=trainingText(provider,2,100),modelName=trainingText(model,2,200);
    return this.transaction(org,user,project,async c=>{
      const rows=(await c.query(`SELECT x.* FROM external_training_examples x JOIN projects p ON p.id=x.project_id
        JOIN organization_members a ON a.organization_id=p.organization_id AND a.user_id=x.author_id AND a.role IN ('owner','admin')
        JOIN organization_members r ON r.organization_id=p.organization_id AND r.user_id=x.reviewer_id AND r.role IN ('owner','admin')
        WHERE x.project_id=$1 AND x.status='approved' AND x.external_training_consent ORDER BY x.id FOR SHARE OF a,r,x`,[project])).rows;
      const counts={train:rows.filter(r=>r.partition==='train').length,validation:rows.filter(r=>r.partition==='validation').length,test:rows.filter(r=>r.partition==='test').length};
      if(counts.train<20||counts.validation<5||counts.test<5)throw new ExperienceError('At least 20 train, 5 validation and 5 independent test examples are required.',409);
      const files=Object.fromEntries(['train','validation','test'].map(part=>[part,rows.filter(r=>r.partition===part).map(r=>JSON.stringify({messages:[{role:'user',content:r.question},{role:'assistant',content:r.answer}]})).join('\n')+'\n']));
      const manifest={projectId:project,provider:providerName,baseModel:modelName,counts,exampleIds:rows.map(r=>r.id),datasetHash:hash(JSON.stringify(rows)),format:'provider-neutral chat JSONL',providerJobSubmitted:false,
        limitation:'Preparation only. Provider format/eligibility, paid job approval, held-out evaluation, promotion and rollback remain required. Keep test data out of provider training uploads.'};
      await this.audit(c,project,user,'external_training.export',manifest.datasetHash);return {manifest,files};
    });
  }
}
