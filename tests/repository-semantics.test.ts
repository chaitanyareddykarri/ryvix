import assert from 'node:assert/strict';
import {RepositoryKnowledge} from '../backend/src/services/repository-knowledge';
export async function testRepositorySemantics(){
  const names=['GEMINI_API_KEY','GEMINI_EMBEDDING_MODEL','RYVIX_REPOSITORY_SEMANTIC_ENABLED'];const before=names.map(n=>process.env[n]);
  const original=global.fetch;
  try{
    process.env.GEMINI_API_KEY='fixture';process.env.GEMINI_EMBEDDING_MODEL='fixture';process.env.RYVIX_REPOSITORY_SEMANTIC_ENABLED='true';
    global.fetch=async()=>Response.json({embeddings:[{values:[1,0]}]});
    const rows=[{path:'a.ts',content:"import './b';",repository_id:'repo',commit_sha:'commit',embedding_model:'fixture',embedding:[1,0]},
      {path:'b.ts',content:'export const value=1;',repository_id:'repo',commit_sha:'commit',embedding_model:null,embedding:null},
      {path:'b.ts',content:'OTHER TENANT',repository_id:'other',commit_sha:'other',embedding_model:null,embedding:null}];
    let revoked=false,snapshots=0;
    const pool={query:async(sql:string,args:any[])=>{
      assert.equal(args[0],'authorized-org');assert.equal(args[1],'authorized-user');
      assert.ok(sql.includes('m.user_id=$2'));assert.ok(sql.includes('p.organization_id=$1'));
      if(sql.includes('ts_headline'))return {rows:[{path:'lexical.ts'}]};
      snapshots++;return {rows:revoked&&snapshots>1?[]:rows};
    }} as any;
    const store=new RepositoryKnowledge(pool);
    const result=await store.search('authorized-org','authorized-user',null,'explain feature');
    assert.equal(result.length,2);assert.ok(result.every(r=>r.repository_id==='repo'));assert.ok(result.every(r=>!('embedding' in r)));
    snapshots=0;revoked=true;assert.deepEqual(await store.search('authorized-org','authorized-user',null,'explain feature'),[]);
    revoked=false;global.fetch=async()=>new Response('',{status:503});
    assert.deepEqual(await store.search('authorized-org','authorized-user',null,'explain feature'),[{path:'lexical.ts'}]);
  }finally{global.fetch=original;names.forEach((n,i)=>{if(before[i]===undefined)delete process.env[n];else process.env[n]=before[i];});}
}
