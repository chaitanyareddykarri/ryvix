'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Alert={id:string;incident_id:string;status:string;created_at:string;provider_message_id?:string};
export default function AlertHistory(){
  const [alerts,setAlerts]=useState<Alert[]>([]),[error,setError]=useState('');
  useEffect(()=>{const abort=new AbortController();const load=async()=>{try{
    const response=await fetch('/api/channels/alerts',{signal:abort.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Alerts unavailable');
    if(!abort.signal.aborted){setAlerts(data.alerts);setError('');}
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Alerts unavailable');}};
    void load();const timer=setInterval(()=>void load(),10000);return()=>{abort.abort();clearInterval(timer);};},[]);
  return <main style={{maxWidth:960,margin:'auto',padding:32}}><Link href="/channels">Channel inbox</Link><h1>WhatsApp P1 alert delivery</h1>
    <p>Accepted means Meta accepted the request. Delivered and read require a signed provider status. Unknown sends require investigation before sending again.</p>
    {error&&<p role="alert">{error}</p>}{!alerts.length&&!error&&<p>No alerts recorded.</p>}
    {alerts.map(a=><article key={a.id} style={{border:'1px solid #64748b',padding:16,marginTop:12}}><p>Incident: {a.incident_id}</p><p>{a.status} · {new Date(a.created_at).toLocaleString()}</p>{a.provider_message_id&&<p>Provider reference: {a.provider_message_id}</p>}</article>)}
  </main>;
}
