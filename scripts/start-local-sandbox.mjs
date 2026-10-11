import {spawn,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {resolve} from 'node:path';
import {resolve4} from 'node:dns/promises';
import {localWorkspaceConfiguration} from './local-workspace-config.mjs';

async function main(){
  const file=resolve('.env.workspace.local');
  // Explicit local file wins over stale shell variables, consistently in checks and child.
  const env={...process.env,...parseEnv(readFileSync(file,'utf8'))};
  env.RYVIX_PREVIEW_MODE ||= 'browser';
  const config=localWorkspaceConfiguration(env);
  const docker=args=>spawnSync('docker',args,{encoding:'utf8',timeout:15000});
  const info=docker(['info','--format','{{.OSType}}']);
  if(info.status!==0||info.stdout.trim()!=='linux')throw Error('Open Docker Desktop in Linux container mode first.');
  for(const image of config.images){const r=docker(['image','inspect','--format','{{.Os}}',image]);if(r.status!==0||r.stdout.trim()!=='linux')throw Error('An approved workspace image is missing. Build the configured images before starting.');}
  console.log('Docker, approved images and required configuration checked. Provider availability is verified when requested; key presence is not a successful model test.');
  const host='00000000-0000-0000-0000-000000000000.'+config.domain;
  try{if(env.RYVIX_PREVIEW_MODE!=='browser')await resolve4(host);}catch{throw Error('Wildcard preview DNS is missing. Configure HTTPS routing for *.'+config.domain+' to this laptop before consuming tasks.');}
  if(process.argv.includes('--check')){console.log('Configuration checks passed. Browser snapshots need no public DNS. Public mode additionally checks HTTPS at startup. No jobs consumed.');return;}
  console.log('Starting repository worker. Keep this laptop awake and Docker running. Browser snapshots need no tunnel.');
  const child=spawn(process.execPath,['--import','tsx','scripts/workspace-worker.ts'],{stdio:'inherit',env:{...env,RYVIX_REQUIRE_PUBLIC_PREVIEW:env.RYVIX_PREVIEW_MODE==='browser'?'false':'true'}});
  child.on('error',()=>{console.error('Worker process could not launch.');process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=code??1;if(code!==0)console.error('Worker stopped. Review the specific error above; no automatic task replay was attempted.');});
}
main().catch(error=>{console.error(error.code==='ENOENT'?'Missing .env.workspace.local.':error.message);process.exitCode=1;});
