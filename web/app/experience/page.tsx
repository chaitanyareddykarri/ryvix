'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

export default function ExperiencePage(){
  const [memories,setMemories]=useState<any[]>([]),[projects,setProjects]=useState<any[]>([]),[project,setProject]=useState('');
  const [responseStats,setResponseStats]=useState<any[]>([]);
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [kind,setKind]=useState('preference'),[content,setContent]=useState(''),[memoryId,setMemoryId]=useState('');
  const [days,setDays]=useState(30),[eventId,setEventId]=useState(''),[lesson,setLesson]=useState(''),[note,setNote]=useState('');
  const [conversations,setConversations]=useState<any[]>([]),[conversation,setConversation]=useState(''),[turns,setTurns]=useState<any[]>([]),[turn,setTurn]=useState(''),[correction,setCorrection]=useState('');
  async function read(url:string,signal?:AbortSignal){const r=await fetch(url,{signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;}
  useEffect(()=>{const abort=new AbortController();void Promise.all([read('/api/experience',abort.signal),read('/api/learning',abort.signal),read('/api/chat/conversations',abort.signal)]).then(([m,p,c])=>{setMemories(m.memories);setResponseStats(m.responseStats);setProjects(p.projects);setConversations(c.conversations);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[]);
  useEffect(()=>{setData(null);setEventId('');if(!project)return;const abort=new AbortController();void read(`/api/experience?projectId=${project}`,abort.signal).then(d=>{setData(d);setDays(d.settings.retention_days);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[project]);
  useEffect(()=>{setTurns([]);setTurn('');if(!conversation)return;const abort=new AbortController();void read(`/api/chat/conversations?id=${conversation}`,abort.signal).then(d=>setTurns(d.turns)).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[conversation]);
  async function mutate(body:any,personal=false){setBusy(true);setError('');try{
    const r=await fetch(`/api/experience${personal?'':`?projectId=${project}`}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');
    if(personal){setMemories((await read('/api/experience')).memories);setContent('');setMemoryId('');}else setData(await read(`/api/experience?projectId=${project}`));
  }catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}}
  const field={background:'#111827',color:'#e5e7eb',padding:8,border:'1px solid #64748b',borderRadius:5};
  return <main style={{maxWidth:1000,margin:'auto',padding:28,color:'#e5e7eb'}}><Link href="/chat">Chat</Link>{' · '}<Link href="/learning">Reviewed classifier</Link>
    <h1>Memory and experience</h1><p>Help Ryvix remember your preferences and reuse independently reviewed lessons. Saving experience does not retrain your external AI model or authorize actions.</p>
    {error&&<p role="alert">{error}</p>}
    <h2>Your personal memory</h2><p>Visible only to your account in this organization. Memories are supplied as context for chat, expire after the selected period, and can be edited or forgotten. Forgetting removes this memory, not past conversation messages.</p>
    <select style={field} aria-label="Memory kind" value={kind} onChange={e=>setKind(e.target.value)}>{['preference','goal','constraint','correction'].map(k=><option key={k}>{k}</option>)}</select>
    <textarea style={{...field,width:'100%'}} maxLength={1000} aria-label="Personal memory" value={content} onChange={e=>setContent(e.target.value)} placeholder="For example: explain changes briefly and use TypeScript."/>
    <button disabled={busy||content.trim().length<3} onClick={()=>void mutate({action:'remember',kind,content,id:memoryId||undefined,days:30},true)}>{memoryId?'Update':'Remember'} for 30 days</button>
    {memories.map(m=><article key={m.id}><p>{m.kind}: {m.content}</p><small>Expires {new Date(m.expires_at).toLocaleDateString()}</small>{' '}
      <button disabled={busy} onClick={()=>{setMemoryId(m.id);setKind(m.kind);setContent(m.content);}}>Edit</button>{' '}
      <button disabled={busy} onClick={()=>void mutate({action:'forget',id:m.id},true)}>Forget</button></article>)}
    <h2>Your measured chat responses</h2><p>Recorded successful responses over the last seven days. Latency does not measure answer correctness and excludes interrupted responses.</p>{responseStats.length?<pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(responseStats,null,2)}</pre>:<p>No response measurements yet.</p>}
    <h2>Project experience</h2><select style={field} aria-label="Project" value={project} disabled={busy} onChange={e=>setProject(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {project&&data&&<><p>Collection: {data.settings.enabled?'enabled':'disabled'}. Only owners/admins can change collection or review lessons. Structured outcomes are shared with authorized project developers. Raw logs and credentials are excluded.</p>
      <label>Retention days <input style={field} type="number" min={7} max={90} value={days} onChange={e=>setDays(Number(e.target.value))}/></label>{' '}
      <button disabled={busy} onClick={()=>void mutate({action:'configure',enabled:true,days})}>Enable / update retention</button>{' '}
      <button disabled={busy||!data.settings.enabled} onClick={()=>void mutate({action:'configure',enabled:false,days})}>Disable and erase collected experience</button>
      <h2>Correct a saved chat answer</h2><p>Submitting explicitly shares the selected question, answer and your correction with this project&apos;s reviewers. A correction remains unverified until independent review.</p>
      <select style={field} aria-label="Conversation" value={conversation} onChange={e=>setConversation(e.target.value)}><option value="">Select conversation</option>{conversations.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <select style={field} aria-label="Saved turn" value={turn} onChange={e=>setTurn(e.target.value)}><option value="">Select answer</option>{turns.map(t=><option key={t.id} value={t.id}>{t.question.slice(0,100)}</option>)}</select>
      {turn&&<blockquote style={{whiteSpace:'pre-wrap'}}>{turns.find(t=>t.id===turn)?.answer}</blockquote>}
      <textarea style={{...field,width:'100%'}} aria-label="Correction and evidence" maxLength={2000} value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="What was wrong, and what evidence supports the correction?"/>
      <button disabled={busy||!data.settings.enabled||!turn||correction.trim().length<20} onClick={()=>void mutate({action:'feedback',conversationId:conversation,turnId:turn,correction})}>Share correction for review</button>
      <h2>Collected evidence</h2><p>The operations worker collects bounded outcomes after opt-in. No records means no evidence, not perfect performance.</p>
      {data.events.map((e:any)=><details key={e.id}><summary>{e.kind} · {new Date(e.observed_at).toLocaleString()}</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(e.evidence,null,2)}</pre><button disabled={busy} onClick={()=>setEventId(e.id)}>Use as lesson evidence</button></details>)}
      <p>Selected evidence: {eventId||'none'}</p><textarea style={{...field,width:'100%'}} aria-label="Proposed lesson" maxLength={2000} value={lesson} onChange={e=>setLesson(e.target.value)} placeholder="Explain the reusable lesson, when it applies, and its limitations."/>
      <button disabled={busy||!eventId||lesson.trim().length<20} onClick={()=>void mutate({action:'propose',eventId,content:lesson})}>Propose lesson</button>
      <h2>Independent review</h2><textarea style={{...field,width:'100%'}} aria-label="Review evidence" value={note} onChange={e=>setNote(e.target.value)} placeholder="Explain how you independently verified the lesson."/>
      {data.lessons.map((l:any)=><article key={l.id}><p>{l.content}</p><small>{l.status} · expires {new Date(l.expires_at).toLocaleDateString()}</small>{l.status==='pending'&&<><button disabled={busy||note.trim().length<20} onClick={()=>void mutate({action:'review',id:l.id,approve:true,note})}>Approve</button><button disabled={busy||note.trim().length<20} onClick={()=>void mutate({action:'review',id:l.id,approve:false,note})}>Reject</button></>}{l.status==='approved'&&<button disabled={busy} onClick={()=>void mutate({action:'revoke',id:l.id})}>Revoke lesson</button>}</article>)}
      <h2>Outcome monitoring</h2><p>Current versus previous seven days. These are outcome counts, not model accuracy; workload changes can explain differences. Unknown results are not successes.</p><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(data.outcomes,null,2)}</pre>{data.outcomesTruncated&&<p>Results limited to the latest 10,000 events.</p>}
      <h2>Classifier observation mode</h2><p>The active reviewed classifier can classify collected metric summaries without executing actions. Counts show predictions, not confirmed attacks or accuracy. Metrics alone cannot identify every attack.</p>{!data.shadow.length?<p>No recorded predictions. An active reviewed checkpoint, collected metrics and a running worker are required.</p>:<pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(data.shadow,null,2)}</pre>}
    </>}
  </main>;
}
