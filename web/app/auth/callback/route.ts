import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createClient} from '@/utils/supabase/server';

export const dynamic='force-dynamic';

export async function GET(request:Request){
 const input=new URL(request.url);
 let origin:string;
 try{
  // Production redirects never trust proxy headers or a caller-supplied destination.
  const configured=process.env.RYVIX_PUBLIC_URL;
  if(!configured&&process.env.NODE_ENV==='production')throw new Error('Missing origin');
  const base=new URL(configured||input.origin);
  if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||
    (base.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&base.protocol==='http:')))throw new Error('Invalid origin');
  origin=base.origin;
 }catch{return NextResponse.json({error:'Authentication redirect is not configured. Set RYVIX_PUBLIC_URL to the application origin.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 const redirect=(path:string)=>{
  const response=NextResponse.redirect(new URL(path,origin));
  response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 };
 const failure=(reason:string)=>redirect(`/auth/error?reason=${reason}`);
 if(input.searchParams.has('error'))return failure(input.searchParams.get('error')==='access_denied'?'cancelled':'callback');
 try{
  const db=createClient(await cookies());
  const code=input.searchParams.get('code');
  if(code){
   // Supabase SSR retains the PKCE verifier in cookies; exchange validates it.
   const {error}=await db.auth.exchangeCodeForSession(code);
   if(error)return failure('callback');
  }else if(input.searchParams.get('retry')!=='1')return failure('callback');
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)return failure('session');
  const {data:profile,error:profileError}=await db.from('profiles').select('organization_id').eq('id',user.id).maybeSingle();
  if(profileError||!profile?.organization_id)return failure('workspace');
  const {data:member,error:memberError}=await db.from('organization_members').select('role')
   .eq('organization_id',profile.organization_id).eq('user_id',user.id).maybeSingle();
  if(memberError||!member)return failure('workspace');
  return redirect('/dashboard');
 }catch{return failure('callback');}
}
