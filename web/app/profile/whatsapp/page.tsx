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
    <h1>Phone / Telegram</h1>
    <p className="workspace-lead">Manage your contact number and connect with your Ryvix AI bot on Telegram (@RyvixAiBot).</p>
    <div className="phone-profile-grid"><section className="workspace-card">
      <span className="workspace-eyebrow">Step 01 · Profile</span><h2>Profile contact number</h2>
      {error&&<p role="alert">{error}</p>}
      {loaded?<PhoneContactForm initialPhone={contact} onSaved={phone=>{setContact(phone);setError('');}}/>:<p role="status">Loading your contact number…</p>}
    </section><div className="workspace-card"><span className="workspace-eyebrow">Step 02 · Connect Telegram</span>
      <p style={{paddingTop:12}}>Open the Ryvix Telegram Bot and tap <strong>Share Phone Number</strong> (or type your number):</p>
      <a href="https://t.me/RyvixAiBot" target="_blank" rel="noreferrer" className="btn-primary" style={{display:'inline-block',marginTop:12}}>Open @RyvixAiBot</a>
    </div></div>
    <p className="phone-profile-links"><a href="https://t.me/RyvixAiBot" target="_blank" rel="noreferrer">Telegram Bot (@RyvixAiBot)</a><Link href="/chat">Open chat</Link></p>
  </main>;
}
