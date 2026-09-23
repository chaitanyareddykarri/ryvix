"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import ConnectServerModal from "@/components/ConnectServerModal";

interface SystemdService {
  name: string;
  status: "active" | "inactive" | "failed";
}

interface ServerItem {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  provider: string;
  status: "healthy" | "degraded" | "unreachable";
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  lastHeartbeat: string;
  services: SystemdService[];
}

export default function ServersPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollCommand, setEnrollCommand] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "healthy" | "degraded">("all");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

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
      if (json.success && json.servers) {
        setServers(json.servers);
      }
    } catch (err) {
      console.error("Failed to load servers", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateEnrollment() {
    setEnrolling(true);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_enrollment",
          environmentId: "env_prod_ecommerce",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrollCommand(data.installScript);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnrolling(false);
    }
  }

  async function restartService(serverId: string, unit: string) {
    setActionMessage(`Restarting ${unit} on ${serverId}...`);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_capability",
          serverId,
          capability: "service.restart",
          params: { unit },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✓ Success: ${data.result.message}`);
        fetchServers();
      } else {
        setActionMessage(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`❌ Request failed: ${err.message}`);
    }
  }

  async function triggerOobReboot(serverId: string, provider: string) {
    setActionMessage(`Dispatching Out-of-Band Cloud Reboot via ${provider}...`);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "oob_cloud_reboot",
          serverId,
          params: { provider: provider.toLowerCase().split(" ")[0], instanceId: "i-09ab7c12d45ef" },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✓ Out-of-Band Action Dispatched: ${data.result.providerMessage}`);
      } else {
        setActionMessage(`❌ Cloud API Error: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`❌ Out-of-Band reboot failed: ${err.message}`);
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
          <Link href="/tasks" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Coding Workspace
          </Link>
          <Link href="/" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Dashboard
          </Link>
        </div>
      </header>

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
          disabled={enrolling}
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
          {enrolling ? "Generating Command..." : "+ Enroll New Server"}
        </button>
      </div>

      {/* Enrollment Command Card */}
      {enrollCommand && (
        <div className="glass-panel glow-indigo" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#a5b4fc" }}>
              ⚡ One-Click Server Enrollment Command
            </h3>
            <button
              onClick={() => setEnrollCommand(null)}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1rem" }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Run this command as <code>root</code> or with <code>sudo</code> on your Linux host. No inbound ports or SSH keys required.
          </p>
          <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: "8px", padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <code style={{ fontSize: "0.85rem", color: "#34d399", wordBreak: "break-all", fontFamily: "var(--font-mono)" }}>
              {enrollCommand}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(enrollCommand)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.1)",
                color: "#f3f4f6",
                border: "none",
                cursor: "pointer",
                fontSize: "0.78rem",
                whiteSpace: "nowrap",
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

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
                    {server.ip} &bull; {server.provider}
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
                OS: <span style={{ color: "#d1d5db" }}>{server.os}</span>
              </div>

              {/* Resource Gauges */}
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem" }}>
                {/* CPU */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>CPU Load</span>
                    <span style={{ color: server.cpuPercent > 80 ? "#f87171" : "#34d399", fontWeight: 600 }}>{server.cpuPercent}%</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.cpuPercent}%`, height: "100%", background: server.cpuPercent > 80 ? "#ef4444" : "#10b981" }}></div>
                  </div>
                </div>

                {/* Memory */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>Memory (RAM)</span>
                    <span style={{ color: server.memoryPercent > 80 ? "#f87171" : "#60a5fa", fontWeight: 600 }}>{server.memoryPercent}%</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.memoryPercent}%`, height: "100%", background: server.memoryPercent > 80 ? "#ef4444" : "#3b82f6" }}></div>
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>Disk Storage</span>
                    <span style={{ color: server.diskPercent > 80 ? "#f87171" : "#a78bfa", fontWeight: 600 }}>{server.diskPercent}%</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.diskPercent}%`, height: "100%", background: server.diskPercent > 80 ? "#ef4444" : "#8b5cf6" }}></div>
                  </div>
                </div>
              </div>

              {/* Systemd Services */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.5rem" }}>
                  SYSTEMD SERVICES
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
                          onClick={() => restartService(server.id, svc.name)}
                          style={{
                            border: "none",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          Restart
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                <button
                  onClick={() => restartService(server.id, server.services[0]?.name || "nginx")}
                  className="btn-secondary"
                  style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.78rem" }}
                >
                  Restart Service
                </button>
                <button
                  onClick={() => triggerOobReboot(server.id, server.provider)}
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.5rem",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Out-of-Band Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
