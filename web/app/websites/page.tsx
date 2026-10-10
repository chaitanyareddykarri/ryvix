"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";

type Connection={id:string;name:string;type:string;status:string;environment_id:string;last_heartbeat_at?:string|null};
type Environment={id:string;name:string;project_name:string};
type Measurement={url:string;at:string;statusCode?:number;latencyMs:number;error?:string};

export default function WebsiteChecksPage(){
  const [url,setUrl]=useState('');
  const [measurement,setMeasurement]=useState<Measurement|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [environments,setEnvironments]=useState<Environment[]>([]);
  const [environment,setEnvironment]=useState('');
  const [connectorError,setConnectorError]=useState('');
  const [loading,setLoading]=useState(true);
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/connections',{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json();
      if(!response.ok||!Array.isArray(data.connections)||!Array.isArray(data.environments))throw Error(data.error||'Connections unavailable.');
      setConnections(data.connections);setEnvironments(data.environments);
    }).catch(e=>{if(!controller.signal.aborted)setConnectorError(e.message||'Connections unavailable.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>{controller.abort();pending.current?.abort();};
  },[]);
  async function check(){
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    const target=url.trim();setBusy(true);setError('');setMeasurement(null);
    try{
      const response=await fetch('/api/monitoring/probe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetUrl:target}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok||!data.success||!data.probe||!Number.isFinite(data.probe.latencyMs))throw Error(data.error||'Website check unavailable.');
      if(!controller.signal.aborted)setMeasurement({url:target,at:new Date().toLocaleString(),statusCode:data.probe.statusCode,latencyMs:data.probe.latencyMs,error:data.probe.error});
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Website check unavailable.');}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <main style={{maxWidth:1000,margin:'0 auto',padding:'2rem 1rem'}}>
    <Link href="/dashboard">Dashboard</Link> · <Link href="/servers">Servers</Link>
    <h1>Website checks and connectors</h1>
    <p>Check a deployed public website and inspect your saved environment connections.</p>
    <p>Want sample metrics instead? <Link href="/servers/demo">Generate simulated metrics for a website URL</Link>.</p>
    <form onSubmit={event=>{event.preventDefault();void check();}}>
      <label htmlFor="website-url">Deployed website URL</label>
      <input id="website-url" type="url" required maxLength={2048} placeholder="https://your-website.com" value={url} onChange={event=>{pending.current?.abort();setBusy(false);setUrl(event.target.value);setMeasurement(null);setError('');}} style={{display:'block',width:'100%',marginBlock:12}} />
      <button className="btn-primary" disabled={busy||!url.trim()}>{busy?'Checking website…':'Check website'}</button>
    </form>
    {error&&<p role="alert">{error}</p>}
    {measurement&&<section aria-label="Measured website response" style={{marginBlock:20}}>
      <h2>Latest check</h2><p style={{overflowWrap:'anywhere'}}>{measurement.url}</p>
      <dl><dt>HTTP status</dt><dd>{measurement.statusCode??'No HTTP response'}</dd>
        <dt>{measurement.statusCode?'Response time':'Elapsed attempt time'}</dt><dd>{measurement.latencyMs} ms</dd>
        <dt>Checked at</dt><dd>{measurement.at}</dd></dl>
      {measurement.error&&<p>{measurement.error}</p>}
      {measurement.statusCode!==undefined&&measurement.statusCode>=300&&measurement.statusCode<400&&<p>Redirect returned. Enter the destination URL to check it; redirects are not followed.</p>}
    </section>}
    <p>One manual check, not continuous uptime monitoring or a security scan. Response time is measured from the Ryvix backend, not your browser. Checks are not saved.</p>
    <section style={{marginBlock:24}}>
      <h2>Environment connectors</h2>
      <p>Select the environment you want to inspect. A pasted URL does not automatically associate it with these connectors.</p>
      {loading?<p>Loading connections…</p>:connectorError?<p role="alert">{connectorError}</p>:<>
        <label htmlFor="website-environment">Environment</label> <select id="website-environment" value={environment} onChange={event=>setEnvironment(event.target.value)}>
          <option value="">Select an environment</option>
          {environments.map(item=><option key={item.id} value={item.id}>{item.project_name} / {item.name}</option>)}
        </select>
        {!environments.length&&<p>No environments available. Connect a repository or enroll a server to set up your project.</p>}
        {environment&&<ul>{connections.filter(item=>item.environment_id===environment).map(item=><li key={item.id}>
          <strong>{item.name}</strong> — {item.type} · Recorded status: {item.status} · Last heartbeat: {item.last_heartbeat_at?new Date(item.last_heartbeat_at).toLocaleString():'Not recorded'}
        </li>)}</ul>}
        {environment&&!connections.some(item=>item.environment_id===environment)&&<p>No saved connectors in this environment.</p>}
      </>}
      <p>Saved connector status does not prove that its provider is currently reachable.</p>
    </section>
    <h2>Server metrics and security</h2>
    <p>CPU, RAM, disk, processes and private logs cannot be measured from a website URL. Enroll the server agent to view actual telemetry and recorded security events.</p>
    <Link href="/servers">Connect server / view metrics</Link> · <Link href="/observability">View logs and security events</Link> · <Link href="/dashboard">Connect GitHub</Link>
  </main>;
}
