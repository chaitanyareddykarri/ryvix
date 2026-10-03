import {Pool} from 'pg';
import {WhatsAppAssistant} from '../backend/src/services/whatsapp-assistant';
async function main(){
  if(process.env.RYVIX_WHATSAPP_ASSISTANT_ENABLED!=='true')throw new Error('Assistant disabled');
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const pool=new Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  pool.on('error',()=>console.error('Assistant database unavailable.'));
  let stopped=false;process.once('SIGTERM',()=>{stopped=true;});process.once('SIGINT',()=>{stopped=true;});const worker=new WhatsAppAssistant(pool);
  try{do{try{await worker.maintenance();await worker.processOne();await worker.notifications();await worker.dispatchOne();}
    catch{console.error('WhatsApp assistant iteration incomplete; inspect configuration and persisted status.');if(process.argv.includes('--once'))process.exitCode=1;}
    if(process.argv.includes('--once')||stopped)break;await new Promise(resolve=>setTimeout(resolve,5000));
  }while(!stopped);}finally{await pool.end();}
}
void main().catch(()=>{console.error('WhatsApp assistant worker not started; check enable flag and database TLS.');process.exitCode=1;});
