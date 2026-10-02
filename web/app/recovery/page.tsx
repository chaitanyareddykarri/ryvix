'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
type Recovery={id:string;hostname:string;provider:string;instance_id:string;status:string;requested_by:string;expires_at:string;provider_action_id?:string;observation?:unknown};
export default function RecoveryPage(){
  const [rows,setRows]=useState<Recovery[]>([]),[servers,setServers]=useState<Array<{id:string;hostname:string}>>([]),[server,setServer]=useState('');
  const [user,setUser]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    const read=async(path:string)=>{const r=await fetch(path,{signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Recovery unavailable');return d;};
    const [r,s]=await Promise.all([read('/api/servers/recovery'),read('/api/servers')]);if(signal?.aborted)return;setRows(r.requests);setUser(r.userId);setServers(s.servers);
  },[]);
  useEffect(()=>{const abort=new AbortController();const update=()=>void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});update();const timer=setInterval(update,10000);return()=>{abort.abort();clearInterval(timer);};},[refresh]);
  async function mutate(body:unknown){setBusy(true);setError('');try{const r=await fetch('/api/servers/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Recovery unavailable');await refresh();}catch(e){setError(e instanceof Error?e.message:'Recovery unavailable');}finally{setBusy(false);}}
  return <main style={{maxWidth:960,margin:'auto',padding:32}}><Link href="/operations">Service operations</Link><h1>Cloud recovery approvals</h1>
    <p>Request one cloud instance reboot. A different owner or administrator must approve within ten minutes. The selected instance may be temporarily unavailable during reboot.</p>
    {error&&<p role="alert">{error}</p>}<select aria-label="Recovery server" value={server} disabled={busy} onChange={e=>setServer(e.target.value)}><option value="">Select server</option>{servers.map(s=><option key={s.id} value={s.id}>{s.hostname}</option>)}</select>
    <button disabled={busy||!server} onClick={()=>void mutate({action:'request',serverId:server})}>Request reboot approval</button>
    <p>Provider acceptance does not confirm recovery. “Observed healthy” means the provider reported running and a fresh agent heartbeat arrived; it does not prove a reboot or application health. Investigate unknown outcomes before another request.</p>
    {rows.map(r=><article key={r.id} style={{border:'1px solid #64748b',padding:16,marginTop:12}}><p>{r.hostname} · {r.provider} · {r.instance_id}</p><p>{['pending','approved'].includes(r.status)&&Date.parse(r.expires_at)<=Date.now()?'expired':r.status}</p>
      {r.provider_action_id&&<p>Provider reference: {r.provider_action_id}</p>}
      {r.status==='pending'&&Date.parse(r.expires_at)>Date.now()&&<><button disabled={busy||user===r.requested_by} onClick={()=>void mutate({action:'approve',id:r.id})}>Approve this instance reboot</button><button disabled={busy||user===r.requested_by} onClick={()=>void mutate({action:'reject',id:r.id})}>Reject</button></>}
    </article>)}</main>;
}
