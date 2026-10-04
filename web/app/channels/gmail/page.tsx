'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function GmailRepliesPage(){
  const [drafts,setDrafts]=useState<any[]>([]),[inbox,setInbox]=useState<any[]>([]),[id,setId]=useState(''),[body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){const [a,b]=await Promise.all([fetch('/api/channels/gmail/replies'),fetch('/api/channels/inbox')]);const [x,y]=await Promise.all([a.json(),b.json()]);if(!a.ok||!b.ok)throw new Error(x.error||y.error||'Unavailable');setDrafts(x);setInbox(y.messages||[]);}
  useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
  async function action(value:unknown){setBusy(true);setError('');try{const r=await fetch('/api/channels/gmail/replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Reply unavailable');await refresh();}catch(e){setError(e instanceof Error?e.message:'Unavailable');}finally{setBusy(false);}}
  return <main style={{maxWidth:900,margin:'auto',padding:32}}><Link href="/channels">Channels</Link><h1>Review Gmail replies</h1>
    <p>Reconnect with reply permission first. Review the exact recipient and text before sending. Incoming email does not authorize project access or actions.</p>
    {error&&<p role="alert">{error}</p>}
    <select aria-label="Incoming email" value={id} onChange={e=>setId(e.target.value)}><option value="">Select email</option>{inbox.filter(m=>m.channel==='gmail'||m.connector_type==='gmail').map(m=><option key={m.id} value={m.id}>{m.sender}: {String(m.content).slice(0,80)}</option>)}</select>
    <textarea aria-label="Reply text" value={body} onChange={e=>setBody(e.target.value)} maxLength={6000} placeholder="Write a reply, or leave blank for an AI draft"/>
    <button disabled={busy||!id} onClick={()=>void action({action:'draft',inboxId:id,...(body.trim()?{body}: {})})}>Create draft for review</button>
    {drafts.map(d=><article key={d.id} style={{border:'1px solid #64748b',padding:16,marginTop:16}}><p>To: {d.recipient}</p><p>{d.subject}</p><pre style={{whiteSpace:'pre-wrap'}}>{d.body}</pre><p>{d.status} · Expires {d.expires_at}</p>
      {d.status==='pending'&&<><button disabled={busy} onClick={()=>void action({action:'decide',id:d.id,approve:true})}>Approve and send this reply</button><button disabled={busy} onClick={()=>void action({action:'decide',id:d.id,approve:false})}>Reject</button></>}</article>)}
    <p>Accepted means Google accepted the message; it does not prove inbox delivery. Unknown sends are never automatically retried.</p>
  </main>;
}
