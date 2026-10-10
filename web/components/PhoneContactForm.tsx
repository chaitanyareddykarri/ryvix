'use client';
import {useState} from 'react';

export default function PhoneContactForm({initialPhone='',onSaved}:{initialPhone?:string;onSaved:(phone:string)=>void}){
  const [phone,setPhone]=useState(initialPhone),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  async function save(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setSaved(false);
    try{
      const response=await fetch('/api/profile/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',phone})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Could not save your number.');
      if(typeof data.phoneNumber!=='string'||!/^\+[1-9]\d{7,14}$/.test(data.phoneNumber))throw new Error('Saved number could not be confirmed.');
      setPhone(data.phoneNumber);setSaved(true);onSaved(data.phoneNumber);
    }catch(error){setError(error instanceof Error?error.message:'Could not save your number.');}
    finally{setBusy(false);}
  }
  return <form className="phone-contact-form workspace-controls" onSubmit={save}>
    <label>Your phone number for Telegram, with country code
      <input type="tel" autoComplete="tel" placeholder="+91 98765 43210" maxLength={32} required disabled={busy}
        value={phone} onChange={e=>{setPhone(e.target.value);setSaved(false);}}/>
    </label>
    <p>Save your contact number to connect with Ryvix AI on Telegram (@RyvixAiBot). After saving, open Telegram to chat and manage your repositories.</p>
    {error&&<p role="alert">{error}</p>}
    {saved&&<p role="status">Contact number saved! Now open @RyvixAiBot on Telegram to connect your account.</p>}
    <button className="btn-primary" disabled={busy}>{busy?'Saving…':'Save phone number'}</button>
  </form>;
}
