'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function LearningPage(){
  const [projects,setProjects]=useState<any[]>([]),[labels,setLabels]=useState<string[]>([]),[project,setProject]=useState(''),[user,setUser]=useState('');
  const [examples,setExamples]=useState<any[]>([]),[checkpoints,setCheckpoints]=useState<any[]>([]);
  const [label,setLabel]=useState(''),[partition,setPartition]=useState('train'),[event,setEvent]=useState('{}'),[provenance,setProvenance]=useState(''),[note,setNote]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const endpoint=`/api/learning?projectId=${encodeURIComponent(project)}`;
  async function read(path:string,signal?:AbortSignal){const response=await fetch(path,{signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Learning unavailable');return data;}
  useEffect(()=>{const abort=new AbortController();void read('/api/learning',abort.signal).then(data=>{setProjects(data.projects);setLabels(data.labels);setUser(data.userId);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[]);
  useEffect(()=>{setExamples([]);setCheckpoints([]);if(!project)return;const abort=new AbortController();void read(endpoint,abort.signal).then(data=>{setExamples(data.examples);setCheckpoints(data.checkpoints);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[project,endpoint]);
  async function mutate(body:any){setBusy(true);setError('');try{
    if(body.action==='submit')body.event=JSON.parse(event);
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Learning request failed');
    const refreshed=await read(endpoint);setExamples(refreshed.examples);setCheckpoints(refreshed.checkpoints);
  }catch(e){setError(e instanceof Error?e.message:'Invalid request');}finally{setBusy(false);}}
  const field={background:'#111827',color:'#e5e7eb',padding:8,border:'1px solid #475569',borderRadius:6};
  return <main style={{maxWidth:1000,margin:'auto',padding:32,color:'#e5e7eb'}}><Link href="/chat">Back to chat</Link>{' · '}<Link href="/learning/external">External AI training data</Link><h1>Reviewed learning</h1>
    <p>Submit real labeled observations with their source. Another owner or administrator must verify the label and provenance. Chat conversations do not automatically train a model. <Link href="/experience">Review collected experience and personal memory</Link>.</p>
    {error&&<p role="alert">{error}</p>}
    <select aria-label="Project" value={project} onChange={e=>setProject(e.target.value)} style={field}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {project&&<><h2>Submit an example</h2>
      <select aria-label="Correct label" value={label} onChange={e=>setLabel(e.target.value)} style={field}><option value="">Correct label</option>{labels.map(value=><option key={value}>{value}</option>)}</select>
      <select aria-label="Dataset partition" value={partition} onChange={e=>setPartition(e.target.value)} style={field}>{['train','validation','test'].map(value=><option key={value}>{value}</option>)}</select>
      <p>Keep validation and test observations separate from training. Duplicate model features cannot be submitted into another partition.</p>
      <textarea aria-label="Observed telemetry JSON" value={event} onChange={e=>setEvent(e.target.value)} rows={6} style={{...field,width:'100%'}}/>
      <textarea aria-label="Source and label provenance" placeholder="Where did this observation come from, how was the label verified, and was it previously used for training?" value={provenance} onChange={e=>setProvenance(e.target.value)} rows={3} style={{...field,width:'100%'}}/>
      <button disabled={busy||!label||provenance.trim().length<20} onClick={()=>void mutate({action:'submit',label,partition,provenance})}>Submit for review</button>
      <h2>Review examples</h2><textarea aria-label="Review explanation" placeholder="Explain your independent label and provenance review" value={note} onChange={e=>setNote(e.target.value)} style={{...field,width:'100%'}}/>
      {examples.map(example=><article key={example.id} style={{border:'1px solid #334155',padding:12,marginTop:12}}><p>{example.label} · {example.partition} · {example.status}</p><p>{example.provenance}</p><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(example.event,null,2)}</pre>
        {example.status==='pending'&&<><button disabled={busy||example.submitted_by===user||note.trim().length<20} onClick={()=>void mutate({action:'approve',id:example.id,note})}>Approve example</button><button disabled={busy||example.submitted_by===user||note.trim().length<20} onClick={()=>void mutate({action:'reject',id:example.id,note})}>Reject example</button></>}
      </article>)}
      <h2>Classifier checkpoints</h2><p>The training worker evaluates approved examples. Passing dataset checks permits review; it does not establish general production accuracy. Promotion changes only this project&apos;s classifier.</p>
      {!checkpoints.length&&<p>No evaluated checkpoints available.</p>}
      {checkpoints.map(checkpoint=><article key={checkpoint.id}><p>{checkpoint.id} · {checkpoint.active?'Active':checkpoint.eligible?'Eligible for review':'Evaluation gates failed'}</p><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(checkpoint.metrics,null,2)}</pre>
        <button disabled={busy||!checkpoint.eligible||checkpoint.active} onClick={()=>void mutate({action:'promote',id:checkpoint.id})}>Promote checkpoint</button></article>)}
      <button disabled={busy||!checkpoints.some(c=>c.active)} onClick={()=>void mutate({action:'rollback'})}>Restore previous checkpoint</button>
    </>}
  </main>;
}
