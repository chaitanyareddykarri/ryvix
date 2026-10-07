'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function ServerTools(){
 const [servers,setServers]=useState<any[]>([]),[server,setServer]=useState(''),[label,setLabel]=useState('ryvix-automation'),[accessType,setAccessType]=useState('SSH_CREDENTIAL'),[errorOutput,setOutput]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[keys,setKeys]=useState<any>(null),[diagnosis,setDiagnosis]=useState<any>(null),[classification,setClassification]=useState<any>(null);
 useEffect(()=>{const c=new AbortController();void fetch('/api/servers',{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok||!Array.isArray(d.servers))throw new Error(d.error||'Servers unavailable.');setServers(d.servers);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 async function run(body:any){setBusy(true);setError('');try{const r=await fetch('/api/servers/tools',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Tool unavailable.');return d;}catch(e){setError(e instanceof Error?e.message:'Tool unavailable.');return null;}finally{setBusy(false);}}
 function download(){if(!keys)return;const url=URL.createObjectURL(new Blob([keys.privateKey],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download='ryvix_ed25519';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <main style={{maxWidth:900,margin:'auto',padding:24}}><Link href="/servers">Servers</Link><h1>Server tools</h1>{error&&<p role="alert">{error}</p>}
  <section><h2>Generate SSH keypair</h2><p>Creates an unencrypted OpenSSH key for you to download. Keep the private key securely. Generating a key does not connect a server or authorize commands.</p>
   <form onSubmit={async e=>{e.preventDefault();setKeys(null);const d=await run({action:'generate_key',label});if(d)setKeys(d);}}><label>Key label <input required maxLength={80} pattern="[A-Za-z0-9_.@\-]+" value={label} onChange={e=>setLabel(e.target.value)}/></label><button disabled={busy}>Generate keypair</button></form>
   {keys&&<div><label>Public key<textarea readOnly value={keys.publicKey} style={{width:'100%'}}/></label><button onClick={download}>Download private key</button><button onClick={()=>setKeys(null)}>Clear keys from this page</button></div>}
  </section>
  <section><h2>Diagnose access error</h2><p>Explains submitted errors; no remote connection is attempted. Remove credentials before pasting.</p><form onSubmit={async e=>{e.preventDefault();setDiagnosis(null);const d=await run({action:'diagnose',accessType,errorOutput});if(d)setDiagnosis(d.diagnosis);}}>
   <label>Access method<select value={accessType} onChange={e=>setAccessType(e.target.value)}><option>SSH_CREDENTIAL</option><option>AGENT_ENROLLMENT</option><option>CLOUD_PROVIDER_API</option></select></label>
   <label>Error text<textarea required maxLength={8000} value={errorOutput} onChange={e=>setOutput(e.target.value)} style={{display:'block',width:'100%'}}/></label><button disabled={busy}>Explain error</button></form>
   {diagnosis&&<div role="status"><p>{diagnosis.diagnosticMessage}</p><p style={{whiteSpace:'pre-wrap'}}>{diagnosis.recommendedUserAction}</p></div>}
  </section>
  <section><h2>Server archetype and modules</h2><p>Classifies recorded hostname and service inventory using rules. Recommendations do not grant execution permissions.</p>
   <form onSubmit={async e=>{e.preventDefault();setClassification(null);const d=await run({action:'classify',serverId:server});if(d)setClassification(d);}}><label>Server<select value={server} onChange={e=>{setServer(e.target.value);setClassification(null);}} required><option value="">Select server</option>{servers.map(s=><option key={s.id} value={s.id}>{s.hostname}</option>)}</select></label><button disabled={busy||!server}>Inspect recorded inventory</button></form>
   {classification&&<article><h3>{classification.features.displayName}</h3><p>{classification.source}</p><p>Last heartbeat: {classification.lastHeartbeat||'Unknown'}</p><p>{classification.features.description}</p><p>Suggested modules: {classification.features.detectedModules?.join(', ')||'None'}</p><p>Recorded services: {classification.services?.map((s:any)=>s.name).join(', ')||'None recorded'}</p><h4>Diagnostic suggestions (not executed)</h4><ul>{classification.features.diagnosticCommands?.map((s:string)=><li key={s}><code>{s}</code></li>)}</ul></article>}
  </section>
 </main>;
}
