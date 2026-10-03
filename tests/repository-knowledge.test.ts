import assert from 'node:assert/strict';
import {indexablePath,sanitizeKnowledge,readKnowledgeSnapshot} from '../backend/src/services/repository-knowledge';
export async function testRepositoryKnowledge(){
  for(const file of ['.env','src/secrets/settings.ts','node_modules/x/index.ts','a/../b.ts','certs/config.json','private.pem','package-lock.json'])assert.equal(indexablePath(file),false,file);
  for(const file of ['README.md','src/auth.ts','docs/architecture.md','package.json'])assert.equal(indexablePath(file),true,file);
  assert.ok(!sanitizeKnowledge('settings.json','{"nested":{"password":"never-copy-this-value"}}').includes('never-copy-this-value'));
  assert.throws(()=>sanitizeKnowledge('src/a.ts','x'.repeat(33000)),/excluded/);
  const original=globalThis.fetch,sha='a'.repeat(40),blob='b'.repeat(40);let fetches=0;
  try{
    globalThis.fetch=async(url,init)=>{fetches++;assert.equal(init?.redirect,'error');const path=String(url);
      if(path.includes('/commits/'))return Response.json({sha});
      if(path.includes('/git/trees/'))return Response.json({truncated:true,tree:[{path:'src/auth.ts',type:'blob',mode:'100644',size:20,sha:blob},{path:'src/link.ts',type:'blob',mode:'120000',size:20,sha:blob}]});
      if(path.includes('/git/blobs/'))return Response.json({sha:blob,encoding:'base64',content:Buffer.from('export const rule = "authorized";').toString('base64')});
      return Response.json({full_name:'fixture/repo',default_branch:'main',archived:false});
    };
    const job={repository_id:'fixture',project_id:'fixture',full_name:'fixture/repo',default_branch:'main',claim_id:'fixture',configured_by:'fixture',commit_sha:null,file_count:0};
    const result=await readKnowledgeSnapshot(job,'fixture');assert.equal(result.files.length,1);assert.equal(result.commit,sha);assert.equal(result.partial,true);assert.equal(fetches,4);
    fetches=0;const reused=await readKnowledgeSnapshot({...job,commit_sha:sha,file_count:1},'fixture');assert.equal(reused.files.length,0);assert.equal(fetches,2);
  }finally{globalThis.fetch=original;}
}
