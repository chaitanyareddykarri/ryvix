import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {WhatsAppOutbox} from '../../../../../backend/src/services/whatsapp-outbox';
export async function GET(){try{
  const {organizationId,user,role}=await requireTenant();if(!['owner','admin'].includes(role))throw new RequestError('Channel administrator required.',403);
  return NextResponse.json({alerts:await new WhatsAppOutbox(getDirectDbPool()).list(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
}catch(e){return NextResponse.json({error:e instanceof RequestError?e.message:'Alert history unavailable.'},{status:e instanceof RequestError?e.status:503});}}
