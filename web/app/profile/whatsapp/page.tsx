'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import PhoneContactForm from '@/components/PhoneContactForm';
import WhatsAppVerification from '@/components/WhatsAppVerification';
export default function WhatsAppProfile(){
  const [contact,setContact]=useState(''),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    void fetch('/api/profile/contact',{signal:controller.signal,cache:'no-store'}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Contact unavailable.');
      if(!controller.signal.aborted){setContact(data.phoneNumber||'');setLoaded(true);}
    }).catch(error=>{if(!controller.signal.aborted){setError(error.message);setLoaded(true);}});
    return()=>controller.abort();
  },[]);
  return <main className="phone-profile-page">
    <span className="workspace-eyebrow">Account settings</span>
    <h1>Phone / WhatsApp</h1>
    <p className="workspace-lead">Manage your contact number and choose how to connect with your workspace on WhatsApp.</p>
    <div className="phone-profile-grid"><section className="workspace-card">
      <span className="workspace-eyebrow">Step 01 · Profile</span><h2>Profile contact number</h2>
      {error&&<p role="alert">{error}</p>}
      {loaded?<PhoneContactForm initialPhone={contact} onSaved={phone=>{setContact(phone);setError('');}}/>:<p role="status">Loading your contact number…</p>}
    </section><div className="workspace-card"><span className="workspace-eyebrow">Step 02 · Optional verification</span>
      {loaded&&<WhatsAppVerification initialPhone={contact}/>}
    </div></div>
    <p className="phone-profile-links"><Link href="/channels">Manage business connections</Link><Link href="/chat">Open chat</Link></p>
  </main>;
}
