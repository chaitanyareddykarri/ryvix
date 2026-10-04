import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {boundedDeviceBody} from '@/utils/device-ingestion';
import {DeviceError} from '../../../../../../backend/src/services/device-protocol';
import {ChannelError} from '../../../../../../backend/src/services/channel-inbox';
import {GmailReplies} from '../../../../../../backend/src/services/gmail-replies';
const failure=(e:unknown)=>NextResponse.json({error:e instanceof RequestError||e instanceof ChannelError||e instanceof DeviceError?e.message:'Gmail reply unavailable.'},{status:e instanceof RequestError||e instanceof ChannelError||e instanceof DeviceError?e.status:503});
export async function GET(){try{const t=await requireTenant();return NextResponse.json(await new GmailReplies(getDirectDbPool()).list(t.organizationId,t.user.id));}catch(e){return failure(e);}}
export async function POST(request:Request){try{const t=await requireTenant();const b=JSON.parse((await boundedDeviceBody(request,10000)).toString());const store=new GmailReplies(getDirectDbPool());
  if(!['draft','decide'].includes(b.action))throw new ChannelError('Unknown reply action.',400);
  return NextResponse.json(b.action==='draft'?await store.draft(t.organizationId,t.user.id,b.inboxId,b.body):await store.decide(t.organizationId,t.user.id,b.id,b.approve));
}catch(e){return failure(e);}}
