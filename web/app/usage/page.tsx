'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function UsagePage(){const [rows,setRows]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{const a=new AbortController();void fetch('/api/chat/usage',{signal:a.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Usage unavailable');setRows(d.attempts);}).catch(e=>{if(!a.signal.aborted)setError(e.message);});return()=>a.abort();},[]);
 return <main style={{maxWidth:960,margin:'auto',padding:24}}><Link href="/chat">Chat</Link><h1>Your AI usage attempts</h1>
 <p>Recent web chat, WhatsApp assistant and Gmail drafting attempts. Started without completion means an unknown outcome. Failed or cancelled usage may be partial. These figures are not provider invoices or total account spending.</p>
 {error&&<p role="alert">{error}</p>}{!rows.length&&!error&&<p>No attempts recorded.</p>}
 {rows.map(r=><article key={r.id} style={{border:'1px solid #64748b',padding:16,marginTop:12,overflowWrap:'anywhere'}}><p>{r.channel} · {r.provider} / {r.model}</p><p>{r.status} · {new Date(r.created_at).toLocaleString()}</p>
 <p>Input tokens: {r.usage?.promptTokens??'Unknown'} · Output tokens: {r.usage?.completionTokens??'Unknown'}</p>
 {r.usage?.costEstimate&&<p>Configured-rate estimate: {r.usage.costEstimate.amount} {r.usage.costEstimate.currency} ({r.usage.costEstimate.rateVersion})</p>}
 {r.usage?.coverage&&<p>{r.usage.coverage}</p>}</article>)}</main>;
}
