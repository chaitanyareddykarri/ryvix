'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function AssistantPage(){
  const [data,setData]=useState<any>({sessions:[],messages:[],deliveries:[],proposals:[]}),[links,setLinks]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function load(signal?:AbortSignal){const responses=await Promise.all([fetch('/api/channels/assistant',{signal}),fetch('/api/profile/phone',{signal})]);const values=await Promise.all(responses.map(r=>r.json()));if(responses.some(r=>!r.ok))throw new Error(values.find(v=>v.error)?.error||'Assistant unavailable');setData(values[0]);setLinks(values[1].connections.filter((c:any)=>c.phone));}
  useEffect(()=>{const abort=new AbortController();void load(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[]);
  async function configure(connectorId:string,enabled:boolean,notifications:boolean){setBusy(true);setError('');try{const r=await fetch('/api/channels/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connectorId,enabled,notifications})});const d=await r.json();if(!r.ok)throw new Error(d.error);await load();}catch(e){setError(e instanceof Error?e.message:'Update failed');}finally{setBusy(false);}}
  return <main style={{maxWidth:950,margin:'auto',padding:30,color:'#e5e7eb'}}><Link href="/channels">Channels</Link>{' · '}<Link href="/profile/whatsapp">Verify your number</Link><h1>WhatsApp assistant</h1>
    <p>Enable answers and confirmed coding requests for a verified connection. Each connection stays within its project. Release and server approvals require signing in. History is retained for up to 30 days by the worker.</p>
    {error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>Refresh</button>
    {!links.length&&<p>Verify a personal WhatsApp number first.</p>}
    {links.map(l=>{const s=data.sessions.find((s:any)=>s.connector_id===l.id);return <section key={l.id}><h2>{l.project_name}</h2><p>{s?.enabled?'Enabled':'Disabled'}</p>
      <button disabled={busy} onClick={()=>void configure(l.id,!s?.enabled,!!s?.notifications)}>{s?.enabled?'Disable assistant':'Enable assistant'}</button>{' '}
      <button disabled={busy||!s?.enabled} onClick={()=>void configure(l.id,true,!s?.notifications)}>{s?.notifications?'Stop task notifications':'Opt into task notifications'}</button></section>;})}
    <h2>Conversation</h2>{data.messages.map((m:any)=><article key={m.id}><p>{m.question}</p><p>{m.answer||m.status}</p><small>{m.provider?`${m.provider} / ${m.model}`:'No model result'} · {m.prompt_tokens??'unknown'} input / {m.completion_tokens??'unknown'} output tokens</small></article>)}
    <h2>Coding confirmations</h2>{data.proposals.map((p:any)=><article key={p.id}><p>{p.prompt}</p><p>{p.status} · expires {new Date(p.expires_at).toLocaleString()}</p>{p.status==='pending'&&<p>In WhatsApp reply <code>CONFIRM {p.id}</code> or <code>REJECT {p.id}</code>.</p>}</article>)}
    <h2>Delivery</h2>{data.deliveries.map((d:any)=><article key={d.id}><p>{d.body}</p><small>{d.status} · {new Date(d.created_at).toLocaleString()}</small></article>)}
  </main>;
}
