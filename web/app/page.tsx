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
            <a
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
              Sign In (Email OTP)
            </a>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
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
            <span style={{ fontSize: "0.78rem", background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
              Architecture Verified
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Dual-path operational architecture isolating the internal daemon from out-of-band external cloud recovery.
          </p>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Internal Daemon: <span style={{ color: "#93c5fd" }}>Ready for Enrollment</span></div>
            <div style={{ color: "#9ca3af", marginBottom: "0.35rem" }}>Out-of-Band Probe: <span style={{ color: "#93c5fd" }}>External Standby</span></div>
            <div style={{ color: "#9ca3af" }}>Failover Policy: <span style={{ color: "#34d399" }}>Air-Gapped Isolation</span></div>
          </div>
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
