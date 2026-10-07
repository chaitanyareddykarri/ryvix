"use client";
import {Suspense,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {createClient} from '@/utils/supabase/client';

function AuthError(){
 const reason=useSearchParams().get('reason');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const messages:Record<string,string>={
  cancelled:'Google sign-in was cancelled. You can try again or use email and password.',
  callback:'Sign-in could not be completed. The link may have expired or been opened in another browser. Please start again.',
  session:'Your session could not be verified. Please sign in again.',
  workspace:'You are signed in, but your workspace is not available. Retry the check. If this continues, contact your Ryvix administrator to check profile and membership provisioning.',
 };
 async function restart(){setBusy(true);setError('');try{
  const {error}=await createClient().auth.signOut({scope:'local'});
  if(error)throw error;window.location.assign('/login');
 }catch{setError('Could not sign out. Please retry.');setBusy(false);}}
 return <main style={{maxWidth:520,margin:'10vh auto',padding:'1.5rem',color:'#F5F7FA'}}>
  <h1>Complete your sign-in</h1><p>{messages[reason||'']||messages.callback}</p>
  {reason==='workspace'&&<p><a href="/auth/callback?retry=1">Retry workspace check</a></p>}
  <button disabled={busy} onClick={restart}>{busy?'Signing out…':'Return to login / choose another account'}</button>
  {error&&<p role="alert">{error}</p>}
 </main>;
}
export default function AuthErrorPage(){return <Suspense fallback={<p>Loading sign-in status…</p>}><AuthError/></Suspense>;}
