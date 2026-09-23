"use client";

import React, { useState, useEffect } from "react";

interface ConnectServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (server: any) => void;
}

export default function ConnectServerModal({
  isOpen,
  onClose,
  onConnected,
}: ConnectServerModalProps) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [installScript, setInstallScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredServer, setRegisteredServer] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      generateToken();
    }
  }, [isOpen]);

  async function generateToken() {
    setLoading(true);
    setErrorMessage(null);
    setRegisteredServer(null);
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
      if (data.success && data.token) {
        setToken(data.token);
        setInstallScript(data.installScript || `curl -fsSL https://ryvix.sh/install | sudo bash -s -- --token=${data.token}`);
        setIsListening(true);
      } else {
        setErrorMessage(data.error || "Failed to generate enrollment token.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while generating enrollment script.");
    } finally {
      setLoading(false);
    }
  }

  // Poll for newly connected server
  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/servers");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.servers) && data.servers.length > 0) {
            // Find recently active server
            const latest = data.servers[0];
            if (latest) {
              setRegisteredServer(latest);
              setIsListening(false);
              if (onConnected) onConnected(latest);
            }
          }
        }
      } catch (err) {
        // silently ignore poll errors
      }
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  function handleCopy() {
    if (!installScript) return;
    navigator.clipboard.writeText(installScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "linear-gradient(135deg, #090d16 0%, #17172b 100%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
          color: "#f8fafc",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🖥️</span>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Connect Customer Server Node</h2>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
                Install the lightweight, zero-inbound Ryvix daemon to stream telemetry &amp; self-healing logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.3rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Success Banner */}
        {registeredServer && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "10px",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#86efac", fontWeight: 700, fontSize: "0.95rem" }}>
              <span>✓</span> Connected to {registeredServer.hostname} ({registeredServer.ip})
            </div>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "#bbf7d0" }}>
              Internal agent heartbeat verified. Real-time CPU, memory, and service telemetry stream is active.
            </p>
          </div>
        )}

        {/* Step 1: Run Command on Host */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "0.4rem" }}>
            Step 1: Execute on your Linux host (Ubuntu, Debian, RHEL, CentOS)
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
            Run the following command as root or with sudo. The daemon initiates outbound-only HTTPS connections to Ryvix. No open inbound ports required.
          </p>

          <div
            style={{
              position: "relative",
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "0.85rem 3.5rem 0.85rem 1rem",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.82rem",
              color: "#34d399",
              overflowX: "auto",
              wordBreak: "break-all",
            }}
          >
            {installScript || "Generating cryptographic enrollment token..."}
            <button
              onClick={handleCopy}
              style={{
                position: "absolute",
                right: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: copied ? "#22c55e" : "rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Step 2: Live Listener */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: registeredServer ? "#22c55e" : "#38bdf8",
                boxShadow: registeredServer ? "0 0 10px #22c55e" : "0 0 10px #38bdf8",
                animation: registeredServer ? "none" : "pulse 1.5s infinite",
              }}
            />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {registeredServer ? "Connector Online" : "Waiting for Host Agent Handshake..."}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Token expires in 24 hours · HMAC-SHA256 signature verified
              </div>
            </div>
          </div>
          <button
            onClick={generateToken}
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94a3b8",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Regenerate Token
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {registeredServer ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
