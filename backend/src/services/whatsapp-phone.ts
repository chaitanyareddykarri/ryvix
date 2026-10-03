import {createHmac,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {ChannelError} from './channel-inbox';
import {sendWhatsAppOtp,otpConfiguration} from '../../../services/src/communication/whatsapp-otp';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function normalizeWhatsAppPhone(value:unknown){
  if(typeof value!=='string'||value.length>32)throw new ChannelError('International phone number required.',400);
  const phone=value.replace(/[ ()-]/g,'');if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new ChannelError('Use an international number starting with +.',400);return phone;
}
export function phoneOtpDigest(id:string,code:string){const key=process.env.WHATSAPP_OTP_SECRET||'';
  if(key.length<32)throw new ChannelError('WhatsApp phone verification is not configured.',503);
  return createHmac('sha256',key).update(`${id}:${code}`).digest('hex');}
export class WhatsAppPhone {
  constructor(private readonly pool:Pool,private readonly send=sendWhatsAppOtp){}
  private async tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
  private async scope(c:PoolClient,org:string,user:string,connector:string){
    if(!uuid.test(connector))throw new ChannelError('Valid business connector required.',400);
    const r=(await c.query(`SELECT p.id AS project_id,a.provider_subject FROM connectors co JOIN channel_accounts a ON a.connector_id=co.id
      JOIN environments e ON e.id=co.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      JOIN organization_members owner ON owner.organization_id=p.organization_id AND owner.user_id=a.owner_id AND owner.role IN ('owner','admin')
      WHERE p.organization_id=$1 AND co.id=$3 AND co.connector_type='whatsapp' AND co.status='active'
      AND m.role IN ('owner','admin','developer','viewer') FOR SHARE OF m,owner,co,a,p,e`,[org,user,connector])).rows[0];
    if(!r)throw new ChannelError('WhatsApp connection access denied.',403);
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`phone-user:${connector}:${user}`]);return r;
  }
  private async audit(c:PoolClient,project:string,user:string,action:string,id:string){await c.query(`INSERT INTO audit_events(project_id,actor_id,actor_type,action_name,parameters_hash,diff_summary,status)
    VALUES($1,$2,'user',$3,$4,'WhatsApp phone identity changed','success')`,[project,user,action,createHmac('sha256','phone-audit').update(id).digest('hex')]);}
  async list(org:string,user:string){return (await this.pool.query(`SELECT co.id,co.name,p.name AS project_name,l.phone,l.verified_at FROM connectors co
    JOIN channel_accounts a ON a.connector_id=co.id JOIN environments e ON e.id=co.environment_id JOIN projects p ON p.id=e.project_id
    JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
    JOIN organization_members owner ON owner.organization_id=p.organization_id AND owner.user_id=a.owner_id AND owner.role IN ('owner','admin')
    LEFT JOIN whatsapp_phone_links l ON l.connector_id=co.id AND l.user_id=$2 AND l.organization_id=$1
    WHERE p.organization_id=$1 AND co.connector_type='whatsapp' AND co.status='active' ORDER BY p.name LIMIT 100`,[org,user])).rows;}
  async request(org:string,user:string,connector:string,value:unknown){
    const phone=normalizeWhatsAppPhone(value),id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0'),hash=phoneOtpDigest(id,code);otpConfiguration();
    const job=await this.tx(async c=>{const scope=await this.scope(c,org,user,connector);
      const old=await c.query("SELECT 1 FROM whatsapp_phone_challenges WHERE connector_id=$1 AND user_id=$2 AND created_at>now()-interval '1 minute'",[connector,user]);
      if(old.rows.length)throw new ChannelError('Wait one minute before requesting another code.',429);
      for(const subject of [`wa-otp-user:${user}`,`wa-otp-phone:${createHmac('sha256',process.env.WHATSAPP_OTP_SECRET!).update(phone).digest('hex')}`]){
        const budget=await c.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests) VALUES($1,$2,date_trunc('hour',now()),1)
          ON CONFLICT(organization_id,subject,bucket) DO UPDATE SET requests=chat_request_budgets.requests+1 WHERE chat_request_budgets.requests<5 RETURNING requests`,[org,subject]);
        if(!budget.rows.length)throw new ChannelError('Verification send limit reached; retry next hour.',429);
      }
      const credential=(await c.query(`SELECT s.decrypted_secret FROM connector_credentials cc JOIN vault.decrypted_secrets s ON s.id::text=cc.vault_secret_ref
        WHERE cc.connector_id=$1 AND cc.credential_type='oauth_token' AND (cc.expires_at IS NULL OR cc.expires_at>now()) LIMIT 1`,[connector])).rows[0];
      if(!credential)throw new ChannelError('Business WhatsApp credentials unavailable.',503);
      await c.query('DELETE FROM whatsapp_phone_challenges WHERE connector_id=$1 AND user_id=$2',[connector,user]);
      await c.query('INSERT INTO whatsapp_phone_challenges(id,connector_id,organization_id,user_id,phone,code_digest) VALUES($1,$2,$3,$4,$5,$6)',[id,connector,org,user,phone,hash]);
      await this.audit(c,scope.project_id,user,'whatsapp.phone.request',id);
      return {phoneId:scope.provider_subject.replace(/^whatsapp:/,''),token:credential.decrypted_secret};
    });
    let accepted=false;try{await this.send({...job,recipient:phone,code});accepted=true;}catch{}
    await this.pool.query('UPDATE whatsapp_phone_challenges SET delivery=$2 WHERE id=$1',[id,accepted?'accepted':'unknown']);
    return {challengeId:id,delivery:accepted?'accepted':'unknown',expiresInSeconds:600};
  }
  async verify(org:string,user:string,connector:string,id:string,code:string){
    if(!uuid.test(id)||!/^\d{6}$/.test(code))throw new ChannelError('Six-digit code and challenge required.',400);
    const hash=phoneOtpDigest(id,code);
    const result=await this.tx(async c=>{const scope=await this.scope(c,org,user,connector);
      const challenge=(await c.query(`SELECT * FROM whatsapp_phone_challenges WHERE id=$1 AND organization_id=$2 AND user_id=$3 AND connector_id=$4
        AND expires_at>now() AND attempts<5 FOR UPDATE`,[id,org,user,connector])).rows[0];
      if(!challenge)return false;
      await c.query('UPDATE whatsapp_phone_challenges SET attempts=attempts+1 WHERE id=$1',[id]);
      if(!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(challenge.code_digest,'hex')))return false;
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`phone-number:${connector}:${challenge.phone}`]);
      const other=await c.query('SELECT 1 FROM whatsapp_phone_links WHERE connector_id=$1 AND phone=$2 AND user_id<>$3',[connector,challenge.phone,user]);
      if(other.rows.length){await c.query('DELETE FROM whatsapp_phone_challenges WHERE id=$1',[id]);return false;}
      await c.query('DELETE FROM whatsapp_assistant_sessions WHERE connector_id=$1 AND user_id=$2',[connector,user]);
      await c.query(`INSERT INTO whatsapp_phone_links(connector_id,organization_id,user_id,phone) VALUES($1,$2,$3,$4)
        ON CONFLICT(connector_id,user_id) DO UPDATE SET phone=excluded.phone,verified_at=now()`,[connector,org,user,challenge.phone]);
      await c.query("UPDATE channel_inbox SET sender_user_id=NULL WHERE connector_id=$1 AND sender_user_id=$2 AND status='pending'",[connector,user]);
      await c.query('DELETE FROM whatsapp_phone_challenges WHERE id=$1',[id]);await this.audit(c,scope.project_id,user,'whatsapp.phone.verified',id);return true;
    });
    if(!result)throw new ChannelError('Code invalid, expired, exhausted or number unavailable.',400);return {verified:true};
  }
  async unlink(org:string,user:string,connector:string){return this.tx(async c=>{const scope=await this.scope(c,org,user,connector);
    await c.query('DELETE FROM whatsapp_phone_challenges WHERE connector_id=$1 AND user_id=$2',[connector,user]);
    await c.query('DELETE FROM whatsapp_phone_links WHERE connector_id=$1 AND user_id=$2 AND organization_id=$3',[connector,user,org]);
    await c.query("UPDATE channel_inbox SET sender_user_id=NULL WHERE connector_id=$1 AND sender_user_id=$2 AND status='pending'",[connector,user]);
    await this.audit(c,scope.project_id,user,'whatsapp.phone.unlinked',connector);return {removed:true};});}
}
