'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function ExternalTrainingPage(){
  const [projects,setProjects]=useState<any[]>([]),[project,setProject]=useState(''),[user,setUser]=useState(''),[examples,setExamples]=useState<any[]>([]);
  const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[provenance,setProvenance]=useState(''),[group,setGroup]=useState(''),[partition,setPartition]=useState('train'),[consent,setConsent]=useState(false);
  const [note,setNote]=useState(''),[provider,setProvider]=useState(''),[model,setModel]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function read(url:string,signal?:AbortSignal){const r=await fetch(url,{signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Dataset unavailable');return d;}
  useEffect(()=>{const a=new AbortController();void read('/api/learning',a.signal).then(d=>{setProjects(d.projects);setUser(d.userId);}).catch(e=>{if(!a.signal.aborted)setError(e.message);});return()=>a.abort();},[]);
  useEffect(()=>{setExamples([]);if(!project)return;const a=new AbortController();void read(`/api/learning/external?projectId=${project}`,a.signal).then(setExamples).catch(e=>{if(!a.signal.aborted)setError(e.message);});return()=>a.abort();},[project]);
  async function mutate(input:any){setBusy(true);setError('');try{const r=await fetch('/api/learning/external',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,projectId:project})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');
    if(input.action==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='reviewed-training-bundle.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    else setExamples(await read(`/api/learning/external?projectId=${project}`));
  }catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}}
  const field={display:'block',width:'100%',margin:'8px 0',padding:10,color:'#e5e7eb',background:'#111827',border:'1px solid #64748b'};
  return <main style={{maxWidth:960,margin:'auto',padding:32}}><Link href="/learning">Reviewed classifier</Link><h1>Prepare external AI training data</h1>
    <p>Add real examples you have permission to use. A different project administrator must review each one. Preparing or exporting data does not train or replace your AI model.</p>
    {error&&<p role="alert">{error}</p>}
    <select style={field} aria-label="Project" disabled={busy} value={project} onChange={e=>setProject(e.target.value)}><option value="">Choose project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {project&&<><h2>Submit an example</h2>
      <textarea style={field} aria-label="Question" placeholder="Real question" value={question} maxLength={4000} onChange={e=>setQuestion(e.target.value)}/>
      <textarea style={field} aria-label="Reviewed answer" placeholder="Correct answer, supported by evidence" value={answer} maxLength={6000} onChange={e=>setAnswer(e.target.value)}/>
      <textarea style={field} aria-label="Evidence provenance" placeholder="Evidence source and permission to use it" value={provenance} maxLength={2000} onChange={e=>setProvenance(e.target.value)}/>
      <input style={field} aria-label="Evidence group" placeholder="Shared incident or task reference for related examples" value={group} maxLength={200} onChange={e=>setGroup(e.target.value)}/>
      <select style={field} aria-label="Dataset partition" value={partition} onChange={e=>setPartition(e.target.value)}>{['train','validation','test'].map(p=><option key={p}>{p}</option>)}</select>
      <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I have permission to use this content for external model training.</label>
      <p><button disabled={busy||!consent} onClick={()=>void mutate({action:'submit',question,answer,provenance,evidenceGroup:group,partition,externalTrainingConsent:consent})}>Submit for independent review</button></p>
      <h2>Review examples</h2><textarea style={field} aria-label="Review note" placeholder="Explain your review of the evidence and answer" value={note} maxLength={2000} onChange={e=>setNote(e.target.value)}/>
      {!examples.length&&<p>No examples recorded.</p>}
      {examples.map(x=><article key={x.id} style={{border:'1px solid #64748b',padding:16,marginTop:12}}><p>{x.status} · {x.partition} · {x.evidence_group}</p><p>{x.question}</p><p>{x.answer}</p><p>Evidence: {x.provenance}</p>
        {x.status==='pending'&&x.author_id!==user&&<><button disabled={busy||note.trim().length<20} onClick={()=>void mutate({action:'review',id:x.id,approve:true,note})}>Approve example</button>{' '}<button disabled={busy||note.trim().length<20} onClick={()=>void mutate({action:'review',id:x.id,approve:false,note})}>Reject example</button></>}
        {x.status!=='rejected'&&<button disabled={busy} onClick={()=>void mutate({action:'revoke',id:x.id})}>Revoke example</button>}</article>)}
      <h2>Export reviewed data</h2><p>Requires at least 20 training, 5 validation and 5 held-out test examples. Keep test data separate from provider training uploads. Exported files remain your responsibility after revocation.</p>
      <input style={field} aria-label="Intended provider" placeholder="Intended provider" value={provider} maxLength={100} onChange={e=>setProvider(e.target.value)}/>
      <input style={field} aria-label="Intended base model" placeholder="Intended base model" value={model} maxLength={200} onChange={e=>setModel(e.target.value)}/>
      <button disabled={busy||!provider||!model} onClick={()=>void mutate({action:'export',provider,model})}>Download reviewed dataset bundle</button>
      <p>No paid job is submitted. Provider eligibility, evaluation and deployment approval are still required.</p></>}
  </main>;
}
