"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import ConnectServerModal from "@/components/ConnectServerModal";

interface SystemdService {
  name: string;
  lastSeenAt?: string | null;
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
  const [activeTab, setActiveTab] = useState<"all" | "healthy" | "degraded" | "unreachable" | "unknown">("all");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  const revision=useRef(0);
  const pending=useRef<AbortController|null>(null);
  function readServers(data:any):ServerItem[]{
    if(!data.success||!Array.isArray(data.servers)||data.servers.some((s:any)=>!s||typeof s.id!=="string"||typeof s.hostname!=="string"||!Array.isArray(s.services)))throw new Error("Server telemetry response is unavailable.");
    return data.servers;
  }
  const fetchServers=useCallback(async()=>{
    pending.current?.abort();const abort=new AbortController();pending.current=abort;
    const version=++revision.current;setLoading(true);
    try{
      const res=await fetch("/api/servers",{signal:abort.signal,cache:"no-store"});const json=await res.json();
      if(!res.ok)throw new Error(json.error||"Server telemetry unavailable.");
      const next=readServers(json);
      if(!abort.signal.aborted&&version===revision.current){setServers(next);setActionMessage(null);}
    }catch(error){if(!abort.signal.aborted&&version===revision.current){setServers([]);setActionMessage(error instanceof Error?error.message:"Server telemetry unavailable.");}}
    finally{if(!abort.signal.aborted&&version===revision.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    void fetchServers();
    let cancelled=false;
    void createClient().auth.getUser().then(({data})=>{if(!cancelled)setUserEmail(data?.user?.email||null);}).catch(()=>{});
    const events=new EventSource('/api/telemetry/stream');
    const unavailable=(message:string)=>{++revision.current;setServers([]);setLoading(false);setActionMessage(message);};
    events.addEventListener('telemetry',event=>{
      try{const next=readServers(JSON.parse((event as MessageEvent).data));++revision.current;setServers(next);setLoading(false);setActionMessage(null);}
      catch{unavailable('Telemetry response could not be read. Retry the server list.');}
    });
    events.addEventListener('unavailable',()=>unavailable('Telemetry unavailable. Reconnecting?'));
    events.onerror=()=>unavailable('Telemetry stream interrupted. Reconnecting?');
    return()=>{cancelled=true;pending.current?.abort();events.close();};
  },[fetchServers]);

  const filteredServers = servers.filter((s) => {
    if (activeTab === "all") return true;
    return s.status === activeTab;
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header Bar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ minWidth: 0, maxWidth: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
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
            Recorded server telemetry, enrollment and approved operations
          </p>
        </div>

        <nav aria-label="Infrastructure navigation" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", minWidth: 0, maxWidth: "100%" }}>
          <Link href="/servers/demo" className="btn-secondary">Try server and coding demo</Link>
          <Link href="/websites" className="btn-secondary">Check a deployed website</Link>
          {userEmail && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", overflowWrap: "anywhere", maxWidth: "100%" }}>
              {userEmail}
            </span>
          )}
          <Link href="/observability" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>📡 Observability</Link>
          <Link href="/operations" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>Service approvals</Link>
          <Link href="/servers/tools" className="btn-secondary">Keys, access diagnostics and classification</Link>
          <Link href="/notifications" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>Security emails</Link>
          <Link href="/tasks" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Coding Workspace
          </Link>
          <Link href="/dashboard" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Dashboard
          </Link>
        </nav>
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
            <strong>Understanding your connections:</strong> Your GitHub connection provides repository access. Server enrollment adds authenticated telemetry. Service restarts and cloud recovery require separate capabilities, configuration and approval.
          </div>
        </div>
        <Link href="/dashboard" style={{ fontSize: "0.8rem", color: "#60a5fa", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
          Website Settings &rarr;
        </Link>
      </div>

      {/* Top Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        {/* Filter Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(["all", "healthy", "degraded", "unreachable", "unknown"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab===tab}
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
            width: "auto",
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
        <div role="alert" style={{ padding: "0.85rem 1.25rem", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", color: "#c7d2fe", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
          {actionMessage}
          <button className="btn-secondary" style={{marginLeft:".75rem"}} disabled={loading} onClick={()=>void fetchServers()}>Retry server list</button>
        </div>
      )}

      {!loading&&!actionMessage&&filteredServers.length===0&&<div className="glass-panel" style={{padding:"2rem",marginBottom:"1rem"}} role="status">
        <h2>{servers.length===0?'No servers enrolled yet':'No servers match this filter.'}</h2>
        <p style={{color:"var(--text-secondary)",marginTop:".75rem"}}>{servers.length===0?'Enroll a server to start receiving authenticated telemetry. A GitHub connection alone does not enroll a server.':'Choose another status to view the rest of your fleet.'}</p>
      </div>}
      {/* Server Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
          Loading enrolled infrastructure...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "1.5rem" }}>
          {filteredServers.map((server) => (
            <div key={server.id} className="glass-panel glow-cyan" style={{ padding: "1.75rem", minWidth: 0, overflowWrap: "anywhere" }}>
              {/* Server Title & Status */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ minWidth: 0, maxWidth: "100%" }}>
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
                      server.status === "unknown" ? "rgba(165,175,188,.1)" : server.status === "healthy"
                        ? "rgba(52, 211, 153, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    color: server.status === "healthy" ? "#34d399" : server.status === "unknown" ? "#a5afbc" : "#f87171",
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
                    <span style={{ color: (server.cpuPercent ?? 0) > 80 ? "#f87171" : "#34d399", fontWeight: 600 }}>{server.cpuPercent == null ? "Not available" : `${server.cpuPercent ?? 0}%`}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.cpuPercent ?? 0}%`, height: "100%", background: (server.cpuPercent ?? 0) > 80 ? "#ef4444" : "#10b981" }}></div>
                  </div>
                </div>

                {/* Memory */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>Memory (RAM)</span>
                    <span style={{ color: (server.memoryPercent ?? 0) > 80 ? "#f87171" : "#60a5fa", fontWeight: 600 }}>{server.memoryPercent == null ? "Not available" : `${server.memoryPercent ?? 0}%`}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.memoryPercent ?? 0}%`, height: "100%", background: (server.memoryPercent ?? 0) > 80 ? "#ef4444" : "#3b82f6" }}></div>
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#9ca3af" }}>Disk Storage</span>
                    <span style={{ color: (server.diskPercent ?? 0) > 80 ? "#f87171" : "#a78bfa", fontWeight: 600 }}>{server.diskPercent == null ? "Not available" : `${server.diskPercent ?? 0}%`}</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${server.diskPercent ?? 0}%`, height: "100%", background: (server.diskPercent ?? 0) > 80 ? "#ef4444" : "#8b5cf6" }}></div>
                  </div>
                </div>
              </div>

              {/* Systemd Services */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.5rem" }}>
                  RECORDED SYSTEMD SERVICES
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
                        flexWrap: "wrap",
                        maxWidth: "100%",
                        alignItems: "center",
                        gap: "0.45rem",
                      }}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: svc.status === "active" ? "#10b981" : svc.status === "failed" ? "#ef4444" : "#9ca3af",
                        }}
                      ></span>
                      <span style={{ color: "#f3f4f6" }}>{svc.name}</span>
                      <span style={{color:"#9ca3af"}}>{svc.status}{svc.lastSeenAt ? ` · ${new Date(svc.lastSeenAt).toLocaleString()}` : ' · observation time unavailable'}</span>
                      {svc.status === "failed" && (
                        <Link
                          href={`/operations?server=${encodeURIComponent(server.id)}&service=${encodeURIComponent(svc.name)}`}
                          title="Review a restart request; independent approval is required"
                          style={{
                            border: "none",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            textDecoration: "none",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          Request restart
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                <Link
                  href={`/operations?server=${encodeURIComponent(server.id)}`}
                  title="Choose an allowed service and request independent approval"
                  className="btn-secondary"
                  style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.78rem", textDecoration: "none" }}
                >
                  Service approvals
                </Link>
                <Link
                  href={`/recovery?server=${encodeURIComponent(server.id)}`}
                  title="Review a cloud reboot request; independent approval is required"
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.5rem",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Reboot approval
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConnectServerModal onConnected={fetchServers} isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} />
    </div>
  );
}
