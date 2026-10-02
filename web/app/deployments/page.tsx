'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
export default function DeploymentsPage(){
 const [targets,setTargets]=useState<any[]>([]),[repos,setRepos]=useState<any[]>([]),[environments,setEnvironments]=useState<any[]>([]);
 const [repositoryId,setRepository]=useState(''),[environmentId,setEnvironment]=useState(''),[providerEnvironment,setProviderEnvironment]=useState(''),[endpointUrl,setEndpoint]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const read=async(path:string)=>{const r=await fetch(path,{signal}),data=await r.json();if(!r.ok)throw new Error(data.error||'Deployment data unavailable');return data;};
  const [runtime,chats,connections]=await Promise.all([read('/api/deployments/runtime'),read('/api/chat/conversations'),read('/api/connections')]);
  if(signal?.aborted)return;setTargets(runtime.targets);setRepos(chats.repositories||[]);setEnvironments(connections.environments);
 },[]);
 useEffect(()=>{const abort=new AbortController();void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[refresh]);
 async function mutate(body:unknown){setBusy(true);setError('');try{
  const r=await fetch('/api/deployments/runtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await r.json();if(!r.ok)throw new Error(data.error||'Deployment check unavailable');await refresh();
 }catch(e){setError(e instanceof Error?e.message:'Deployment check unavailable');}finally{setBusy(false);}}
 return <main style={{maxWidth:960,margin:'auto',padding:32,color:'#e5e7eb'}}><Link href="/chat">Back to chat</Link> · <Link href="/releases">Approve release</Link> · <Link href="/notifications">Deployment emails</Link><h1>Deployment runtime checks</h1>
  <p>Map a GitHub deployment environment to its public health endpoint. Checks measure reachability after a received deployment event; they do not prove which commit is running.</p>
  {error&&<p role="alert">{error}</p>}
  <select aria-label="Repository" value={repositoryId} onChange={e=>setRepository(e.target.value)}><option value="">Select repository</option>{repos.map(r=><option key={r.id} value={r.id}>{r.full_name}</option>)}</select>
  <select aria-label="Environment" value={environmentId} onChange={e=>setEnvironment(e.target.value)}><option value="">Select environment</option>{environments.map(e=><option key={e.id} value={e.id}>{e.project_name} / {e.name}</option>)}</select>
  <input aria-label="GitHub deployment environment" placeholder="GitHub environment name" value={providerEnvironment} onChange={e=>setProviderEnvironment(e.target.value)}/>
  <input aria-label="Public health endpoint" placeholder="https://app.example.com/health" value={endpointUrl} onChange={e=>setEndpoint(e.target.value)}/>
  <button disabled={busy||!repositoryId||!environmentId||!providerEnvironment||!endpointUrl} onClick={()=>void mutate({action:'configure',repositoryId,environmentId,providerEnvironment,endpointUrl})}>Save endpoint mapping</button>
  {targets.map(t=><article key={t.id} style={{border:'1px solid #475569',padding:16,marginTop:16}}>
   <p>{t.full_name} · GitHub: {t.provider_environment} · Ryvix: {t.environment_name}</p><p>{t.endpoint_url}</p>
   {t.observed_at?<p>Observed {new Date(t.observed_at).toLocaleString()}: {t.reachable?'endpoint reachable':'endpoint unreachable'} · HTTP {t.status_code??'unavailable'} · Provider status: {t.provider_state} · Commit reported by GitHub: {t.commit_sha}</p>:<p>No runtime observation recorded for this mapping.</p>}
   <button disabled={busy} onClick={()=>void mutate({action:'check',id:t.id})}>Check endpoint after latest event</button>
  </article>)}
 </main>;
}
