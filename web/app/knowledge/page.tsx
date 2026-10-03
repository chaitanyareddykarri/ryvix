'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function KnowledgePage(){
  const [repositories,setRepositories]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(signal?:AbortSignal){const r=await fetch('/api/knowledge',{signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Index unavailable');setRepositories(d.repositories);}
  useEffect(()=>{const abort=new AbortController();void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[]);
  async function configure(repositoryId:string,enabled:boolean){setBusy(true);setError('');try{
    const r=await fetch('/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repositoryId,enabled})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Update failed');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Update failed');}finally{setBusy(false);}}
  return <main style={{maxWidth:950,margin:'auto',padding:30,color:'#e5e7eb'}}><Link href="/chat">Chat</Link>{' · '}<Link href="/experience">Memory and experience</Link><h1>Repository knowledge</h1>
    <p>Owners/admins can enable a private, searchable source snapshot for a connected repository. This stores up to 100 sanitized text files and 1 MiB per repository. It does not execute code or train an external model.</p>
    <p>The worker checks for new commits periodically. General chat cites dated snapshots; selected-repository chat verifies the current commit before using the index. Partial coverage and unavailable snapshots must not be treated as complete current source.</p>
    {error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>Refresh status</button>
    {repositories.map(r=><article key={r.id} style={{border:'1px solid #475569',padding:16,marginTop:16}}><h2>{r.full_name}</h2><p>{r.enabled?r.status:'Disabled'} · {r.file_count||0} files · {r.partial?'Partial coverage':'Within configured bounds'}</p>
      {r.commit_sha&&<p>Commit: <code>{r.commit_sha}</code> · indexed {r.indexed_at?new Date(r.indexed_at).toLocaleString():'not yet'}</p>}
      <button disabled={busy} onClick={()=>void configure(r.id,true)}>{r.enabled?'Queue refresh':'Enable indexing'}</button>{' '}
      <button disabled={busy||!r.enabled} onClick={()=>void configure(r.id,false)}>Disable and erase index</button></article>)}
    {!repositories.length&&<p>No authorized repositories are available. Connect a repository first.</p>}
  </main>;
}
