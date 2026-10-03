'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppNav, { ReturnToDashboardButton } from '@/components/AppNav';

type Operation = {
  id: string;
  hostname: string;
  service: string;
  status: string;
  requested_by: string;
  expires_at: string;
  result?: { status: string; serviceState: string };
};

function OperationsContent() {
  const searchParams = useSearchParams();
  const sub = searchParams.get('sub');
  const isSubpage = sub === 'operations';

  const [operations, setOperations] = useState<Operation[]>([]);
  const [servers, setServers] = useState<Array<{ id: string; hostname: string }>>([]);
  const [services, setServices] = useState<string[]>([]);
  const [server, setServer] = useState('');
  const [service, setService] = useState('');
  const [user, setUser] = useState('');
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const read = async (path: string) => {
      const r = await fetch(path, { signal });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Operations unavailable');
      return data;
    };
    const [commands, hosts] = await Promise.all([
      read('/api/servers/commands'),
      read('/api/servers'),
    ]);
    if (signal?.aborted) return;
    setOperations(commands.commands);
    setServices(commands.services);
    setUser(commands.userId);
    setConfigured(commands.configured);
    setServers(hosts.servers);
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
      const response = await fetch('/api/servers/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation unavailable');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation unavailable');
    } finally {
      setBusy(false);
    }
  }

  const pendingOpsCount = operations.filter((op) => {
    return ['pending'].includes(op.status) && Date.parse(op.expires_at) > Date.now();
  }).length;

  return (
    <div
      className="operations-page-container"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Responsive Styles for Operations Page */}
      <style>{`
        @media (max-width: 640px) {
          .operations-page-container {
            padding: 1.5rem 1rem !important;
          }
          .operations-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .operations-nav {
            width: 100% !important;
            gap: 0.45rem !important;
          }
          .operations-nav-link {
            font-size: 0.8rem !important;
            padding: 0.38rem 0.75rem !important;
          }
          .operations-hub-grid {
            grid-template-columns: 1fr !important;
          }
          .operations-form-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .operations-form-row > * {
            width: 100% !important;
          }
          .operations-card {
            padding: 1.25rem 1rem !important;
          }
          .operations-action-btns {
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          SUB-PAGE VIEW: Server Operation Approvals
          ───────────────────────────────────────────────────────────── */}
      {isSubpage ? (
        <div>
          {/* Contextual Back Navigation */}
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

          {/* Sub-page Header */}
          <header style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
                  RY<span className="gradient-text">VIX</span>
                </h1>
              </Link>
              <span
                style={{
                  fontSize: '0.82rem',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                }}
              >
                Server Operation Approvals
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
              Request one restart of an allowed service. A different owner or administrator must approve it within ten
              minutes.
            </p>
          </header>

          {/* Warnings & Alerts */}
          {!configured && (
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fcd34d',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
              }}
            >
              ⚠️ Service restart delivery is not configured.
            </div>
          )}
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

          {/* Service Restart Request Form Card */}
          <div className="glass-panel glow-indigo operations-card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '0.4rem' }}>
              Request Service Restart Approval
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Choose a registered server and an allowed service to dispatch a monitored restart request.
            </p>

            <div
              className="operations-form-row"
              style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
            >
              <select
                aria-label="Server"
                disabled={busy}
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="input-field"
                style={{ flex: '1 1 200px', minWidth: 0 }}
              >
                <option value="">Select server</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.hostname}
                  </option>
                ))}
              </select>

              <select
                aria-label="Service"
                disabled={busy}
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="input-field"
                style={{ flex: '1 1 200px', minWidth: 0 }}
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button
                disabled={busy || !configured || !server || !service}
                onClick={() => void mutate({ action: 'request', serverId: server, service })}
                className="btn-primary"
                style={{ width: 'auto', padding: '0.85rem 1.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {busy ? 'Submitting…' : 'Request restart approval'}
              </button>
            </div>
          </div>

          {/* Requests & Outcomes Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f3f4f6' }}>
                Requests &amp; Measured Outcomes
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                A successful result confirms that the agent measured the service as active after restart. Application health
                requires its own health check.
              </p>
            </div>

            {!operations.length && (
              <div
                className="glass-panel"
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                }}
              >
                No operation requests.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {operations.map((op) => {
                const isExpired =
                  ['pending', 'approved'].includes(op.status) &&
                  Date.parse(op.expires_at) <= Date.now();
                const displayStatus = isExpired ? 'expired' : op.status;
                const isPendingActive =
                  op.status === 'pending' && Date.parse(op.expires_at) > Date.now();

                return (
                  <article
                    key={op.id}
                    className="glass-panel operations-card"
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
                          {op.hostname}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>&bull;</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#38bdf8' }}>
                          {op.service}
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
                              : displayStatus === 'delivered'
                              ? 'rgba(99, 102, 241, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            displayStatus === 'approved'
                              ? '#34d399'
                              : displayStatus === 'pending'
                              ? '#fbbf24'
                              : displayStatus === 'delivered'
                              ? '#a5b4fc'
                              : '#f87171',
                        }}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {op.result && (
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.35)',
                          borderRadius: '6px',
                          padding: '0.6rem 0.85rem',
                          fontSize: '0.82rem',
                          color: '#d1d5db',
                          marginBottom: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        Measured service state:{' '}
                        <span style={{ color: op.result.serviceState === 'active' ? '#34d399' : '#fbbf24' }}>
                          {op.result.serviceState}
                        </span>
                      </div>
                    )}

                    {op.status === 'delivered' && (
                      <p style={{ fontSize: '0.82rem', color: '#9ca3af', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                        Awaiting a signed execution receipt. Do not assume the restart completed.
                      </p>
                    )}

                    {isPendingActive && (
                      <div
                        className="operations-action-btns"
                        style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}
                      >
                        <button
                          disabled={busy || op.requested_by === user}
                          onClick={() => void mutate({ action: 'approve', id: op.id })}
                          className="btn-primary"
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            width: 'auto',
                            padding: '0.5rem 1.1rem',
                            fontSize: '0.82rem',
                          }}
                        >
                          ✓ Approve this service restart
                        </button>
                        <button
                          disabled={busy || op.requested_by === user}
                          onClick={() => void mutate({ action: 'reject', id: op.id })}
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
      ) : (
        /* ─────────────────────────────────────────────────────────────
           MAIN SECTION VIEW: Server Approvals Hub
           ───────────────────────────────────────────────────────────── */
        <div>
          {/* Contextual Breadcrumbs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
            }}
          >
            <Link href="/servers" style={{ color: '#38bdf8', textDecoration: 'none' }}>
              Servers
            </Link>
            <span>/</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Server Approvals</span>
          </div>

          {/* Header Bar with Main Application Navigation */}
          <header
            className="operations-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2.5rem',
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
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#a5b4fc',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  Server Approvals
                </span>
              </div>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  marginTop: '0.25rem',
                  maxWidth: '750px',
                  lineHeight: 1.45,
                }}
              >
                Infrastructure authorization center for dual-custody service operations and out-of-band cloud recovery.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <AppNav className="operations-nav" />
              <ReturnToDashboardButton />
            </div>
          </header>

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
              }}
            >
              {error}
            </div>
          )}

          {/* Child Sections Hub Cards */}
          <div
            className="operations-hub-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem',
            }}
          >
            {/* Child Card 1: Server Operation Approvals */}
            <div
              className="glass-panel glow-indigo operations-card"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      background: 'rgba(99, 102, 241, 0.18)',
                      color: '#a5b4fc',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    ⚙️ Service Operations
                  </span>
                  {pendingOpsCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        background: 'rgba(245, 158, 11, 0.18)',
                        color: '#fbbf24',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        fontWeight: 600,
                      }}
                    >
                      {pendingOpsCount} Pending
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '0.5rem' }}>
                  Server Operation Approvals
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Request and authorize single-service monitored restarts across registered server daemons. Dual-custody
                  authorization required within 10 minutes.
                </p>
              </div>

              <Link
                href="/server-approvals?sub=operations"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Open Server Operation Approvals &rarr;
              </Link>
            </div>

            {/* Child Card 2: Cloud Recovery Approvals */}
            <div
              className="glass-panel glow-blue operations-card"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      background: 'rgba(56, 189, 248, 0.18)',
                      color: '#38bdf8',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    ☁️ Cloud Recovery
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(59, 130, 246, 0.18)',
                      color: '#93c5fd',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    Out-of-Band
                  </span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '0.5rem' }}>
                  Cloud Recovery Approvals
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Request out-of-band cloud provider instance reboots and monitor post-reboot health telemetry. Dual-custody
                  approval with heartbeat verification.
                </p>
              </div>

              <Link
                href="/recovery"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Open Cloud Recovery Approvals &rarr;
              </Link>
            </div>
          </div>

          {/* Quick Active Requests Overview */}
          <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Active Authorization Queue
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Recent dual-custody requests requiring peer approval or execution verification.
                </p>
              </div>
              <Link
                href="/server-approvals?sub=operations"
                style={{ fontSize: '0.82rem', color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
              >
                Manage service operations &rarr;
              </Link>
            </div>

            {!operations.length ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
                No active operation requests pending approval.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {operations.slice(0, 3).map((op) => (
                  <div
                    key={op.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.85rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{op.hostname}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>&bull;</span>
                      <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{op.service}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '9999px',
                        background:
                          op.status === 'approved'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : op.status === 'pending'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          op.status === 'approved'
                            ? '#34d399'
                            : op.status === 'pending'
                            ? '#fbbf24'
                            : '#f87171',
                      }}
                    >
                      {op.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem', color: '#94a3b8' }}>
          Loading Server Approvals…
        </div>
      }
    >
      <OperationsContent />
    </Suspense>
  );
}
