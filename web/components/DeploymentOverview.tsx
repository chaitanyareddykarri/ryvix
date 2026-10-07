'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Target={id:string;full_name:string;provider_environment:string;environment_name:string;endpoint_url:string;observed_at:string|null;reachable:boolean|null;status_code:number|null;commit_sha:string|null;provider_state:string|null};
export default function DeploymentOverview(){
 const [targets,setTargets]=useState<Target[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');
  void fetch('/api/deployments/runtime',{signal:abort.signal,cache:'no-store'}).then(async response=>{
   const data=await response.json();if(!response.ok||!Array.isArray(data.targets))throw new Error(data.error||'Deployment records unavailable.');
   if(!abort.signal.aborted)setTargets(data.targets);
  }).catch(error=>{if(!abort.signal.aborted){setError(error.message);setTargets([]);}}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[refresh]);
 return <section className="deployment-overview"><h2>Deployments</h2>
  <p>Recorded runtime observations for your deployment mappings. Task completion alone does not confirm deployment.</p>
  <p><Link href="/deployments">Manage mappings and runtime checks</Link>{' · '}<Link href="/releases">Release approvals</Link></p>
  <button disabled={loading} onClick={()=>setRefresh(value=>value+1)}>Refresh records</button>
  {loading?<p role="status">Loading deployment records…</p>:error?<p role="alert">{error}</p>:!targets.length?<p>No deployment mappings configured.</p>:targets.map(target=><article key={target.id}>
   <h3>{target.full_name} / {target.provider_environment}</h3><p>Environment: {target.environment_name}</p><p>{target.endpoint_url}</p>
   {target.observed_at?<><p>Observed {new Date(target.observed_at).toLocaleString()}: {target.reachable===true?'Endpoint reachable':target.reachable===false?'Endpoint unreachable':'Reachability unknown'}; HTTP {target.status_code??'unknown'}.</p>
    <p>Provider status: {target.provider_state||'unknown'}. Reported commit: {target.commit_sha||'unknown'}.</p></>:<p>No runtime observation recorded.</p>}
  </article>)}
 </section>;
}
