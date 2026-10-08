import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function verificationPlan(args=[]){
 const allowed=new Set(['--list','--database','--runtime']);
 if(args.some(arg=>!allowed.has(arg)))throw new Error('Supported options: --list --database --runtime');
 return ['security:secrets','typecheck','lint','test:offline','test:browser',
  ...(args.includes('--database')?['verify:database']:[]),
  ...(args.includes('--runtime')?['verify:runtime']:[])];
}

export async function runVerification(plan,run,log=console.log){
 const results=[];
 // Sequential execution preserves runtime-file restoration and avoids SQL fixture contention.
 for(const command of plan){
  const started=Date.now();let code;
  try{code=await run(command);}catch{code=1;}
  results.push({command,passed:code===0,seconds:Math.round((Date.now()-started)/1000)});
 }
 log('\nVerification summary (local checks do not certify deployment):');
 for(const result of results)log(`${result.passed?'PASS':'FAIL'} ${result.command} (${result.seconds}s)`);
 return results.every(result=>result.passed)?0:1;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const args=process.argv.slice(2),plan=verificationPlan(args);
  if(args.includes('--list'))console.log(plan.join('\n'));
  else{
   if(!process.env.npm_execpath)throw new Error('Run through npm run verify:all');
   process.exitCode=await runVerification(plan,command=>new Promise(resolve=>{
    const child=spawn(process.execPath,[process.env.npm_execpath,'run',command],{stdio:'inherit',windowsHide:true});
    child.once('error',()=>resolve(1));child.once('exit',code=>resolve(code??1));
   }));
  }
 }catch(error){console.error(error.message);process.exitCode=1;}
}
