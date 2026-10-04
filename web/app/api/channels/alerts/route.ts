import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {WhatsAppOutbox} from '../../../../../backend/src/services/whatsapp-outbox';
import {IncidentNotifications} from '../../../../../backend/src/services/incident-notifications';
export async function GET(){try{
  const {organizationId,user,role}=await requireTenant();if(!['owner','admin'].includes(role))throw new RequestError('Channel administrator required.',403);
  const pool=getDirectDbPool();
  const [alerts,additional]=await Promise.all([new WhatsAppOutbox(pool).list(organizationId,user.id),new IncidentNotifications(pool).list(organizationId,user.id)]);
  return NextResponse.json({alerts:[...alerts.map(a=>({...a,provider:'whatsapp'})),...additional]},{headers:{'Cache-Control':'no-store'}});
}catch(e){return NextResponse.json({error:e instanceof RequestError?e.message:'Alert history unavailable.'},{status:e instanceof RequestError?e.status:503});}}
