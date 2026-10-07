"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './ConnectServerModal.module.css';

type Environment = { id: string; name: string; project_name: string };
interface Props { isOpen: boolean; onClose: () => void; onConnected?: (server: any) => void; }
export default function ConnectServerModal({ isOpen, onClose, onConnected }: Props) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentsLoaded, setEnvironmentsLoaded] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [environmentName, setEnvironmentName] = useState('Development');
  const [isProduction, setIsProduction] = useState(false);
  const [setupNotice, setSetupNotice] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [hostname, setHostname] = useState('');
  const [enrollment, setEnrollment] = useState<{serverId: string; token: string; installScript: string; expiresAt: string} | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState('');
  const generation = useRef<AbortController | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => { generation.current?.abort(); previous?.focus(); };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const abort = new AbortController();
    setEnrollment(null); setConnected(false); setError(''); setEnvironmentId(''); setCopied(''); setEnvironments([]); setLoading(false);
    setEnvironmentsLoaded(false);
    setShowSetup(false);setProjectName('');setEnvironmentName('Development');setIsProduction(false);setSetupNotice('');
    fetch('/api/connections', { signal: abort.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Environments unavailable.');
      if (!Array.isArray(data.environments)) throw new Error('Environments unavailable.');
      if(!abort.signal.aborted){setEnvironments(data.environments);setEnvironmentsLoaded(true);}
    }).catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => abort.abort();
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || !enrollment || connected) return;
    const abort = new AbortController();
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      if (Date.now() > Date.parse(enrollment.expiresAt)) { setError('Enrollment expired. Generate a new invitation.'); clearInterval(timer); return; }
      busy = true;
      try {
        const response = await fetch('/api/servers', { signal: abort.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to verify enrollment.');
        const server = data.servers?.find((item: any) => item.id === enrollment.serverId && item.telemetryStatus === 'fresh');
        if (server) { setConnected(true); setError(''); onConnected?.(server); }
      } catch (error) { if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Enrollment check failed.'); }
      finally { busy = false; }
    }, 5000);
    return () => { clearInterval(timer); abort.abort(); };
  }, [isOpen, enrollment, connected, onConnected]);
  async function createEnvironment(event:React.FormEvent) {
    event.preventDefault();if(loading)return;
    const abort=new AbortController();generation.current?.abort();generation.current=abort;
    setLoading(true);setError('');setSetupNotice('');
    try{
      const response=await fetch('/api/environments',{method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({projectName,environmentName,isProduction})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Environment setup unavailable.');
      if(!data.environment?.id||typeof data.environment.name!=='string'||typeof data.environment.project_name!=='string')throw new Error('Environment setup could not be confirmed.');
      if(!abort.signal.aborted){setEnvironments(current=>[...current.filter(e=>e.id!==data.environment.id),data.environment]);setEnvironmentId(data.environment.id);setShowSetup(false);setSetupNotice('Environment ready. Enter your hostname and generate an enrollment invitation. No server has been connected yet.');}
    }catch(error){if(!abort.signal.aborted)setError(error instanceof Error?error.message:'Environment setup unavailable.');}
    finally{if(!abort.signal.aborted)setLoading(false);}
  }
  async function generate() {
    if(loading)return;
    generation.current?.abort();
    const abort = new AbortController();
    generation.current = abort;
    setLoading(true); setError(''); setEnrollment(null); setConnected(false);
    try {
      const response = await fetch('/api/servers', { method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_enrollment', environmentId, hostname }) });
      const data = await response.json();
      if (!response.ok || !data.success || !data.installScript) throw new Error(data.error || 'Enrollment unavailable.');
      if (!abort.signal.aborted) setEnrollment(data);
    } catch (error) { if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Enrollment failed.'); }
    finally { if (!abort.signal.aborted) setLoading(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setCopied(label); }
    catch { setError('Clipboard unavailable. Select and copy the text manually.'); }
  }
  if (!isOpen) return null;
  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="connect-server-title" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)'));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <div className={styles.panel}>
      <button ref={closeButton} className={styles.close} onClick={onClose} aria-label="Close server connection">Close</button>
      <span className={styles.eyebrow}>Infrastructure</span>
      <h2 id="connect-server-title">Connect server</h2>
      <p>Select the environment and enter the hostname of the Linux server to enroll.</p>
      {!environmentsLoaded&&!error&&<p role="status">Loading workspace environments…</p>}
      {environmentsLoaded&&environments.length===0&&<p role="status">No environments are available in this workspace. Create one below with an owner, admin or developer account. GitHub is not required.</p>}
      {environmentsLoaded&&!enrollment&&<button disabled={loading} type="button" onClick={()=>setShowSetup(value=>!value)}>{showSetup?'Cancel environment setup':'Create project environment'}</button>}
      {showSetup&&<form className={styles.setup} onSubmit={createEnvironment}>
        <h3>Infrastructure project</h3><p>Create workspace records for your server. Reusing the same names reuses this infrastructure setup.</p>
        <label>Project name <input required maxLength={100} disabled={loading} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="My infrastructure"/></label>
        <label>Environment name <input required maxLength={100} disabled={loading} value={environmentName} onChange={e=>setEnvironmentName(e.target.value)}/></label>
        <label><input type="checkbox" disabled={loading} checked={isProduction} onChange={e=>setIsProduction(e.target.checked)}/> Production environment</label>
        <button className={styles.primary} disabled={loading||!projectName.trim()||!environmentName.trim()} type="submit">{loading?'Creating environment…':'Create environment'}</button>
      </form>}
      {setupNotice&&<p role="status" className={styles.success}>{setupNotice}</p>}
      <label>Environment <select aria-label="Environment" disabled={loading||!!enrollment} value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>
        <option value="">Select environment</option>
        {environments.map(e => <option key={e.id} value={e.id}>{e.project_name} / {e.name}</option>)}
      </select></label>
      <label>Hostname <input disabled={loading||!!enrollment} value={hostname} onChange={e => setHostname(e.target.value)} maxLength={253} placeholder="app-server-01" /></label>
      <button className={styles.primary} disabled={loading || !environmentId || !hostname.trim()} onClick={generate}>{loading ? 'Creating invitation…' : 'Generate enrollment'}</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {enrollment && !connected && <>
        <p>Run this command on your server. Paste the single-use token when prompted.</p>
        <pre>{enrollment.installScript}</pre>
        <button onClick={() => copy(enrollment.installScript, 'Command')}>Copy command</button>
        <p>Enrollment token (expires {new Date(enrollment.expiresAt).toLocaleTimeString()}):</p>
        <code className={styles.token}>{enrollment.token}</code>
        <button onClick={() => copy(enrollment.token, 'Token')}>Copy token</button>
        <p role="status" className={styles.status}>{copied ? `${copied} copied. ` : ''}Waiting for authenticated telemetry…</p>
      </>}
      {connected && <p role="status" className={styles.success}>Connected: authenticated telemetry received for this server.</p>}
    </div>
  </div>;
}
