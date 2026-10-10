'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import PhoneContactForm from './PhoneContactForm';
import WhatsAppVerification from './WhatsAppVerification';

export default function PhoneOnboarding(){
  const dialog=useRef<HTMLDialogElement>(null);
  const [missing,setMissing]=useState(false),[error,setError]=useState('');
  const [savedPhone,setSavedPhone]=useState('');
  useEffect(()=>{
    const abort=new AbortController();
    void fetch('/api/profile/contact',{signal:abort.signal,cache:'no-store'}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error('Phone details unavailable. Open Phone / WhatsApp to retry.');
      if(!abort.signal.aborted&&!(typeof data.phoneNumber==='string'&&/^\+[1-9]\d{7,14}$/.test(data.phoneNumber))){setMissing(true);dialog.current?.showModal();}
    }).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    return()=>abort.abort();
  },[]);
  return <>
    <Link className="workspace-account-link" href="/profile/whatsapp">Phone / Telegram</Link>
    {error&&<span className="workspace-notice" role="alert">{error}</span>}
    {missing&&<button className="workspace-button" type="button" onClick={()=>dialog.current?.showModal()}>Connect your Telegram</button>}
    <dialog className="phone-onboarding-dialog workspace-controls" ref={dialog} aria-labelledby="phone-onboarding-title">
      <span className="workspace-eyebrow">Your account · Contact details</span>
      <h2 id="phone-onboarding-title">Connect your phone number for Telegram</h2>
      <PhoneContactForm onSaved={phone=>{setMissing(false);setSavedPhone(phone);}}/>
      {savedPhone&&<p style={{marginTop:12,color:'#45d483'}}>Number saved! You can now message @RyvixAiBot on Telegram.</p>}
      <div className="phone-dialog-footer"><a href="https://t.me/RyvixAiBot" target="_blank" rel="noreferrer" className="workspace-account-link">Open @RyvixAiBot on Telegram</a>
      <button type="button" onClick={()=>dialog.current?.close()}>{missing?'Later':'Done'}</button></div>
      {missing&&<p className="workspace-caption">Save your contact number so you can chat and build projects via Telegram.</p>}
    </dialog>
  </>;
}
