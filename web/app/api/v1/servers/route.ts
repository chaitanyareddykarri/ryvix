import {NextResponse} from 'next/server';
import {getDirectDbPool} from '@/utils/direct-db';
import {readApiServers,ApiAccessError} from '../../../../../backend/src/services/api-access';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 return NextResponse.json(await readApiServers(getDirectDbPool(),request.headers.get('authorization')),{headers:{'Cache-Control':'no-store'}});
}catch(e){return NextResponse.json({error:e instanceof ApiAccessError?e.message:'API inventory unavailable.'},{status:e instanceof ApiAccessError?e.status:503,headers:{'Cache-Control':'no-store'}});}}
