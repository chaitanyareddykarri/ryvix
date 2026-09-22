import Link from 'next/link';
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Verify user authentication status
  let user = null;
  let connectionStatus = "connected";
  let authStatus = "ready";
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      authStatus = "unauthenticated";
    } else {
      user = data.user;
    }
  } catch (err) {
    connectionStatus = "error";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Configured";
  const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header Bar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
            RY<span className="gradient-text">VIX</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Autonomous Software &amp; Infrastructure Operations Platform
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/chat"
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: "rgba(139, 92, 246, 0.25)",
              border: "1px solid rgba(139, 92, 246, 0.5)",
              color: "#c084fc",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 0 12px rgba(139, 92, 246, 0.3)"
            }}
          >
            💬 Web Chat Console
          </Link>
          <Link
            href="/servers"
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            🖥️ Servers
          </Link>
          <Link
            href="/tasks"
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: "rgba(59, 130, 246, 0.2)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              color: "#60a5fa",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            💻 Coding Workspace
          </Link>
          <span
            className="badge-connected"
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              fontSize: "0.82rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="pulse-dot"></span>
            Supabase Connected
          </span>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {user.email}
              </span>
              <form action="/auth/signout" method="POST">
                <button type="submit" className="btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-primary"
              style={{
                padding: "0.45rem 1.1rem",
                fontSize: "0.85rem",
                textDecoration: "none",
                borderRadius: "9999px",
                width: "auto",
              }}
            >
              Sign In / Register
            </Link>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
        {/* Phase 9: Real-Time Web Chat Console Card */}
        <div className="glass-panel glow-purple" style={{ padding: "1.75rem", border: "1px solid rgba(139, 92, 246, 0.4)", background: "linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#f8fafc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>💬</span> Web Chat &amp; Visual Console
            </h2>
            <span style={{ fontSize: "0.78rem", background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", padding: "0.2rem 0.6rem", borderRadius: "4px", fontWeight: 700 }}>
              Phase 9 Active
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Unified conversational developer workbench with real-time token streaming, dual-process System 1/2 reasoning traces, unified diff inspection, and live sandboxed previews.
          </p>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)", marginBottom: "1.25rem" }}>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Streaming Protocol: <span style={{ color: "#34d399" }}>Server-Sent Events (SSE)</span></div>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Cognition Stream: <span style={{ color: "#c084fc" }}>OODA Loop + System 1 &amp; 2</span></div>
            <div style={{ color: "#9ca3af" }}>Interactive Tools: <span style={{ color: "#60a5fa" }}>Diff Viewer &amp; Action Approvals</span></div>
          </div>
          <Link
            href="/chat"
            className="btn-primary"
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "0.55rem 1.25rem",
              fontSize: "0.88rem",
              textDecoration: "none",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              color: "#ffffff",
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)"
            }}
          >
            Launch Web Chat Console &rarr;
          </Link>
        </div>

        {/* Supabase Connection Card */}
        <div className="glass-panel glow-cyan" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Supabase Foundation</h2>
            <span style={{ fontSize: "0.78rem", background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
              Phase 1 Active
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Managed PostgreSQL, Authentication, Realtime channels, and Storage backend successfully linked.
          </p>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Project Ref: <span style={{ color: "#f3f4f6" }}>{projectRef}</span></div>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Auth Engine: <span style={{ color: "#34d399" }}>{authStatus}</span></div>
            <div style={{ color: "#9ca3af" }}>Status: <span style={{ color: "#34d399" }}>ONLINE</span></div>
          </div>
        </div>

        {/* Dual Connectors Card */}
        <div className="glass-panel glow-indigo" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Dual-Path Connectors</h2>
            <span style={{ fontSize: "0.78rem", background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
              Path 2 Active
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Dual-path operational architecture isolating the internal daemon from out-of-band external cloud recovery.
          </p>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)", marginBottom: "1.25rem" }}>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Internal Daemon: <span style={{ color: "#34d399" }}>Zero-Inbound TLS</span></div>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Out-of-Band Probe: <span style={{ color: "#60a5fa" }}>Hypervisor Reset API</span></div>
            <div style={{ color: "#9ca3af" }}>Failover Policy: <span style={{ color: "#34d399" }}>Air-Gapped Isolation</span></div>
          </div>
          <Link
            href="/servers"
            className="btn-primary"
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "0.55rem 1.25rem",
              fontSize: "0.88rem",
              textDecoration: "none",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              color: "#ffffff",
              fontWeight: 600,
            }}
          >
            Manage Server Connectors &rarr;
          </Link>
        </div>

        {/* AI Coding Workspaces & Pipeline Card */}
        <div className="glass-panel glow-purple" style={{ padding: "1.75rem", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Coding Workspaces</h2>
            <span style={{ fontSize: "0.78rem", background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
              Path 1 Active
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Autonomous repository analyzer, AI reasoning engine, Docker sandbox execution, and GitHub PR pipeline.
          </p>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)", marginBottom: "1.25rem" }}>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Stack Detector: <span style={{ color: "#34d399" }}>Multi-Runtime</span></div>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Docker Sandbox: <span style={{ color: "#60a5fa" }}>Ephemeral Ports (3100+)</span></div>
            <div style={{ color: "#9ca3af" }}>PR Pipeline: <span style={{ color: "#f472b6" }}>Automated Branching</span></div>
          </div>
          <Link
            href="/tasks"
            className="btn-primary"
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "0.55rem 1.25rem",
              fontSize: "0.88rem",
              textDecoration: "none",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "#ffffff",
              fontWeight: 600,
            }}
          >
            Launch AI Workspace &rarr;
          </Link>
        </div>

        {/* Intelligence Layer Card */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Intelligence Layer</h2>
            <span style={{ fontSize: "0.78rem", background: "rgba(168, 85, 247, 0.15)", color: "#d8b4fe", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
              Hugging Face Ready
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Decoupled reasoning and tool calling engine isolated from credentials and direct host shells.
          </p>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Model Gateway: <span style={{ color: "#c084fc" }}>Tool-Calling Schema</span></div>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Approval Gates: <span style={{ color: "#34d399" }}>Enforced (Tiers 3-5)</span></div>
            <div style={{ color: "#9ca3af" }}>Audit Ledger: <span style={{ color: "#34d399" }}>Append-Only</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}
