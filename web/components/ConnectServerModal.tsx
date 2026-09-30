"use client";
import { useEffect, useState } from 'react';

type Environment = { id: string; name: string; project_name: string };
interface Props { isOpen: boolean; onClose: () => void; onConnected?: (server: any) => void; }
export default function ConnectServerModal({ isOpen, onClose, onConnected }: Props) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [hostname, setHostname] = useState('');
  const [enrollment, setEnrollment] = useState<{serverId: string; token: string; installScript: string; expiresAt: string} | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const abort = new AbortController();
    setEnrollment(null); setConnected(false); setError(''); setEnvironmentId('');
    fetch('/api/connections', { signal: abort.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Environments unavailable.');
      setEnvironments(data.environments);
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
  async function generate() {
    setLoading(true); setError(''); setEnrollment(null); setConnected(false);
    try {
      const response = await fetch('/api/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_enrollment', environmentId, hostname }) });
      const data = await response.json();
      if (!response.ok || !data.success || !data.installScript) throw new Error(data.error || 'Enrollment unavailable.');
      setEnrollment(data);
    } catch (error) { setError(error instanceof Error ? error.message : 'Enrollment failed.'); }
    finally { setLoading(false); }
  }
  if (!isOpen) return null;
  return <div role="dialog" aria-modal="true" aria-label="Connect server" style={{ position: 'fixed', inset: 0, background: '#000b', zIndex: 100, display: 'grid', placeItems: 'center' }}>
    <div style={{ background: '#101521', color: '#fff', padding: 28, borderRadius: 16, width: 'min(680px,95vw)' }}>
      <button onClick={onClose} style={{ float: 'right' }}>Close</button>
      <h2>Connect server</h2>
      <p>Select the environment and enter the hostname of the Linux server to enroll.</p>
      <label>Environment <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>
        <option value="">Select environment</option>
        {environments.map(e => <option key={e.id} value={e.id}>{e.project_name} / {e.name}</option>)}
      </select></label>
      <label style={{ display: 'block', margin: '16px 0' }}>Hostname <input value={hostname} onChange={e => setHostname(e.target.value)} maxLength={253} /></label>
      <button disabled={loading || !environmentId || !hostname} onClick={generate}>{loading ? 'Creating invitation…' : 'Generate enrollment'}</button>
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      {enrollment && !connected && <>
        <p>Run this command on your server. Paste the single-use token when prompted.</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{enrollment.installScript}</pre>
        <p>Enrollment token (expires {new Date(enrollment.expiresAt).toLocaleTimeString()}):</p>
        <code style={{ overflowWrap: 'anywhere' }}>{enrollment.token}</code>
        <p>Waiting for this server’s authenticated telemetry…</p>
      </>}
      {connected && <p>Connected: authenticated telemetry received for this server.</p>}
    </div>
  </div>;
}
