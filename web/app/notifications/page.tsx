'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav, { ReturnToDashboardButton } from '@/components/AppNav';

export default function Notifications() {
  const [data, setData] = useState<{ preferences: any[]; history: any[] }>({
    preferences: [],
    history: [],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch('/api/notifications', { signal });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Notifications unavailable');
    if (!signal?.aborted) setData(d);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void refresh(abort.signal).catch((e) => {
      if (!abort.signal.aborted) setError(e.message);
    });
    return () => abort.abort();
  }, [refresh]);

  async function save(p: any, security: boolean, deployment: boolean) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environmentId: p.id,
          securityEnabled: security,
          deploymentEnabled: deployment,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Preferences unavailable');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preferences unavailable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notifications-page-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem", boxSizing: "border-box" }}>
      {/* Responsive Styles for Notifications Page */}
      <style>{`
        @media (max-width: 640px) {
          .notifications-page-container {
            padding: 1.5rem 1rem !important;
          }
          .notifications-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .notifications-nav {
            width: 100% !important;
            gap: 0.45rem !important;
          }
          .notifications-nav-link {
            font-size: 0.8rem !important;
            padding: 0.38rem 0.75rem !important;
          }
          .notifications-card {
            padding: 1.25rem 1rem !important;
          }
          .notifications-pref-options {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .notifications-history-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.35rem !important;
          }
        }
      `}</style>

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
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Security Emails</span>
      </div>

      {/* Header Bar */}
      <header className="notifications-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
                RY<span className="gradient-text">VIX</span>
              </h1>
            </Link>
            <span style={{ fontSize: "0.82rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "0.2rem 0.65rem", borderRadius: "9999px", fontWeight: 600 }}>
              Security Emails
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Receive security alerts and confirmed provider deployment results at your verified account email, including Gmail. Gmail mailbox access is not required. Changes apply to new events.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <AppNav className="notifications-nav" />
          <ReturnToDashboardButton />
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div role="alert" style={{ padding: "0.85rem 1.25rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", marginBottom: "1.5rem", fontSize: "0.88rem", overflowWrap: "anywhere", wordBreak: "break-word" }}>
          {error}
        </div>
      )}

      {/* Email Preferences Section */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "0.5rem" }}>
          Email Preferences by Environment
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Configure granular notification delivery for infrastructure events and verified build deployments.
        </p>

        {!data.preferences.length && (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            No environments or notification preferences available.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {data.preferences.map((p) => (
            <section
              key={p.id}
              className="glass-panel glow-indigo notifications-card"
              style={{ padding: "1.5rem", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f3f4f6", wordBreak: "break-word" }}>
                    {p.project_name} <span style={{ color: "var(--text-secondary)" }}>/</span> {p.name}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "#38bdf8", fontFamily: "var(--font-mono)", marginTop: "0.2rem", wordBreak: "break-word" }}>
                    &rarr; {p.email}
                  </div>
                </div>
                {!p.verified && (
                  <span style={{ fontSize: "0.78rem", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "0.25rem 0.65rem", borderRadius: "9999px", fontWeight: 600 }}>
                    Unverified Email
                  </span>
                )}
              </div>

              {!p.verified && (
                <div style={{ padding: "0.6rem 0.85rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#fcd34d", fontSize: "0.82rem", marginBottom: "1rem" }}>
                  Verify your account email first to enable notifications.
                </div>
              )}

              <div className="notifications-pref-options" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", color: p.verified ? "#e2e8f0" : "var(--text-secondary)", cursor: p.verified && !busy ? "pointer" : "not-allowed" }}>
                  <input
                    type="checkbox"
                    checked={p.security_enabled}
                    disabled={busy || !p.verified}
                    onChange={(e) => void save(p, e.target.checked, p.deployment_enabled)}
                    style={{ width: "16px", height: "16px", accentColor: "#6366f1", cursor: "inherit" }}
                  />
                  <span>Security alerts</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", color: p.verified ? "#e2e8f0" : "var(--text-secondary)", cursor: p.verified && !busy ? "pointer" : "not-allowed" }}>
                  <input
                    type="checkbox"
                    checked={p.deployment_enabled}
                    disabled={busy || !p.verified}
                    onChange={(e) => void save(p, p.security_enabled, e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#6366f1", cursor: "inherit" }}
                  />
                  <span>Deployment results</span>
                </label>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Notification History Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f3f4f6" }}>
              Notification History
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Accepted means the email provider accepted the message; inbox delivery is not independently confirmed. Unknown sends require investigation.
            </p>
          </div>

          <button
            disabled={busy}
            onClick={() => void refresh().catch((e) => setError(e.message))}
            className="btn-secondary"
            style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🔄 Refresh
          </button>
        </div>

        {!data.history.length ? (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            No notification history records.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data.history.map((h) => (
              <div
                key={h.id}
                className="glass-panel notifications-history-row"
                style={{
                  padding: "0.9rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "0.88rem" }}>{h.kind}</span>
                  <span style={{ color: "var(--text-secondary)" }}>&bull;</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#9ca3af", wordBreak: "break-all" }}>
                    ID: {h.source_id}
                  </span>
                </div>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    background:
                      h.status === "accepted" || h.status === "sent"
                        ? "rgba(16, 185, 129, 0.15)"
                        : h.status === "pending"
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    color:
                      h.status === "accepted" || h.status === "sent"
                        ? "#34d399"
                        : h.status === "pending"
                        ? "#fbbf24"
                        : "#f87171",
                  }}
                >
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
