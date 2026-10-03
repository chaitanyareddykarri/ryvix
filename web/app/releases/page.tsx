'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
export default function Releases(){
  const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const refresh=useCallback(async(signal?:AbortSignal)=>{const r=await fetch('/api/releases',{signal}),d=await r.json();if(!r.ok)throw new Error(d.error||'Releases unavailable');if(!signal?.aborted){const task=new URLSearchParams(window.location.search).get('task');setRows(task?d.releases.filter((r:any)=>r.task_id===task):d.releases);}},[]);
  useEffect(()=>{const abort=new AbortController();void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[refresh]);
  async function mutate(r:any,action:string){setBusy(true);setError('');try{const response=await fetch('/api/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,taskId:r.task_id,targetId:r.target_id,headSha:r.commit_sha,targetVersion:r.target_version})});const d=await response.json();if(!response.ok)throw new Error(d.error||'Release unavailable');await refresh();}catch(e){setError(e instanceof Error?e.message:'Release unavailable');}finally{setBusy(false);}}
  return <main style={{maxWidth:960,margin:'auto',padding:32}}><Link href="/tasks">Tasks and previews</Link> · <Link href="/deployments">Deployment results</Link> · <Link href="/notifications">Email preferences</Link><h1>Approve a release</h1>
    <p>After reviewing the preview and PR, approve the displayed commit for merge. This can start your existing deployment pipeline. GitHub branch protection and checks must allow the merge. A merge alone does not confirm deployment.</p>
    <p>Configure the repository&apos;s deployment environment on the deployment page first. Production must deploy from this protected base branch, not automatically from an unapproved PR preview.</p>
    <p>Merging can start every environment configured in your repository pipeline. The selected mapping determines which deployment result Ryvix tracks for this release.</p>
    {error&&<p role="alert">{error}</p>}{!rows.length&&<p>No approved tasks with deployment mappings are available.</p>}
    {rows.map(r=><section key={`${r.task_id}:${r.target_id}`} style={{border:'1px solid #64748b',padding:16,marginTop:12}}><p>{r.full_name} → {r.environment_name} ({r.provider_environment})</p><p>Reviewed commit: {r.commit_sha}</p><a href={r.html_url} target="_blank" rel="noreferrer">Review PR</a><p>{r.status||'Awaiting explicit release approval'}</p>
      {(!r.status||r.status==='approved')&&<button disabled={busy} onClick={()=>void mutate(r,'approve')}>Approve merge and start existing deployment pipeline</button>}
      {['unknown','dispatching'].includes(r.status)&&<button disabled={busy} onClick={()=>void mutate(r,'reconcile')}>Check GitHub outcome without merging again</button>}
      {r.merge_sha&&<p>Merged commit: {r.merge_sha}. Awaiting provider deployment evidence.</p>}
    </section>)}
  </main>;
}
