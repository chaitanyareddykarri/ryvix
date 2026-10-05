'use client';
import {useCallback,useEffect,useState,useRef} from 'react';
import Link from 'next/link';
type Operation={id:string;hostname:string;service:string;status:string;requested_by:string;expires_at:string;result?:{status:string;serviceState:string}};
export default function OperationsPage(){
  const selectionLoaded=useRef(false);
  const [operations,setOperations]=useState<Operation[]>([]),[servers,setServers]=useState<Array<{id:string;hostname:string}>>([]);
  const [services,setServices]=useState<string[]>([]),[server,setServer]=useState(''),[service,setService]=useState('');
  const [user,setUser]=useState(''),[configured,setConfigured]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    const read=async(path:string)=>{const r=await fetch(path,{signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'Operations unavailable');return data;};
    const [commands,hosts]=await Promise.all([read('/api/servers/commands'),read('/api/servers')]);
    if(signal?.aborted)return;
    setOperations(commands.commands);setServices(commands.services);setUser(commands.userId);setConfigured(commands.configured);setServers(hosts.servers);
    if(!selectionLoaded.current){const params=new URLSearchParams(window.location.search);
      const selected=params.get('server'),unit=params.get('service');
      if(hosts.servers.some((s:{id:string})=>s.id===selected))setServer(selected!);
      if(commands.services.includes(unit))setService(unit!);
      selectionLoaded.current=true;
    }
  },[]);
  useEffect(()=>{const abort=new AbortController();const update=()=>void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});update();const timer=setInterval(update,10000);return()=>{abort.abort();clearInterval(timer);};},[refresh]);
  async function mutate(body:unknown){setBusy(true);setError('');try{
    const response=await fetch('/api/servers/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Operation unavailable');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Operation unavailable');}finally{setBusy(false);}}
  return <main style={{maxWidth:960,margin:'auto',padding:32,color:'#e5e7eb'}}>
    <Link href="/servers">Back to servers</Link> · <Link href="/recovery">Cloud recovery approvals</Link><h1>Server operation approvals</h1>
    <p>Request one restart of an allowed service. A different owner or administrator must approve it within ten minutes.</p>
    {!configured&&<p>Service restart delivery is not configured.</p>}{error&&<p role="alert">{error}</p>}
    <select aria-label="Server" disabled={busy} value={server} onChange={e=>setServer(e.target.value)}><option value="">Select server</option>{servers.map(s=><option key={s.id} value={s.id}>{s.hostname}</option>)}</select>
    <select aria-label="Service" disabled={busy} value={service} onChange={e=>setService(e.target.value)}><option value="">Select service</option>{services.map(s=><option key={s}>{s}</option>)}</select>
    <button disabled={busy||!configured||!server||!service} onClick={()=>void mutate({action:'request',serverId:server,service})}>Request restart approval</button>
    <h2>Requests and measured outcomes</h2><p>A successful result confirms that the agent measured the service as active after restart. Application health requires its own health check.</p>
    {!operations.length&&<p>No operation requests.</p>}
    {operations.map(op=><article key={op.id} style={{border:'1px solid #475569',padding:16,marginTop:12}}>
      <p>{op.hostname} · {op.service} · {['pending','approved'].includes(op.status)&&Date.parse(op.expires_at)<=Date.now()?'expired':op.status}</p>
      {op.result&&<p>Measured service state: {op.result.serviceState}</p>}
      {op.status==='delivered'&&<p>Awaiting a signed execution receipt. Do not assume the restart completed.</p>}
      {op.status==='pending'&&Date.parse(op.expires_at)>Date.now()&&<><button disabled={busy||op.requested_by===user} onClick={()=>void mutate({action:'approve',id:op.id})}>Approve this service restart</button><button disabled={busy||op.requested_by===user} onClick={()=>void mutate({action:'reject',id:op.id})}>Reject</button></>}
    </article>)}
  </main>;
}
