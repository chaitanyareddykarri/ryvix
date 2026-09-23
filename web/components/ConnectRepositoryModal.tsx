"use client";

import React, { useState, useEffect } from "react";

interface RepositoryItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string;
  language: string;
}

interface BranchItem {
  name: string;
  protected: boolean;
}

interface ConnectRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (repo: any) => void;
}

export default function ConnectRepositoryModal({
  isOpen,
  onClose,
  onConnected,
}: ConnectRepositoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [ghUser, setGhUser] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<RepositoryItem | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Token / PAT state
  const [patToken, setPatToken] = useState("");
  const [verifyingPat, setVerifyingPat] = useState(false);
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen]);

  async function loadRepositories() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/github/repositories");
      const data = await res.json();
      setOauthConfigured(Boolean(data.oauthConfigured));
      if (data.connected) {
        setIsConnected(true);
        setGhUser(data.userLogin || "Connected");
        setRepositories(data.repositories || []);
      } else {
        setIsConnected(false);
        setRepositories([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not contact GitHub API service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectWithToken() {
    if (!patToken.trim()) {
      setErrorMessage("Please paste a valid GitHub Personal Access Token.");
      return;
    }

    setVerifyingPat(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/github/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: patToken.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsConnected(true);
        setGhUser(data.userLogin);
        setStatusMessage(`Connected as @${data.userLogin}! Loading your repositories...`);
        setPatToken("");
        await loadRepositories();
      } else {
        setErrorMessage(data.error || "Token verification failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while verifying token.");
    } finally {
      setVerifyingPat(false);
    }
  }

  async function handleSelectRepo(repo: RepositoryItem) {
    setSelectedRepo(repo);
    setSelectedBranch(repo.defaultBranch || "main");
    setBranches([]);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/github/repositories?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}&branches=true`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
      } else {
        setBranches([{ name: repo.defaultBranch || "main", protected: false }]);
      }
    } catch (err) {
      setBranches([{ name: repo.defaultBranch || "main", protected: false }]);
    }
  }

  async function handleConfirmConnection() {
    if (!selectedRepo) return;
    setConnecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/github/repositories/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: selectedRepo.id,
          fullName: selectedRepo.fullName,
          owner: selectedRepo.owner,
          repoName: selectedRepo.name,
          selectedBranch,
          defaultBranch: selectedRepo.defaultBranch,
          isPrivate: selectedRepo.isPrivate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Successfully connected ${selectedRepo.fullName} on branch ${selectedBranch}!`);
        if (onConnected) onConnected(data.repository);
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
          setSelectedRepo(null);
        }, 1500);
      } else {
        setErrorMessage(data.error || "Failed to link repository.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while connecting repository.");
    } finally {
      setConnecting(false);
    }
  }

  if (!isOpen) return null;

  const filtered = repositories.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.fullName.toLowerCase().includes(search.toLowerCase())
  );

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
          maxWidth: "640px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
          color: "#f8fafc",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🐙</span>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Connect GitHub Repository</h2>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
                Select an authorized customer repository for autonomous AI operations
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

        {statusMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "8px",
              color: "#86efac",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            ✓ {statusMessage}
          </div>
        )}

        {/* State A: GitHub Not Connected Yet */}
        {!isConnected && !loading && (
          <div style={{ padding: "0.5rem 0" }}>
            {/* Quick Option 1: Personal Access Token (Instant) */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "12px",
                padding: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "1.1rem" }}>⚡</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8" }}>
                  Instant Connect via GitHub Token
                </span>
                <span style={{ fontSize: "0.68rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "0.15rem 0.45rem", borderRadius: "9999px", fontWeight: 700 }}>
                  RECOMMENDED
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 0.85rem" }}>
                Paste a GitHub Personal Access Token (classic or fine-grained with <code style={{ color: "#38bdf8" }}>repo</code> scope) to instantly list and connect your real repositories:
              </p>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="password"
                  placeholder="ghp_... or github_pat_..."
                  value={patToken}
                  onChange={(e) => setPatToken(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.55rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleConnectWithToken}
                  disabled={verifyingPat}
                  style={{
                    padding: "0.55rem 1.1rem",
                    borderRadius: "8px",
                    background: verifyingPat ? "rgba(255, 255, 255, 0.1)" : "linear-gradient(135deg, #0284c7, #2563eb)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: verifyingPat ? "not-allowed" : "pointer",
                  }}
                >
                  {verifyingPat ? "Connecting..." : "Connect"}
                </button>
              </div>

              <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "#64748b" }}>
                💡 Create a token in 30s: <a href="https://github.com/settings/tokens/new?scopes=repo,read:org" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>GitHub Token Settings (repo scope)</a>
              </div>
            </div>

            {/* Option 2: GitHub OAuth App */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f1f5f9" }}>
                    Standard GitHub OAuth
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.15rem" }}>
                    {oauthConfigured ? "OAuth credentials configured in .env.local" : "Requires GITHUB_CLIENT_ID in web/.env.local"}
                  </div>
                </div>

                {oauthConfigured ? (
                  <a
                    href="/api/auth/github/authorize"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.45rem 1rem",
                      background: "#24292f",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <span>🐙</span> Authorize via OAuth
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowOAuthGuide(!showOAuthGuide)}
                    style={{
                      padding: "0.4rem 0.85rem",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#94a3b8",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {showOAuthGuide ? "Hide Setup Guide" : "View OAuth Guide"}
                  </button>
                )}
              </div>

              {showOAuthGuide && (
                <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.8rem", color: "#94a3b8" }}>
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "#cbd5e1" }}>How to configure OAuth App:</p>
                  <ol style={{ paddingLeft: "1.2rem", margin: 0, lineHeight: 1.6 }}>
                    <li>Go to <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>GitHub Developer Settings &rarr; OAuth Apps &rarr; New OAuth App</a></li>
                    <li>Set Homepage URL to <code style={{ color: "#38bdf8" }}>http://localhost:3000</code></li>
                    <li>Set Authorization callback URL to <code style={{ color: "#38bdf8" }}>http://localhost:3000/api/auth/github/callback</code></li>
                    <li>Copy Client ID and Client Secret into <code style={{ color: "#38bdf8" }}>web/.env.local</code>:
                      <pre style={{ background: "rgba(0,0,0,0.5)", padding: "0.5rem", borderRadius: "6px", marginTop: "0.3rem", color: "#34d399" }}>
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
                      </pre>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State B: Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚡</div>
            Fetching accessible GitHub repositories...
          </div>
        )}

        {/* State C: Connected & Select Repository */}
        {isConnected && !loading && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#38bdf8" }}>
                ✓ Logged in as <b>@{ghUser}</b>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsConnected(false);
                  setRepositories([]);
                }}
                style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#94a3b8", textDecoration: "underline", cursor: "pointer" }}
              >
                Disconnect / Switch Token
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search repositories by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                fontSize: "0.85rem",
                marginBottom: "0.75rem",
                outline: "none",
              }}
            />

            {/* Repositories Scroll List */}
            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.2)",
                marginBottom: "1rem",
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                  No repositories found.
                </div>
              ) : (
                filtered.map((repo) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <div
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      style={{
                        padding: "0.65rem 0.85rem",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        cursor: "pointer",
                        background: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                        borderLeft: isSelected ? "3px solid #38bdf8" : "3px solid transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "#38bdf8" : "#f1f5f9" }}>
                          {repo.fullName}
                          {repo.isPrivate && (
                            <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", color: "#eab308" }}>🔒 private</span>
                          )}
                        </div>
                        {repo.description && (
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                            {repo.description.substring(0, 60)}...
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", background: "rgba(255, 255, 255, 0.06)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                        {repo.language || "code"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Branch Selection & Confirm */}
            {selectedRepo && (
              <div
                style={{
                  background: "rgba(56, 189, 248, 0.06)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Selected: {selectedRepo.fullName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Target Branch:</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    style={{
                      padding: "0.4rem 0.65rem",
                      borderRadius: "6px",
                      background: "#0f172a",
                      color: "#f8fafc",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      fontSize: "0.82rem",
                      outline: "none",
                    }}
                  >
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} {b.protected ? "(protected)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConnection}
                disabled={!selectedRepo || connecting}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  background: selectedRepo && !connecting ? "linear-gradient(135deg, #0284c7, #2563eb)" : "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: selectedRepo && !connecting ? "pointer" : "not-allowed",
                  opacity: selectedRepo && !connecting ? 1 : 0.6,
                }}
              >
                {connecting ? "Connecting..." : "Confirm & Connect Repository"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
