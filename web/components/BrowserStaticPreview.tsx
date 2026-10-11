"use client";
import {useEffect,useState} from 'react';
import {staticPreviewDocument} from '@/utils/static-preview';
export default function BrowserStaticPreview({taskId}:{taskId:string}) {
  const [html,setHtml]=useState(''),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setHtml('');setError('');
    void fetch(`/api/tasks/${encodeURIComponent(taskId)}/browser-preview`,{signal:controller.signal,cache:'no-store'})
      .then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Preview unavailable.');return data;})
      .then(data=>{if(!controller.signal.aborted)setHtml(staticPreviewDocument(data.files));})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message||'Preview unavailable.');});
    return ()=>controller.abort();
  },[taskId,revision]);
  return <section style={{width:'100%',minWidth:0}} aria-label="Browser static preview">
    <div style={{padding:12,background:'#121922',color:'#cbd5e1',fontSize:12}}>
      <strong>Saved code preview</strong> ? HTML/CSS/JavaScript ? No tunnel needed
      <button style={{marginLeft:12}} onClick={()=>setRevision(value=>value+1)}>Reload snapshot</button>
      <p>Isolated page snapshot. External images, network requests and backend features are disabled.</p>
    </div>
    {error?<p role="alert" style={{padding:24}}>{error}</p>:html?<iframe title="Saved code preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={html} style={{width:'100%',height:580,border:0,background:'white'}}/>:<p role="status">Loading saved code?</p>}
  </section>;
}
