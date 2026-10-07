import {createWorkerPool} from './worker-database';
import {CloudRecoveryStore} from '../backend/src/services/cloud-recovery-store';
import {WhatsAppOutbox} from '../backend/src/services/whatsapp-outbox';
import {EmailNotifications} from '../backend/src/services/email-notifications';
import {IncidentNotifications} from '../backend/src/services/incident-notifications';

async function main(){
  const pool=createWorkerPool('Operations',3);
  let stopped=false;const stop=()=>{stopped=true;};process.on('SIGTERM',stop);process.on('SIGINT',stop);
  const cloud=new CloudRecoveryStore(pool),alerts=new WhatsAppOutbox(pool),email=new EmailNotifications(pool);
  const notifications=new IncidentNotifications(pool);
  try{do{
    // Optional workloads are independent: a bad notification configuration must not halt recovery observation.
    if(process.env.RYVIX_CLOUD_RECOVERY_ENABLED==='true')try{await cloud.verifyPending();await cloud.dispatchOne();}catch{console.error('Cloud recovery iteration incomplete; review configuration and persisted outcomes.');}
    if(process.env.RYVIX_WHATSAPP_ALERTS_ENABLED==='true')try{await alerts.expireClaims();await alerts.reconcileReceipts();await alerts.enqueue();await alerts.dispatchOne();}catch{console.error('WhatsApp iteration incomplete; review configuration and outbox.');}
    if(process.env.RYVIX_EMAIL_NOTIFICATIONS_ENABLED==='true')try{await email.expireClaims();await email.enqueue();await email.dispatchOne();}catch{console.error('Email notification iteration incomplete; review configuration and outbox.');}
    if(process.env.RYVIX_INCIDENT_NOTIFICATIONS_ENABLED==='true')try{await notifications.expireClaims();await notifications.enqueue();await notifications.dispatchOne();}catch{console.error('Incident notifications incomplete; review configuration and outbox.');}
    if(process.env.RYVIX_PAGERDUTY_STATUS_ENABLED==='true')try{await notifications.observePagerDuty();}catch{console.error('PagerDuty observation unavailable; previous evidence retained.');}
    if(process.argv.includes('--once'))break;
    if(!stopped)await new Promise(resolve=>setTimeout(resolve,5000));
  }while(!stopped);}finally{await pool.end();}
}
main().catch(()=>{console.error('Operations worker failed to start. Check database TLS and configuration.');process.exitCode=1;});
