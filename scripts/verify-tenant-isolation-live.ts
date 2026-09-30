import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client } from 'pg';

// Synthetic database-role fixtures only, entirely rolled back. This is not a
// Supabase Auth/JWT login test and never sends email or accesses real user rows.
async function main() {
  for (const file of ['.env','.env.local','web/.env.local'])
    if (fs.existsSync(file)) Object.assign(process.env,parseEnv(fs.readFileSync(file,'utf8')));
  const url=new URL(process.env.DATABASE_URL!);
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000,
    ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  const users=[randomUUID(),randomUUID()],projects=[randomUUID(),randomUUID()];
  try {
    await client.connect();await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    const organizations:string[]=[];
    for(let i=0;i<2;i++) {
      await client.query(`INSERT INTO auth.users(id,email,raw_user_meta_data)
        VALUES($1,$2,'{"full_name":"Ryvix rollback test"}'::jsonb)`,[users[i],`rollback-${users[i]}@example.test`]);
      const profile=await client.query('SELECT organization_id FROM profiles WHERE id=$1',[users[i]]);
      assert.equal(profile.rowCount,1);organizations.push(profile.rows[0].organization_id);
      await client.query("INSERT INTO projects(id,organization_id,name,slug) VALUES($1,$2,'Rollback fixture','rollback-fixture')",[projects[i],organizations[i]]);
      await client.query("INSERT INTO tasks(project_id,created_by,task_type,user_prompt) VALUES($1,$2,'investigation','Rollback fixture')",[projects[i],users[i]]);
    }
    // Keep the profile owner role deliberately stale; membership is authoritative.
    await client.query("UPDATE organization_members SET role='viewer' WHERE user_id=$1",[users[0]]);
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:users[0],role:'authenticated'})]);
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users[0]]);
    assert.deepEqual((await client.query('SELECT id FROM projects WHERE id=ANY($1::uuid[])',[projects])).rows.map(row=>row.id),[projects[0]]);
    assert.equal((await client.query('SELECT id FROM tasks WHERE project_id=ANY($1::uuid[])',[projects])).rowCount,1);
    assert.equal((await client.query('UPDATE organizations SET name=name WHERE id=$1 RETURNING id',[organizations[0]])).rowCount,0);
    assert.equal((await client.query("UPDATE profiles SET full_name='Rollback display edit' WHERE id=$1 RETURNING id",[users[0]])).rowCount,1);
    for(const [sql,values] of [
      ['UPDATE projects SET name=name WHERE id=$1',[projects[0]]],
      ["INSERT INTO audit_events(project_id,actor_type,action_name,parameters_hash,status) VALUES($1,'system','forged','test','success')",[projects[0]]],
    ] as Array<[string,string[]]>) {
      await client.query('SAVEPOINT denied_write');
      let denied=false;
      try {await client.query(sql,values);} catch(error:any) {denied=error.code==='42501';}
      await client.query('ROLLBACK TO SAVEPOINT denied_write');assert.equal(denied,true);
    }
    await client.query('RESET ROLE');
    await client.query('DELETE FROM organization_members WHERE user_id=$1',[users[0]]);
    await client.query('SET LOCAL ROLE authenticated');
    assert.equal((await client.query('SELECT id FROM projects WHERE id=ANY($1::uuid[])',[projects])).rowCount,0);
    assert.equal((await client.query('SELECT id FROM tasks WHERE project_id=ANY($1::uuid[])',[projects])).rowCount,0);
    assert.equal((await client.query('SELECT id FROM organization_members WHERE organization_id=$1',[organizations[0]])).rowCount,0);
    await client.query('RESET ROLE');await client.query('ROLLBACK');
    assert.equal((await client.query('SELECT id FROM auth.users WHERE id=ANY($1::uuid[])',[users])).rowCount,0);
    console.log('PASS tenant isolation, viewer write denial, stale-role denial, profile display edits and revoked-membership denial; all fixtures rolled back.');
  } finally {await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
}
main().catch(error=>{console.error(`Tenant SQL smoke check failed (${String(error.code||'CHECK_FAILED').replace(/[^a-z0-9_]/gi,'')}).`);process.exitCode=1;});
