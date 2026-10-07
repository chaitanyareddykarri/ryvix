import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const data=join(root,'ai/data');
const snapshot=new Map(readdirSync(data,{withFileTypes:true}).filter(x=>x.isFile()).map(x=>[x.name,readFileSync(join(data,x.name))]));
const env={...process.env};
for(const key of Object.keys(env)) if(/KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|SUPABASE|SMTP|PROXY/i.test(key)) delete env[key];
env.NODE_ENV='test';env.RYVIX_TEST_LOCAL_HTTP='false';
env.NODE_OPTIONS=`--require "${join(root,'tests/helpers/offline-network.cjs').replaceAll('\\','/')}"`;
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run through npm run test:offline');
let result;
try { result=spawnSync(process.execPath,[npm,'test'],{cwd:root,env,stdio:'inherit',windowsHide:true}); }
finally {
  mkdirSync(data,{recursive:true});
  for(const name of readdirSync(data)) if(!snapshot.has(name)&&!readdirSync(data,{withFileTypes:true}).find(x=>x.name===name)?.isDirectory())unlinkSync(join(data,name));
  for(const [name,bytes] of snapshot)writeFileSync(join(data,name),bytes);
  if([...snapshot].some(([name,bytes])=>!existsSync(join(data,name))||!readFileSync(join(data,name)).equals(bytes)))throw new Error('AI runtime data restoration failed');
  console.log(`Restored ${snapshot.size} AI runtime files byte-for-byte.`);
}
if(result.error)throw result.error;
process.exitCode=result.status??1;
