import {Pool} from 'pg';
import {pollScheduledGmail,scheduledGmailIds} from '../backend/src/services/gmail-scheduler';

async function main(){
  if(process.env.RYVIX_GMAIL_POLL_ENABLED!=='true')throw new Error('Gmail polling disabled');
  const ids=scheduledGmailIds(process.env.RYVIX_GMAIL_POLL_CONNECTORS||'');
  const url=new URL(process.env.DATABASE_URL!);
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const pool=new Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:10000,
    statement_timeout:15000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  pool.on('error',()=>console.error('Gmail worker database unavailable.'));
  const stop=new AbortController();process.once('SIGINT',()=>stop.abort());process.once('SIGTERM',()=>stop.abort());
  try {do{
    const result=await pollScheduledGmail(pool,ids,stop.signal);
    console.log(JSON.stringify(result));if(result.failed&&process.argv.includes('--once'))process.exitCode=1;
    if(stop.signal.aborted||process.argv.includes('--once'))break;
    await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);stop.signal.removeEventListener('abort',done);resolve();};
      const timer=setTimeout(done,60000);stop.signal.addEventListener('abort',done,{once:true});});
  }while(!stop.signal.aborted);}finally{await pool.end();}
}
main().catch(()=>{console.error('Gmail worker stopped; check enable flag, connector allowlist and database/OAuth configuration.');process.exitCode=1;});
