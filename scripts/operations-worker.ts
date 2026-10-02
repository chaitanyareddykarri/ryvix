import {Pool} from 'pg';
import {CloudRecoveryStore} from '../backend/src/services/cloud-recovery-store';
import {WhatsAppOutbox} from '../backend/src/services/whatsapp-outbox';
import {EmailNotifications} from '../backend/src/services/email-notifications';

async function main(){
  const url=new URL(process.env.DATABASE_URL!);for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const pool=new Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  let stopped=false;const stop=()=>{stopped=true;};process.on('SIGTERM',stop);process.on('SIGINT',stop);
  const cloud=new CloudRecoveryStore(pool),alerts=new WhatsAppOutbox(pool),email=new EmailNotifications(pool);
  try{do{
    // Optional workloads are independent: a bad notification configuration must not halt recovery observation.
    if(process.env.RYVIX_CLOUD_RECOVERY_ENABLED==='true')try{await cloud.verifyPending();await cloud.dispatchOne();}catch{console.error('Cloud recovery iteration incomplete; review configuration and persisted outcomes.');}
    if(process.env.RYVIX_WHATSAPP_ALERTS_ENABLED==='true')try{await alerts.expireClaims();await alerts.reconcileReceipts();await alerts.enqueue();await alerts.dispatchOne();}catch{console.error('WhatsApp iteration incomplete; review configuration and outbox.');}
    if(process.env.RYVIX_EMAIL_NOTIFICATIONS_ENABLED==='true')try{await email.expireClaims();await email.enqueue();await email.dispatchOne();}catch{console.error('Email notification iteration incomplete; review configuration and outbox.');}
    if(process.argv.includes('--once'))break;
    if(!stopped)await new Promise(resolve=>setTimeout(resolve,5000));
  }while(!stopped);}finally{await pool.end();}
}
main().catch(()=>{console.error('Operations worker failed to start. Check database TLS and configuration.');process.exitCode=1;});
