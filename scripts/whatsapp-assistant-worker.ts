import {createWorkerPool} from './worker-database';
import {WhatsAppAssistant} from '../backend/src/services/whatsapp-assistant';
async function main(){
  if(process.env.RYVIX_WHATSAPP_ASSISTANT_ENABLED!=='true')throw new Error('Assistant disabled');
  const pool=createWorkerPool('WhatsApp assistant',3);
  let stopped=false;process.once('SIGTERM',()=>{stopped=true;});process.once('SIGINT',()=>{stopped=true;});const worker=new WhatsAppAssistant(pool);
  try{do{try{await worker.maintenance();await worker.processOne();await worker.notifications();await worker.dispatchOne();}
    catch{console.error('WhatsApp assistant iteration incomplete; inspect configuration and persisted status.');if(process.argv.includes('--once'))process.exitCode=1;}
    if(process.argv.includes('--once')||stopped)break;await new Promise(resolve=>setTimeout(resolve,5000));
  }while(!stopped);}finally{await pool.end();}
}
void main().catch(()=>{console.error('WhatsApp assistant worker not started; check enable flag and database TLS.');process.exitCode=1;});
