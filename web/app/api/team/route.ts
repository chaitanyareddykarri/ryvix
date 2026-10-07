import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createClient} from '@/utils/supabase/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {getDirectDbPool} from '@/utils/direct-db';
import {TeamStore,TeamError} from '../../../../backend/src/services/team-store';
import {DeviceError} from '../../../../backend/src/services/device-protocol';
import {sendSmtpMail} from '../../../../services/src/communication/smtp';
export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){try{
 const db=createClient(await cookies()),{data:{user},error}=await db.auth.getUser();if(error||!user)throw new RequestError('Authentication required.',401);
 const pool=getDirectDbPool(),store=new TeamStore(pool);
 let result;
 if(!write){
  const memberships=(await pool.query('SELECT m.organization_id,o.name FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 ORDER BY m.created_at',[user.id])).rows;
  const profile=(await pool.query('SELECT organization_id FROM profiles WHERE id=$1',[user.id])).rows[0];
  result={...(memberships.some(m=>m.organization_id===profile?.organization_id)?await store.list(profile.organization_id,user.id):{members:[],invitations:[],currentRole:null,currentUserId:user.id}),memberships,organizationId:profile?.organization_id};
 }else{
  let body;try{body=JSON.parse((await boundedDeviceBody(request,4096)).toString('utf8'));}catch(e){if(e instanceof DeviceError)throw e;throw new RequestError('Invalid JSON.',400);}
  if(body?.action==='accept')result=await store.accept(user.id,user.email,!!user.email_confirmed_at,body.token);
  else if(body?.action==='switch')result=await store.switchOrganization(user.id,body.organizationId);
  else{
   const {organizationId}=await requireTenant();
   if(body?.action==='invite'){
    // The email origin is operator configuration, never a caller-supplied host.
    let origin='';if(body.sendEmail===true){try{const url=new URL(process.env.RYVIX_PUBLIC_URL||'');if(url.protocol!=='https:'||url.username||url.password)throw new Error();origin=url.origin;}catch{throw new RequestError('Invitation email origin is not configured.',503);}}
    const created=await store.invite(organizationId,user.id,body.email,body.role);let delivery='not_requested';
    if(body.sendEmail===true){try{await sendSmtpMail({to:created.invitation.email,from:process.env.RYVIX_NOTIFICATION_FROM||process.env.SMTP_USER||'',subject:'Ryvix team invitation',text:`Sign in with this email and accept your team invitation: ${origin}/team#invite=${created.token}\nExpires: ${created.invitation.expires_at}`});delivery='accepted';}catch{delivery='unknown';}}
    result={...created,delivery};
   }else result=await store.mutate(organizationId,user.id,body||{});
  }
 }
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){const known=e instanceof RequestError||e instanceof TeamError||e instanceof DeviceError;return NextResponse.json({error:known?e.message:'Team management unavailable. Check deployment migrations.'},{status:known?e.status:503,headers:{'Cache-Control':'no-store'}});}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
