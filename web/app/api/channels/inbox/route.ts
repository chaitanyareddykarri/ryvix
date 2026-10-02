import { NextResponse } from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {ChannelInbox,ChannelError} from '../../../../../backend/src/services/channel-inbox';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
async function handle(request:Request,mutate:boolean){try{
  const {organizationId,user}=await requireTenant();const store=new ChannelInbox(getDirectDbPool());
  if(!mutate)return NextResponse.json({messages:await store.list(organizationId,user.id)},{headers:{'Cache-Control':'no-store'}});
  const body=await request.json().catch(()=>null);
  if(!body||!uuid.test(body.id)||!['accept','reject'].includes(body.action)||(body.action==='accept'&&!uuid.test(body.repositoryId)))throw new RequestError('Invalid inbox review.',400);
  return NextResponse.json(await store.decide(organizationId,user.id,body.id,body.repositoryId,body.action==='accept'));
}catch(error){const known=error instanceof RequestError||error instanceof ChannelError;return NextResponse.json({error:known?error.message:'Channel inbox unavailable.'},{status:known?error.status:503});}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
