'use client';
import {useEffect,useState} from 'react';
import type {RepositoryAnalysisResult} from '@/utils/repository-analyzer';
export default function RepositoryInspection(){
 const [repos,setRepos]=useState<any[]>([]),[selected,setSelected]=useState(''),[analysis,setAnalysis]=useState<RepositoryAnalysisResult|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const c=new AbortController();void fetch('/api/github/repositories/connect',{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok||!Array.isArray(d.repositories))throw new Error(d.error||'Repositories unavailable.');if(!c.signal.aborted)setRepos(d.repositories);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 async function inspect(){const repo=repos.find(r=>r.id===selected);if(!repo||busy)return;setBusy(true);setError('');setAnalysis(null);
  try{const [owner,name]=repo.full_name.split('/');const query=new URLSearchParams({owner,repo:name,branch:repo.default_branch||'main'});const response=await fetch('/api/github/repositories/analyze?'+query,{cache:'no-store'}),data=await response.json();if(!response.ok||!data.success||!data.analysis)throw new Error(data.error||'Repository analysis unavailable.');setAnalysis(data.analysis);}catch(e){setError(e instanceof Error?e.message:'Repository analysis unavailable.');}finally{setBusy(false);}
 }
 return <main style={{maxWidth:900,margin:'auto',padding:24}}><h1>Repository inspection</h1><p>Inspect a connected repository using its manifests and bounded file listing. Detected commands are suggestions; this view does not execute them or establish build success.</p>
  {error&&<p role="alert">{error}</p>}<form onSubmit={e=>{e.preventDefault();void inspect();}}><label>Repository<select value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setAnalysis(null);}} required><option value="">Select repository</option>{repos.map(r=><option key={r.id} value={r.id}>{r.full_name}</option>)}</select></label><button disabled={busy||!selected}>{busy?'Inspecting…':'Inspect repository'}</button></form>
  {analysis&&<article><h2>{analysis.displayName}</h2><dl>{[['Language',analysis.language],['Framework',analysis.framework],['Package manager',analysis.packageManager],['Files inspected',analysis.filesCount],['Entry point',analysis.entryPoint||'Unknown'],['Suggested build command',analysis.buildCommand||'Unknown'],['Suggested test command',analysis.testCommand||'Unknown'],['Suggested development command',analysis.devCommand||'Unknown']].map(([label,value])=><div key={label} style={{padding:8,overflowWrap:'anywhere'}}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <h3>Deployment configuration</h3><p>{analysis.deployment.summary}</p><p>Workflow: {analysis.deployment.workflowFile||'Not detected'}</p>
   <h3>File-name security signals</h3><p>{analysis.security.hasPotentialSecrets?analysis.security.warningMessage:'No sensitive filename matched the analyzer rules. This is not a full secret-content scan.'}</p>
  </article>}
 </main>;
}
