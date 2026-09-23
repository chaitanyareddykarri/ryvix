import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import NeuralCore3D from "@/components/NeuralCore3D";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {
    user = null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #0c1222 0%, #030712 65%)",
        color: "var(--text-primary)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background Ambient Glows */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "450px",
          background: "radial-gradient(ellipse, rgba(99, 102, 241, 0.18) 0%, rgba(6, 182, 212, 0.08) 45%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* TOP NAVIGATION BAR */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          backgroundColor: "rgba(3, 7, 18, 0.75)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0.9rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "#ffffff",
                boxShadow: "0 0 16px rgba(99, 102, 241, 0.5)",
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "#ffffff",
              }}
            >
              RY<span className="gradient-text">VIX</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2rem",
            }}
            className="hidden md:flex"
          >
            <a
              href="#features"
              className="nav-link-animated"
            >
              Platform
            </a>
            <a
              href="#architecture"
              className="nav-link-animated"
            >
              Architecture
            </a>
            <a
              href="#metrics"
              className="nav-link-animated"
            >
              Fleet &amp; SRE
            </a>
            <Link
              href="/dashboard"
              className="nav-link-animated"
            >
              Console
            </Link>
          </nav>

          {/* Auth CTA Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    maxWidth: "160px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </span>
                <Link
                  href="/dashboard"
                  style={{
                    padding: "0.45rem 1.1rem",
                    borderRadius: "9999px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    background: "linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)",
                    color: "#ffffff",
                    textDecoration: "none",
                    boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  Launch Console &rarr;
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontWeight: 500,
                    padding: "0.45rem 0.85rem",
                    transition: "color 0.15s ease",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="btn-nav-pill"
                >
                  Get Started &rarr;
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "4.5rem 1.5rem 3rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "3rem",
            alignItems: "center",
          }}
        >
          {/* Left Column: Headline & Value Proposition */}
          <div style={{ maxWidth: "600px" }}>
            {/* Announcement Pill Badge */}
            <Link
              href="/login"
              className="badge-interactive-float" style={{ marginBottom: "1.75rem" }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#06b6d4",
                  boxShadow: "0 0 8px #06b6d4",
                }}
              />
              <span>Ryvix v2.0 Autonomous Platform · Neural SRE</span>
              <span className="arrow-icon" style={{ color: "#818cf8" }}>&rarr;</span>
            </Link>

            {/* Main Editorial Headline */}
            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                marginBottom: "1.4rem",
              }}
            >
              Autonomous software &amp; infrastructure that{" "}
              <span className="gradient-text">heals itself.</span>
            </h1>

            {/* Subheading */}
            <p
              style={{
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: "2.25rem",
              }}
            >
              Predict outages before they occur. Mitigate DDoS attacks in 0.2ms.
              Empower autonomous AI reasoning agents with ephemeral Docker sandboxes
              and zero-inbound TLS architecture.
            </p>

            {/* Hero CTAs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "3rem",
              }}
            >
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="btn-shimmer"
                  >
                    Open Console &amp; Workspace <span className="arrow-icon">&rarr;</span>
                  </Link>
                  <Link
                    href="/servers"
                    className="btn-glass"
                  >
                    Manage Servers Fleet
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-shimmer"
                  >
                    Get Started Free <span className="arrow-icon">&rarr;</span>
                  </Link>
                  <Link
                    href="/login"
                    className="btn-glass"
                  >
                    Sign In to Platform
                  </Link>
                </>
              )}
            </div>

            {/* Quick Metrics Strip */}
            <div
              id="metrics"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1.25rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#38bdf8" }}>
                  0.208ms
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Threat Mitigation
                </div>
              </div>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#a855f7" }}>
                  99.999%
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Self-Healing SLA
                </div>
              </div>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#34d399" }}>
                  35 / 35
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Passing Test Suites
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Neural Core Component */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "520px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Ambient Backlight Glow behind 3D core */}
            <div
              style={{
                position: "absolute",
                width: "360px",
                height: "360px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(6, 182, 212, 0.12) 50%, transparent 70%)",
                filter: "blur(50px)",
                pointerEvents: "none",
              }}
            />
            {/* 3D Three.js Canvas */}
            <NeuralCore3D />
          </div>
        </div>
      </section>

      {/* ARCHITECTURAL PILLARS & FEATURES GRID */}
      <section
        id="features"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "5rem 1.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 3.5rem" }}>
          <h2
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.8rem",
            }}
          >
            Engineered for Autonomous Resilience
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.5 }}>
            A unified multi-tier operational architecture designed to isolate failures,
            diagnose anomalies, and remediate infrastructure in sub-millisecond cycles.
          </p>
        </div>

        <div
          id="architecture"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Card 1: Neural SRE Engine */}
          <div
            className="glass-panel feature-card-hover" style={{ padding: "2rem", borderRadius: "14px", border: "1px solid var(--border-subtle)", background: "rgba(15, 23, 42, 0.65)" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                color: "#38bdf8",
                fontSize: "1.3rem",
              }}
            >
              ⚡
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              Neural Threat Mitigation
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.55 }}>
              Deep feed-forward neural networks evaluate telemetry vectors in 0.2ms.
              Automated cluster-wide IP isolation halts Slowloris, DDoS, and SQL injection at the edge.
            </p>
          </div>

          {/* Card 2: Tri-Pathway Server Connectors */}
          <div
            className="glass-panel feature-card-hover" style={{ padding: "2rem", borderRadius: "14px", border: "1px solid var(--border-subtle)", background: "rgba(15, 23, 42, 0.65)" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                color: "#818cf8",
                fontSize: "1.3rem",
              }}
            >
              🛡️
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              Tri-Pathway Fleet Access
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.55 }}>
              Zero-inbound TLS daemon enrollment, ephemeral Ed25519 agentless SSH keys,
              and out-of-band cloud hypervisor power-cycles for air-gapped node recovery.
            </p>
          </div>

          {/* Card 3: Autonomous Coding Sandbox */}
          <div
            className="glass-panel feature-card-hover" style={{ padding: "2rem", borderRadius: "14px", border: "1px solid var(--border-subtle)", background: "rgba(15, 23, 42, 0.65)" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                color: "#c084fc",
                fontSize: "1.3rem",
              }}
            >
              💻
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              Isolated Coding Workspaces
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.55 }}>
              Dynamic ephemeral Docker containers allocate dynamic ports (3100+),
              generating automated PRs, live sandbox previews, and diff approvals.
            </p>
          </div>

          {/* Card 4: Supabase RLS Multi-Tenant Core */}
          <div
            className="glass-panel feature-card-hover" style={{ padding: "2rem", borderRadius: "14px", border: "1px solid var(--border-subtle)", background: "rgba(15, 23, 42, 0.65)" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                color: "#34d399",
                fontSize: "1.3rem",
              }}
            >
              🔒
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              Cryptographic Foundation
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.55 }}>
              Row-Level Security (RLS) guarantees absolute tenant boundary isolation.
              Automated organization generation, API keys with SHA-256 digests, and tamper-proof audit trails.
            </p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "2rem 1.5rem 6rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="glass-panel glow-indigo"
          style={{
            padding: "3.5rem 2rem",
            borderRadius: "20px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(30, 27, 75, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "1rem",
            }}
          >
            Ready to Automate Your Engineering Operations?
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1.05rem",
              maxWidth: "580px",
              margin: "0 auto 2.25rem",
              lineHeight: 1.6,
            }}
          >
            Deploy your self-healing cluster with zero open inbound ports in under 60 seconds.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {user ? (
              <Link
                href="/dashboard"
                className="btn-shimmer" style={{ padding: "0.9rem 2.4rem" }}
              >
                Go to Workspace Dashboard <span className="arrow-icon">&rarr;</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-shimmer" style={{ padding: "0.9rem 2.2rem" }}
                >
                  Create Free Account <span className="arrow-icon">&rarr;</span>
                </Link>
                <Link
                  href="/login"
                  className="btn-glass" style={{ padding: "0.9rem 1.8rem" }}
                >
                  Sign In to Console
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "2rem 1.5rem",
          backgroundColor: "rgba(3, 7, 18, 0.9)",
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            &copy; 2026 RYVIX Platform. Autonomous Software &amp; Infrastructure Operations.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/login" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Sign In
            </Link>
            <Link href="/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Console
            </Link>
            <Link href="/chat" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Web Chat
            </Link>
            <Link href="/servers" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Fleet
            </Link>
            <Link href="/tasks" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Workspaces
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
