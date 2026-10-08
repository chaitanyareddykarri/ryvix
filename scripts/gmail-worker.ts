import {createWorkerPool} from './worker-database';
import {scheduledGmailIds} from '../backend/src/services/gmail-scheduler';
import {gmailWorkerCycle} from '../backend/src/services/gmail-maintenance';

async function main(){
  if(process.env.RYVIX_GMAIL_POLL_ENABLED!=='true')throw new Error('Gmail polling disabled');
  const ids=scheduledGmailIds(process.env.RYVIX_GMAIL_POLL_CONNECTORS||'');
  const pool=createWorkerPool('Gmail',3,15000,true);
  const stop=new AbortController();process.once('SIGINT',()=>stop.abort());process.once('SIGTERM',()=>stop.abort());
  let nextPeriodic=0;
  try {do{
    const periodic=Date.now()>=nextPeriodic;
    const result=await gmailWorkerCycle(pool,ids,stop.signal,periodic);
    if(periodic)nextPeriodic=Date.now()+60000;
    console.log(JSON.stringify(result));if(result.failed&&process.argv.includes('--once'))process.exitCode=1;
    if(stop.signal.aborted||process.argv.includes('--once'))break;
    await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);stop.signal.removeEventListener('abort',done);resolve();};
      const timer=setTimeout(done,result.failed?60000:5000);stop.signal.addEventListener('abort',done,{once:true});});
  }while(!stop.signal.aborted);}finally{await pool.end();}
}
main().catch(()=>{console.error('Gmail worker stopped; check enable flag, connector allowlist and database/OAuth configuration.');process.exitCode=1;});
