"use client";

import { useEffect, useState } from 'react';

type Connection = { id: string; name: string; type: string; status: string; environment_id: string };
type Environment = { id: string; name: string; project_name: string };

export default function ConnectionsPanel() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const response = await fetch('/api/connections', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Connections unavailable.');
    setConnections(data.connections);
    setEnvironments(data.environments);
  }
  useEffect(() => {
    reload().catch(reason => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/connections', { method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId || undefined, environmentId, name, type: 'github',
          config: token ? { token } : undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Connection could not be saved.');
      await reload();
      setEditingId(''); setName('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Connection could not be saved.'); }
    finally { setToken(''); setBusy(false); }
  }
  async function revoke(connection: Connection) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/connections', { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: connection.id, environmentId: connection.environment_id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Revocation failed.');
      await reload();
      if (editingId === connection.id) { setEditingId(''); setName(''); setToken(''); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Revocation failed.'); }
    finally { setBusy(false); }
  }

  return <section style={{ maxWidth: 960, margin: '0 auto' }}>
    <h2>Connections</h2>
    {error && <p role="alert" style={{ color: '#F06A6A' }}>{error}</p>}
    {loading ? <p>Loading connections…</p> : connections.length === 0 && !error ? <p>No connections yet.</p> : null}
    {connections.map(connection => <article key={connection.id} style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid #1D2732', borderRadius: 8 }}>
      <h3>{connection.name}</h3>
      <p>{connection.type} · {connection.status}</p>
      <button disabled={busy} onClick={() => { setEditingId(connection.id); setEnvironmentId(connection.environment_id); setName(connection.name); setToken(''); }}>Edit</button>{' '}
      <button disabled={busy} onClick={() => void revoke(connection)}>Revoke</button>
    </article>)}
    <form onSubmit={save} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
      <h3>{editingId ? 'Update connection' : 'Connect GitHub credentials'}</h3>
      <label>Environment
        <select required disabled={busy || !!editingId} value={environmentId} onChange={event => setEnvironmentId(event.target.value)}>
          <option value="">Select an environment</option>
          {environments.map(environment => <option key={environment.id} value={environment.id}>{environment.project_name} / {environment.name}</option>)}
        </select>
      </label>
      <label>Name <input required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
      {(!editingId || connections.find(connection => connection.id === editingId)?.type === 'github') &&
        <label>GitHub token {editingId && '(leave blank to keep current credentials)'}
          <input type="password" autoComplete="new-password" required={!editingId} value={token} disabled={busy} onChange={event => setToken(event.target.value)} />
        </label>}
      {!environments.length && !loading && <p>Create a project environment before adding a connection.</p>}
      <button disabled={busy || !environments.length} type="submit">{busy ? 'Saving…' : 'Save connection'}</button>
      {editingId && <button type="button" disabled={busy} onClick={() => { setEditingId(''); setName(''); setToken(''); }}>Cancel editing</button>}
    </form>
  </section>;
}
