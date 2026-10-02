"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import ConnectServerModal from "@/components/ConnectServerModal";

interface SystemdService {
  name: string;
  status: "active" | "inactive" | "failed" | "restarting";
}

interface ServerItem {
  id: string;
  hostname: string;
  ip: string | null;
  os: string | null;
  provider: string | null;
  status: "healthy" | "degraded" | "unreachable" | "unknown";
  telemetryStatus: "fresh" | "stale" | "missing" | "invalid";
  latestSampleAt: string | null;
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskPercent: number | null;
  lastHeartbeat: string | null;
  services: SystemdService[];
}

export default function ServersPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "healthy" | "degraded">("all");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  useEffect(() => {
    const events = new EventSource('/api/telemetry/stream');
    events.addEventListener('telemetry', event => {
      try { const data = JSON.parse((event as MessageEvent).data); setServers(data.servers); setLoading(false); }
      catch { setActionMessage('Telemetry response could not be read.'); }
    });
    events.addEventListener('unavailable', () => { setServers([]); setActionMessage('Telemetry unavailable. Reconnecting…'); });
    events.onerror = () => { setActionMessage('Telemetry stream interrupted. Reconnecting…'); };
    return () => events.close();
  }, []);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
      fetchServers();
    }
    loadData();
  }, []);

  async function fetchServers() {
    try {
      const res = await fetch("/api/servers");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Server telemetry unavailable.");
      if (json.servers) {
        setServers(json.servers);
      }
    } catch (err) {
      setServers([]);
      setActionMessage(err instanceof Error ? err.message : "Server telemetry unavailable.");
    } finally {
      setLoading(false);
    }
  }

  const filteredServers = servers.filter((s) => {
    if (activeTab === "all") return true;
    return s.status === activeTab;
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header Bar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
                RY<span className="gradient-text">VIX</span>
              </h1>
            </Link>
            <span style={{ fontSize: "0.82rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "0.2rem 0.65rem", borderRadius: "9999px" }}>
              Server Connectors &amp; Infrastructure
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Zero-inbound TLS daemons, capability whitelisting &amp; out-of-band cloud recovery
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {userEmail && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {userEmail}
            </span>
          )}
          <Link href="/observability" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>📡 Observability</Link>
          <Link href="/operations" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>Service approvals</Link>
          <Link href="/tasks" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Coding Workspace
          </Link>
          <Link href="/" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Dashboard
          </Link>
        </div>
      </header>

      {/* Non-Coder Guidance: GitHub vs. Server */}
      <div style={{
        background: "rgba(99, 102, 241, 0.08)",
        border: "1px solid rgba(99, 102, 241, 0.25)",
        borderRadius: "10px",
        padding: "0.9rem 1.25rem",
        marginTop: "1.75rem",
        marginBottom: "1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "1.3rem" }}>💡</div>
          <div style={{ fontSize: "0.84rem", color: "#c7d2fe", lineHeight: 1.45 }}>
            <strong>Understanding your connections:</strong> Your GitHub connection gives Ryvix access to your website&apos;s code and files. Connecting your server adds live CPU/RAM monitoring, crash recovery, and auto-restart capabilities.
          </div>
        </div>
        <Link href="/dashboard" style={{ fontSize: "0.8rem", color: "#60a5fa", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
          Website Settings &rarr;
        </Link>
      </div>

      {/* Top Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["all", "healthy", "degraded"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: activeTab === tab ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.05)",
                color: activeTab === tab ? "#a5b4fc" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                textTransform: "capitalize",
              }}
            >
              {tab} ({tab === "all" ? servers.length : servers.filter((s) => s.status === tab).length})
            </button>
          ))}
        </div>

        {/* Enroll Button */}
        <button
          onClick={() => setShowEnrollModal(true)}

          className="btn-primary"
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "0.88rem",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          + Enroll New Server
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div style={{ padding: "0.85rem 1.25rem", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", color: "#c7d2fe", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
          {actionMessage}
        </div>
      )}

      {/* Server Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
          Loading enrolled infrastructure...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {filteredServers.map((server) => (
            <div key={server.id} className="glass-panel glow-cyan" style={{ padding: "1.75rem" }}>
              {/* Server Title & Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#f3f4f6" }}>
                    {server.hostname}
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
                    {server.ip ?? "IP unavailable"} &bull; {server.provider ?? "Provider unavailable"}
                  </div>
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "9999px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    background:
                      server.status === "healthy"
                        ? "rgba(52, 211, 153, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    color: server.status === "healthy" ? "#34d399" : "#f87171",
                  }}
                >
                  {server.status}
                </span>
              </div>

              {/* OS & Architecture */}
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                OS: <span style={{ color: "#d1d5db" }}>{server.os ?? "Not available"}</span>
              </div>

              <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                Telemetry: {server.telemetryStatus}
                {server.latestSampleAt && <> · Last sample: {new Date(server.latestSampleAt).toLocaleString()}</>}
              </p>
              {/* Resource Gauges */}
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem" }}>
                {/* CPU */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>CPU Load</span>
                    <span style={{ color: (server.cpuPercent ?? 0) > 80 ? "#f87171" : "#34d399", fontWeight: 600 }}>{server.cpuPercent === null ? "Not available" : `${server.cpuPercent ?? 0}%`}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.cpuPercent ?? 0}%`, height: "100%", background: (server.cpuPercent ?? 0) > 80 ? "#ef4444" : "#10b981" }}></div>
                  </div>
                </div>

                {/* Memory */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>Memory (RAM)</span>
                    <span style={{ color: (server.memoryPercent ?? 0) > 80 ? "#f87171" : "#60a5fa", fontWeight: 600 }}>{server.memoryPercent === null ? "Not available" : `${server.memoryPercent ?? 0}%`}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.memoryPercent ?? 0}%`, height: "100%", background: (server.memoryPercent ?? 0) > 80 ? "#ef4444" : "#3b82f6" }}></div>
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>Disk Storage</span>
                    <span style={{ color: (server.diskPercent ?? 0) > 80 ? "#f87171" : "#a78bfa", fontWeight: 600 }}>{server.diskPercent === null ? "Not available" : `${server.diskPercent ?? 0}%`}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.diskPercent ?? 0}%`, height: "100%", background: (server.diskPercent ?? 0) > 80 ? "#ef4444" : "#8b5cf6" }}></div>
                  </div>
                </div>
              </div>

              {/* Systemd Services */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.5rem" }}>
                  SYSTEMD SERVICES
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {server.services.length === 0 && <span>No service inventory available.</span>}
                  {server.services.map((svc) => (
                    <div
                      key={svc.name}
                      style={{
                        padding: "0.3rem 0.65rem",
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.4)",
                        fontSize: "0.78rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                      }}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: svc.status === "active" ? "#10b981" : "#ef4444",
                        }}
                      ></span>
                      <span style={{ color: "#f3f4f6" }}>{svc.name}</span>
                      {svc.status === "failed" && (
                        <button
                          disabled
                          title="Unavailable until authenticated command dispatch and persisted approval are implemented"
                          style={{
                            border: "none",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            cursor: "not-allowed",
                            opacity: 0.65,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          Restart unavailable
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                <button
                  disabled
                  title="Unavailable until authenticated command dispatch and persisted approval are implemented"
                  className="btn-secondary"
                  style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.78rem", cursor: "not-allowed", opacity: 0.65 }}
                >
                  Restart unavailable
                </button>
                <button
                  disabled
                  title="Unavailable until the persisted human approval workflow is implemented"
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.5rem",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    cursor: "not-allowed",
                    opacity: 0.65,
                    fontWeight: 600,
                  }}
                >
                  Reset unavailable
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConnectServerModal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} />
    </div>
  );
}
