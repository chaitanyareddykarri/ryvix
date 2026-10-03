"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AppNav, { ReturnToDashboardButton } from "@/components/AppNav";

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
  const [logsError, setLogsError] = useState('');
  const logRequest = useRef<AbortController | null>(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // External Probe State
  const [probeUrl, setProbeUrl] = useState("");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
    return () => logRequest.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSeverity]);

  async function loadLogs() {
    logRequest.current?.abort();
    const abort = new AbortController();
    logRequest.current = abort;
    setLoading(true);
    setLogsError('');
    try {
      const res = await fetch(`/api/observability/logs?severity=${filterSeverity}&limit=60`, { signal: abort.signal });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.logs)) throw new Error(data.error || 'Observability records unavailable.');
      if (!abort.signal.aborted) setLogs(data.logs);
    } catch (err) {
      if (!abort.signal.aborted) { setLogs([]); setLogsError(err instanceof Error ? err.message : 'Observability records unavailable.'); }
    } finally {
      if (!abort.signal.aborted) setLoading(false);
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
    <div className="observability-page-container" style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 1.5rem", color: "#f8fafc", boxSizing: "border-box" }}>
      {/* Responsive Styles for Observability Page */}
      <style>{`
        .observability-table-scroll-wrapper::-webkit-scrollbar {
          height: 6px;
        }
        .observability-table-scroll-wrapper::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .observability-table-scroll-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .observability-table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        @media (max-width: 640px) {
          .observability-page-container {
            padding: 1.5rem 1rem !important;
          }
          .observability-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .observability-nav {
            width: 100% !important;
            gap: 0.45rem !important;
          }
          .observability-nav > * {
            font-size: 0.8rem !important;
            padding: 0.38rem 0.75rem !important;
          }
          .observability-diagnostic-card {
            padding: 1.25rem 1rem !important;
          }
          .observability-diagnostic-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .observability-probe-btn {
            width: 100% !important;
            text-align: center !important;
            justify-content: center !important;
          }
          .observability-controls-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.85rem !important;
          }
          .observability-filter-group {
            width: 100% !important;
          }
          .observability-search-input {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
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
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Observability</span>
      </div>

      {/* Header */}
      <header className="observability-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ maxWidth: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
                RY<span style={{ color: "#38bdf8" }}>VIX</span>
              </h1>
            </Link>
            <span style={{ fontSize: "0.82rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "0.2rem 0.65rem", borderRadius: "9999px", fontWeight: 600 }}>
              Observability &amp; Outage Diagnostic Center
            </span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: "0.25rem", margin: "0.25rem 0 0", maxWidth: "100%", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.45 }}>
            Correlated dual-path telemetry: In-host connector heartbeats, external probes &amp; security event logs
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <AppNav className="observability-nav" />
          <ReturnToDashboardButton />
        </div>
      </header>

      {/* Top Diagnostic Probe Widget */}
      <div
        className="observability-diagnostic-card"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 27, 75, 0.8))",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <div className="observability-diagnostic-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ maxWidth: "100%", minWidth: 0 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, wordBreak: "break-word" }}>
              📡 Tri-State Differential Outage Diagnosis
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.2rem 0 0", wordBreak: "break-word", overflowWrap: "break-word", lineHeight: 1.4 }}>
              Runs an independent edge probe against customer ports to distinguish App Crash vs Connector Failure vs Full Server Outage.
            </p>
          </div>
          <button
            onClick={handleRunProbe}
            disabled={probing}
            className="observability-probe-btn"
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              background: probing ? "rgba(255, 255, 255, 0.1)" : "linear-gradient(135deg, #06b6d4, #0284c7)",
              border: "none",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: probing ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {probing ? "Probing Target..." : "Execute Health Probe"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
          <input
            type="text"
            value={probeUrl}
            onChange={(e) => setProbeUrl(e.target.value)}
            placeholder="https://your-application.example/health"
            className="observability-probe-input"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              flex: "1 1 100%",
              boxSizing: "border-box",
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
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", color: probeResult.probe?.isReachable ? "#86efac" : "#fca5a5", flexWrap: "wrap", wordBreak: "break-word" }}>
              <span>{probeResult.probe?.isReachable ? "✓" : "⚠️"}</span>
              <span style={{ wordBreak: "break-word" }}>
                {probeResult.error || `Diagnosis: ${probeResult.evaluation?.diagnosis?.toUpperCase() || 'UNKNOWN'} (HTTP ${probeResult.probe?.statusCode || 'N/A'} in ${probeResult.probe?.latencyMs ?? 'unavailable'}ms)`}
              </span>
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "#e2e8f0", wordBreak: "break-word", overflowWrap: "break-word" }}>
              {probeResult.evaluation?.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Logs Controls & Filters */}
      <div className="observability-controls-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div className="observability-filter-group" style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", maxWidth: "100%" }}>
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
                whiteSpace: "nowrap",
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
          className="observability-search-input"
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: "6px",
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#f8fafc",
            fontSize: "0.82rem",
            width: "280px",
            maxWidth: "100%",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Logs Table Container */}
      <div
        className="observability-table-card"
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {logsError ? (
          <div role="alert" style={{ padding: "2.5rem 1rem", color: "#fca5a5", textAlign: "center", width: "100%", boxSizing: "border-box", overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {logsError}
          </div>
        ) : loading ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", width: "100%", boxSizing: "border-box" }}>
            Loading recent observability records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", width: "100%", boxSizing: "border-box" }}>
            No log events recorded matching the current filter.
          </div>
        ) : (
          <div
            className="observability-table-scroll-wrapper"
            style={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              boxSizing: "border-box",
            }}
          >
            <div style={{ minWidth: "640px" }}>
              {/* Header Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 100px 90px 1fr 160px",
                  padding: "0.75rem 1rem",
                  background: "rgba(0, 0, 0, 0.4)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>Time</div>
                <div>Category</div>
                <div>Severity</div>
                <div>Event Details</div>
                <div>Source</div>
              </div>

              {/* Data Rows */}
              {filteredLogs.map((log) => {
                const isSec = log.type === "SECURITY";
                const isCrit = log.severity === "critical";
                const isWarn = log.severity === "warning";
                const sevColor = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : isSec ? "#a855f7" : "#38bdf8";

                return (
                  <div
                    key={log.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "130px 100px 90px 1fr 160px",
                      padding: "0.65rem 1rem",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      fontSize: "0.8rem",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: "0.74rem", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
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
                    <div style={{ color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.message}>
                      {log.message}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.source}>
                      {log.source}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
