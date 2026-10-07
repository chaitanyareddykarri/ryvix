'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Connection={id:string;name:string;project_name:string;phone:string|null;verified_at:string|null};
export default function WhatsAppVerification({initialPhone=''}:{initialPhone?:string}){
  const [connections,setConnections]=useState<Connection[]>([]),[connector,setConnector]=useState(''),[phone,setPhone]=useState(initialPhone),[code,setCode]=useState('');
  const [challenge,setChallenge]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{setPhone(initialPhone);setChallenge('');setCode('');setNotice('');},[initialPhone]);
  async function load(signal?:AbortSignal){
    const response=await fetch('/api/profile/phone',{signal,cache:'no-store'}),data=await response.json();
    if(!response.ok||!Array.isArray(data.connections))throw new Error(data.error||'WhatsApp connections unavailable.');
    if(!signal?.aborted){setConnections(data.connections);setLoaded(true);}
  }
  useEffect(()=>{const c=new AbortController();void load(c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
  async function action(action:'send'|'verify'|'remove'){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/profile/phone',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,connectorId:connector,phone,code,challengeId:challenge})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Request unavailable.');
      if(action==='send'){
        if(typeof data.challengeId!=='string'||!data.challengeId)throw new Error('Verification challenge unavailable.');
        setChallenge(data.challengeId);setCode('');
        setNotice(data.delivery==='accepted'?'Code accepted for delivery. Enter it within ten minutes.':'Delivery is uncertain. If the code arrives, enter it below. Wait one minute before requesting another.');
      }else{
        setChallenge('');setCode('');await load();
        setNotice(action==='verify'?'WhatsApp number verified. Enable assistant and notification preferences separately.':'WhatsApp number unlinked. Your saved profile contact is unchanged.');
      }
    }catch(error){setError(error instanceof Error?error.message:'Request unavailable.');}finally{setBusy(false);}
  }
  const selected=connections.find(c=>c.id===connector);
  return <section className="whatsapp-verification workspace-controls" aria-label="WhatsApp verification">
    <h2>Verify WhatsApp identity</h2>
    <p>Verification links a number to this business connection. Changing your saved contact does not replace an existing verified link.</p>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {!loaded&&!error&&<p role="status">Loading business connections…</p>}
    {loaded&&!connections.length&&<p>Your contact can be saved now. An owner/admin must connect the business WhatsApp account before verification is available.</p>}
    <label>Business connection <select style={{maxWidth:'100%'}} disabled={busy} value={connector} onChange={e=>{setConnector(e.target.value);setChallenge('');setCode('');setNotice('');setError('');}}>
      <option value="">Select connection</option>{connections.map(c=><option key={c.id} value={c.id}>{c.project_name} — {c.name}</option>)}
    </select></label>
    {selected?.phone&&<p>Verified number: {selected.phone} <button disabled={busy} onClick={()=>void action('remove')}>Unlink</button></p>}
    <form onSubmit={e=>{e.preventDefault();void action('send');}}>
      <p><label>Number to verify, with country code <input type="tel" autoComplete="tel" maxLength={32} required disabled={busy} value={phone}
        onChange={e=>{setPhone(e.target.value);setChallenge('');setCode('');setNotice('');}} style={{display:'block',width:'100%',boxSizing:'border-box',fontSize:16,padding:'0.75rem'}}/></label></p>
      <p>Requesting a code authorizes one verification message. It does not opt you into alerts or AI answers.</p>
      <button disabled={busy||!connector}>Send verification code</button>
    </form>
    {challenge&&<form onSubmit={e=>{e.preventDefault();void action('verify');}}>
      <p><label>Six-digit code <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} value={code} onChange={e=>setCode(e.target.value)} style={{maxWidth:'100%',boxSizing:'border-box',fontSize:16}}/></label></p>
      <button disabled={busy}>Verify number</button>
    </form>}
    <p><Link href="/channels/assistant">Assistant preferences</Link>{' · '}<Link href="/channels/alerts">Alert preferences</Link></p>
  </section>;
}
