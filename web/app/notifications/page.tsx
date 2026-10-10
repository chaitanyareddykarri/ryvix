'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import styles from '@/components/InfrastructureSettings.module.css';
export default function Notifications(){
  const [data,setData]=useState<{preferences:any[];history:any[]}>({preferences:[],history:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const refresh=useCallback(async(signal?:AbortSignal)=>{const r=await fetch('/api/notifications',{signal});const d=await r.json();if(!r.ok)throw new Error(d.error||'Notifications unavailable');if(!signal?.aborted)setData(d);},[]);
  useEffect(()=>{const abort=new AbortController();void refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[refresh]);
  async function save(p:any,security:boolean,deployment:boolean){setBusy(true);setError('');try{const r=await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({environmentId:p.id,securityEnabled:security,deploymentEnabled:deployment})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Preferences unavailable');await refresh();}catch(e){setError(e instanceof Error?e.message:'Preferences unavailable');}finally{setBusy(false);}}
  return <main className={styles.page}><nav className={styles.links} aria-label="Notification navigation"><Link href="/channels">Channels</Link><Link href="/releases">Release approvals</Link></nav><h1>Email notifications</h1>
    <p>Receive security alerts and confirmed provider deployment results at your verified account email, including Gmail. Gmail mailbox access is not required. Changes apply to new events.</p>
    {error&&<p role="alert">{error}</p>}{data.preferences.map(p=><section key={p.id} className={`workspace-card ${styles.card}`}><p>{p.project_name} / {p.name} → {p.email}</p>
      {!p.verified&&<p role="status">Verify your account email first.</p>}<div className={styles.choices}><label><input type="checkbox" checked={p.security_enabled} disabled={busy||!p.verified} onChange={e=>void save(p,e.target.checked,p.deployment_enabled)}/> Security alerts</label> <label><input type="checkbox" checked={p.deployment_enabled} disabled={busy||!p.verified} onChange={e=>void save(p,p.security_enabled,e.target.checked)}/> Deployment results</label></div>
    </section>)}<h2>Notification history</h2><p>Accepted means the email provider accepted the message; inbox delivery is not independently confirmed. Unknown sends require investigation.</p>
    <button disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>Refresh</button>{data.history.map(h=><article className={`workspace-card ${styles.card}`} key={h.id}><p>{h.kind} · {h.status} · {h.source_id}</p></article>)}
  </main>;
}
