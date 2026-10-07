import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {normalizeWhatsAppPhone} from '../../../../../backend/src/services/whatsapp-phone';
import {ChannelError} from '../../../../../backend/src/services/channel-inbox';
import {DeviceError} from '../../../../../backend/src/services/device-protocol';

export const dynamic='force-dynamic';
async function handle(request:Request,write:boolean){
  try{
    const {db,user,organizationId}=await requireTenant();
    let phone:string|null=null;
    if(write){
      let body;
      try{body=JSON.parse((await boundedDeviceBody(request,1024)).toString('utf8'));}
      catch(error){if(error instanceof DeviceError)throw error;throw new RequestError('Invalid JSON.',400);}
      if(!body||body.action!=='save')throw new RequestError('Invalid contact action.',400);
      phone=normalizeWhatsAppPhone(body.phone);
    }
    // The authenticated user's RLS client owns this write. No caller-supplied ID.
    const query=write?db.from('profiles').update({phone_number:phone}):db.from('profiles').select('phone_number');
    const scoped=query.eq('id',user.id).eq('organization_id',organizationId);
    const {data,error}=await (write?scoped.select('phone_number'):scoped).single();
    if(error||!data)throw new RequestError('Profile contact unavailable.',503);
    return NextResponse.json({phoneNumber:data.phone_number||null},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const known=error instanceof RequestError||error instanceof ChannelError||error instanceof DeviceError;
    return NextResponse.json({error:known?error.message:'Profile contact unavailable.'},{status:known?error.status:503});
  }
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
