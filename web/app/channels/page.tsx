'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
async function read(path:string,signal?:AbortSignal){const response=await fetch(path,{signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;}
export default function ChannelsPage(){
  const [messages,setMessages]=useState<any[]>([]),[connections,setConnections]=useState<any[]>([]),[environments,setEnvironments]=useState<any[]>([]);
  const [repositories,setRepositories]=useState<any[]>([]),[repository,setRepository]=useState(''),[environment,setEnvironment]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[phone,setPhone]=useState(''),[token,setToken]=useState('');
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    const [inbox,config,chats]=await Promise.all([read('/api/channels/inbox',signal),read('/api/connections',signal),read('/api/chat/conversations',signal)]);
    setMessages(inbox.messages);setConnections(config.connections);setEnvironments(config.environments);setRepositories(chats.repositories||[]);
  },[]);
  useEffect(()=>{const abort=new AbortController();void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[refresh]);
  async function mutate(path:string,body:unknown){setBusy(true);setError('');try{
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed');setToken('');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}}
  const field={padding:8,background:'#111827',color:'#e5e7eb',border:'1px solid #475569',borderRadius:6};
  return <main style={{padding:32,maxWidth:1000,margin:'auto',color:'#e5e7eb'}}>
    <Link href="/chat">Back to chat</Link> · <Link href="/channels/alerts">WhatsApp alert delivery</Link> · <Link href="/notifications">Email notifications</Link> · <Link href="/profile/whatsapp">My WhatsApp number</Link> · <Link href="/channels/assistant">WhatsApp assistant</Link><h1>Communication inbox</h1>
    <p>Review incoming messages before creating a coding task. Accepting a message does not approve a pull request or server operation.</p>
    {error&&<p role="alert">{error}</p>}
    <section><h2>Connect a channel</h2>
      <select aria-label="Environment" value={environment} onChange={e=>setEnvironment(e.target.value)} style={field}>
        <option value="">Select environment</option>{environments.map(e=><option key={e.id} value={e.id}>{e.project_name} / {e.name}</option>)}
      </select>{environment&&<a href={`/api/channels/gmail?environmentId=${encodeURIComponent(environment)}`} style={{margin:16}}>Connect Gmail</a>}
      <p>WhatsApp requires an administrator and a configured Meta app.</p>
      <input aria-label="WhatsApp phone number ID" placeholder="Phone number ID" value={phone} onChange={e=>setPhone(e.target.value)} style={field}/>
      <input aria-label="WhatsApp access token" type="password" autoComplete="off" placeholder="Access token" value={token} onChange={e=>setToken(e.target.value)} style={field}/>
      <button disabled={busy||!environment||!phone||!token} onClick={()=>void mutate('/api/channels/whatsapp',{environmentId:environment,phoneId:phone,token})}>Connect WhatsApp</button>
    </section>
    <section><h2>Gmail connections</h2>{connections.filter(c=>c.type==='gmail').map(c=><p key={c.id}>{c.name} <button disabled={busy} onClick={()=>void mutate('/api/channels/gmail',{connectorId:c.id})}>Check new messages</button></p>)}</section>
    <section><h2>Task proposals</h2>
      <select aria-label="Repository for accepted task" value={repository} onChange={e=>setRepository(e.target.value)} style={field}><option value="">Choose repository for acceptance</option>{repositories.map(r=><option key={r.id} value={r.id}>{r.full_name}</option>)}</select>
      {!messages.length&&<p>No messages available.</p>}
      {messages.map(message=><article key={message.id} style={{border:'1px solid #334155',borderRadius:8,padding:16,marginTop:12}}>
        <p>{message.connector_type} · {message.project_name} · Sender: {message.sender} · {message.status}</p><pre style={{whiteSpace:'pre-wrap'}}>{message.content}</pre>
        {message.status==='pending'&&<><button disabled={busy||!repository} onClick={()=>void mutate('/api/channels/inbox',{id:message.id,action:'accept',repositoryId:repository})}>Accept as coding task</button>
          <button disabled={busy} onClick={()=>void mutate('/api/channels/inbox',{id:message.id,action:'reject'})}>Reject</button></>}
      </article>)}
    </section>
  </main>;
}
