'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Recovery = {
  id: string;
  hostname: string;
  provider: string;
  instance_id: string;
  status: string;
  requested_by: string;
  expires_at: string;
  provider_action_id?: string;
  observation?: unknown;
};

export default function RecoveryPage() {
  const [rows, setRows] = useState<Recovery[]>([]);
  const [servers, setServers] = useState<Array<{ id: string; hostname: string }>>([]);
  const [server, setServer] = useState('');
  const [user, setUser] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const read = async (path: string) => {
      const r = await fetch(path, { signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Recovery unavailable');
      return d;
    };
    const [r, s] = await Promise.all([read('/api/servers/recovery'), read('/api/servers')]);
    if (signal?.aborted) return;
    setRows(r.requests);
    setUser(r.userId);
    setServers(s.servers);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const update = () =>
      void refresh(abort.signal).catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    update();
    const timer = setInterval(update, 10000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [refresh]);

  async function mutate(body: unknown) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/servers/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Recovery unavailable');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recovery unavailable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="recovery-page-container"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Responsive Styles for Cloud Recovery Approvals Page */}
      <style>{`
        @media (max-width: 640px) {
          .recovery-page-container {
            padding: 1.5rem 1rem !important;
          }
          .recovery-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .recovery-form-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .recovery-form-row > * {
            width: 100% !important;
          }
          .recovery-card {
            padding: 1.25rem 1rem !important;
          }
          .recovery-action-btns {
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* Contextual Sub-Page Back Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/server-approvals"
          className="back-nav-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: '#38bdf8',
            fontSize: '0.88rem',
            textDecoration: 'none',
            fontWeight: 500,
            padding: '0.42rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          ← Back to Server Approvals
        </Link>
      </div>

      {/* Header Bar */}
      <header
        className="recovery-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
                RY<span className="gradient-text">VIX</span>
              </h1>
            </Link>
            <span
              style={{
                fontSize: '0.82rem',
                background: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              Cloud Recovery Approvals
            </span>
          </div>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              marginTop: '0.4rem',
              lineHeight: 1.5,
              maxWidth: '800px',
            }}
          >
            Request one cloud instance reboot. A different owner or administrator must approve within ten minutes.
            The selected instance may be temporarily unavailable during reboot.
          </p>
        </div>
      </header>

      {/* Guidance Alert Banner */}
      <div
        style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          color: '#fcd34d',
          marginBottom: '2rem',
          fontSize: '0.85rem',
          lineHeight: 1.5,
        }}
      >
        ⚠️ <strong>Provider note:</strong> Provider acceptance does not confirm recovery. “Observed healthy” means the
        provider reported running and a fresh agent heartbeat arrived; it does not prove a reboot or application health.
        Investigate unknown outcomes before requesting another reboot.
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            marginBottom: '1.5rem',
            fontSize: '0.88rem',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {error}
        </div>
      )}

      {/* Reboot Request Form Card */}
      <div className="glass-panel glow-indigo recovery-card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '0.4rem' }}>
          Request Reboot Approval
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Select an enrolled server to dispatch an out-of-band cloud provider instance reboot request.
        </p>

        <div
          className="recovery-form-row"
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <select
            aria-label="Recovery server"
            disabled={busy}
            value={server}
            onChange={(e) => setServer(e.target.value)}
            className="input-field"
            style={{ flex: '1 1 240px', minWidth: 0 }}
          >
            <option value="">Select server</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.hostname}
              </option>
            ))}
          </select>

          <button
            disabled={busy || !server}
            onClick={() => void mutate({ action: 'request', serverId: server })}
            className="btn-primary"
            style={{ width: 'auto', padding: '0.85rem 1.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {busy ? 'Submitting…' : 'Request reboot approval'}
          </button>
        </div>
      </div>

      {/* Requests & Measured Outcomes Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f3f4f6' }}>
            Requests &amp; Measured Outcomes
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Dual-custody recovery reboot authorization log and execution verification.
          </p>
        </div>

        {!rows.length && (
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            No cloud recovery requests.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rows.map((r) => {
            const isExpired =
              ['pending', 'approved'].includes(r.status) &&
              Date.parse(r.expires_at) <= Date.now();
            const displayStatus = isExpired ? 'expired' : r.status;
            const isPendingActive =
              r.status === 'pending' && Date.parse(r.expires_at) > Date.now();

            return (
              <article
                key={r.id}
                className="glass-panel recovery-card"
                style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '0.95rem' }}>
                      {r.hostname}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>&bull;</span>
                    <span style={{ fontSize: '0.88rem', color: '#94a3b8' }}>{r.provider}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>&bull;</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#38bdf8' }}>
                      {r.instance_id}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background:
                        displayStatus === 'approved'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : displayStatus === 'pending'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      color:
                        displayStatus === 'approved'
                          ? '#34d399'
                          : displayStatus === 'pending'
                          ? '#fbbf24'
                          : '#f87171',
                    }}
                  >
                    {displayStatus}
                  </span>
                </div>

                {r.provider_action_id && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      borderRadius: '6px',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.82rem',
                      color: '#93c5fd',
                      marginBottom: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Provider reference: {r.provider_action_id}
                  </div>
                )}

                {isPendingActive && (
                  <div
                    className="recovery-action-btns"
                    style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}
                  >
                    <button
                      disabled={busy || user === r.requested_by}
                      onClick={() => void mutate({ action: 'approve', id: r.id })}
                      className="btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        width: 'auto',
                        padding: '0.5rem 1.1rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      ✓ Approve this instance reboot
                    </button>
                    <button
                      disabled={busy || user === r.requested_by}
                      onClick={() => void mutate({ action: 'reject', id: r.id })}
                      className="btn-secondary"
                      style={{
                        color: '#fca5a5',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        width: 'auto',
                        padding: '0.5rem 1.1rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
