import {NextResponse} from 'next/server';
import {requireTenant,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {ModelUsage} from '../../../../../backend/src/services/model-usage';
export async function GET(){try{const t=await requireTenant();return NextResponse.json({attempts:await new ModelUsage(getDirectDbPool()).list(t.organizationId,t.user.id),limitation:'Started without completion means unknown outcome. Failed/cancelled usage may be partial. These records are not provider invoices.'},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof RequestError?e.message:'Usage unavailable.'},{status:e instanceof RequestError?e.status:503});}}
