'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Connection={id:string;name:string;project_name:string;phone:string|null;verified_at:string|null};
export default function WhatsAppProfile(){
  const [connections,setConnections]=useState<Connection[]>([]),[connector,setConnector]=useState(''),[phone,setPhone]=useState(''),[code,setCode]=useState('');
  const [challenge,setChallenge]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function load(signal?:AbortSignal){const r=await fetch('/api/profile/phone',{signal,cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error);setConnections(d.connections);}
  useEffect(()=>{const c=new AbortController();void load(c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
  async function action(action:string){setBusy(true);setError('');setNotice('');try{
    const r=await fetch('/api/profile/phone',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,connectorId:connector,phone,code,challengeId:challenge})}),d=await r.json();
    if(!r.ok)throw new Error(d.error||'Request unavailable');
    if(action==='send'){setChallenge(d.challengeId);setCode('');setNotice(d.delivery==='accepted'?'Code accepted by WhatsApp for delivery. Enter it below within ten minutes.':'Delivery is uncertain. If you receive the code, enter it below. Wait one minute before requesting another.');}
    else{setChallenge('');setCode('');setNotice(action==='verify'?'Number linked. Incoming messages can now be attributed to your account.':'Number unlinked.');await load();}
  }catch(e){setError(e instanceof Error?e.message:'Request unavailable');}finally{setBusy(false);}}
  const selected=connections.find(c=>c.id===connector);
  return <main style={{maxWidth:650,margin:'auto',padding:30,color:'#e5e7eb'}}><Link href="/channels">Channels</Link>{' · '}<Link href="/chat">Chat</Link> · <Link href="/channels/assistant">Assistant settings</Link><h1>Connect your WhatsApp</h1>
    <p>Verify a personal number for this organization’s business connection. Your existing permissions still apply. After verification, enable the assistant separately to receive answers and confirm coding requests.</p>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <label>Business connection <select disabled={busy} value={connector} onChange={e=>{setConnector(e.target.value);setChallenge('');setCode('');setNotice('');}}><option value="">Select connection</option>{connections.map(c=><option key={c.id} value={c.id}>{c.project_name} — {c.name}</option>)}</select></label>
    {!connections.length&&<p>An owner/admin must connect the business WhatsApp account first.</p>}
    {selected?.phone&&<p>Verified number: {selected.phone} <button disabled={busy} onClick={()=>void action('remove')}>Unlink</button></p>}
    <form onSubmit={e=>{e.preventDefault();void action('send');}}><p><label>Your number, with country code <input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91…" maxLength={32} required disabled={busy}/></label></p>
      <p>Requesting a code authorizes one verification message to this number. It does not opt you into alerts.</p><button disabled={busy||!connector}>Send verification code</button></form>
    {challenge&&<form onSubmit={e=>{e.preventDefault();void action('verify');}}><p><label>Six-digit code <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required disabled={busy}/></label></p><button disabled={busy}>Verify number</button></form>}
  </main>;
}
