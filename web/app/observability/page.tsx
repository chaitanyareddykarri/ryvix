"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "AUDIT" | "SECURITY" | "HEALTH";
  source: string;
  severity: "info" | "warning" | "critical";
  message: string;
  details?: any;
}

export default function ObservabilityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // External Probe State
  const [probeUrl, setProbeUrl] = useState("http://localhost:3000/api/servers");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filterSeverity]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/observability/logs?severity=${filterSeverity}&limit=60`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunProbe() {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/monitoring/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: probeUrl }),
      });
      const data = await res.json();
      setProbeResult(data);
      // Reload logs to show new health check entry
      loadLogs();
    } catch (err: any) {
      setProbeResult({ success: false, error: err.message });
    } finally {
      setProbing(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.message.toLowerCase().includes(q) ||
      log.source.toLowerCase().includes(q) ||
      log.type.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 1.5rem", color: "#f8fafc" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
                RY<span style={{ color: "#38bdf8" }}>VIX</span>
              </h1>
            </Link>
            <span style={{ fontSize: "0.82rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "0.2rem 0.65rem", borderRadius: "9999px", fontWeight: 600 }}>
              Observability &amp; Outage Diagnostic Center
            </span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: "0.25rem", margin: "0.25rem 0 0" }}>
            Correlated dual-path telemetry: In-host connector heartbeats, external probes &amp; security event logs
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/servers"
            style={{
              padding: "0.45rem 0.9rem",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "0.82rem",
              textDecoration: "none",
            }}
          >
            🖥️ Servers
          </Link>
          <Link
            href="/tasks"
            style={{
              padding: "0.45rem 0.9rem",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "0.82rem",
              textDecoration: "none",
            }}
          >
            ⚡ Tasks
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: "0.45rem 0.9rem",
              background: "linear-gradient(135deg, #0284c7, #2563eb)",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Top Diagnostic Probe Widget */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 27, 75, 0.8))",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              📡 Tri-State Differential Outage Diagnosis
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.2rem 0 0" }}>
              Runs an independent edge probe against customer ports to distinguish App Crash vs Connector Failure vs Full Server Outage.
            </p>
          </div>
          <button
            onClick={handleRunProbe}
            disabled={probing}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              background: probing ? "rgba(255, 255, 255, 0.1)" : "linear-gradient(135deg, #06b6d4, #0284c7)",
              border: "none",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: probing ? "not-allowed" : "pointer",
            }}
          >
            {probing ? "Probing Target..." : "Execute Health Probe"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <input
            type="text"
            value={probeUrl}
            onChange={(e) => setProbeUrl(e.target.value)}
            placeholder="http://customer-server-ip:port"
            style={{
              flex: 1,
              padding: "0.55rem 0.85rem",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f8fafc",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
        </div>

        {probeResult && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: probeResult.probe?.isReachable ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${probeResult.probe?.isReachable ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              borderRadius: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", color: probeResult.probe?.isReachable ? "#86efac" : "#fca5a5" }}>
              <span>{probeResult.probe?.isReachable ? "✓" : "⚠️"}</span>
              Diagnosis: {probeResult.evaluation?.diagnosis.toUpperCase()} (HTTP {probeResult.probe?.statusCode || "N/A"} in {probeResult.probe?.latencyMs}ms)
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "#e2e8f0" }}>
              {probeResult.evaluation?.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Logs Controls & Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["all", "info", "warning", "critical", "security"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: filterSeverity === sev ? "#38bdf8" : "rgba(255, 255, 255, 0.1)",
                background: filterSeverity === sev ? "rgba(56, 189, 248, 0.15)" : "transparent",
                color: filterSeverity === sev ? "#38bdf8" : "#94a3b8",
                fontSize: "0.78rem",
                cursor: "pointer",
                textTransform: "capitalize",
                fontWeight: filterSeverity === sev ? 700 : 500,
              }}
            >
              {sev}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter logs by message or source..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "0.4rem 0.75rem",
            borderRadius: "6px",
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#f8fafc",
            fontSize: "0.82rem",
            width: "280px",
            outline: "none",
          }}
        />
      </div>

      {/* Logs Table */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px 100px 90px 1fr 180px",
            padding: "0.75rem 1rem",
            background: "rgba(0, 0, 0, 0.4)",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div>Time</div>
          <div>Category</div>
          <div>Severity</div>
          <div>Event Details</div>
          <div>Source</div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
            Streaming observability telemetry from Supabase...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
            No log events recorded matching the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSec = log.type === "SECURITY";
            const isCrit = log.severity === "critical";
            const isWarn = log.severity === "warning";
            const sevColor = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : isSec ? "#a855f7" : "#38bdf8";

            return (
              <div
                key={log.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 100px 90px 1fr 180px",
                  padding: "0.65rem 1rem",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  fontSize: "0.8rem",
                  alignItems: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.74rem", fontFamily: "ui-monospace, monospace" }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.06)",
                      color: "#cbd5e1",
                      fontWeight: 600,
                    }}
                  >
                    {log.type}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: sevColor,
                      textTransform: "uppercase",
                    }}
                  >
                    {log.severity}
                  </span>
                </div>
                <div style={{ color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.message}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                  {log.source}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
