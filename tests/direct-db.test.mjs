import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';

test('direct database connection failure never replays an ambiguous write',async()=>{
 const source=readFileSync('web/utils/direct-db.ts','utf8');
 const {code}=transformSync(source,{loader:'ts',format:'cjs'});
 for(const failureCode of ['ECONNRESET','EPIPE','ETIMEDOUT']){
  let calls=0,configuration;
  const failure=Object.assign(new Error('fixture disconnect'),{code:failureCode});
  const module={exports:{}};
  const fakeRequire=name=>{
   if(name==='server-only')return {};
   if(name==='pg')return {Pool:class{
    constructor(options){configuration=options;}
    on(){}
    async query(){calls++;throw failure;}
   }};
   throw new Error('Unexpected dependency');
  };
  new Function('require','module','exports','process','console',code)(fakeRequire,module,module.exports,
   {env:{DATABASE_URL:'postgresql://fixture@localhost/fixture?sslmode=disable'}},{error(){},warn(){}});
  await assert.rejects(module.exports.queryDirectDb('UPDATE auth_challenge_limits SET attempts=attempts+1'),
   error=>error.message==='Database operation failed'&&error.cause===failure);
  assert.equal(calls,1);
  assert.equal(configuration.keepAlive,true);
  assert.equal(configuration.ssl.rejectUnauthorized,true);
  assert.equal(new URL(configuration.connectionString).searchParams.has('sslmode'),false);
 }
});
