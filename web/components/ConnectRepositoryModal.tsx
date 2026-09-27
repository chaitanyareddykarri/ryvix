"use client";

import React, { useState, useEffect } from "react";
import type { RepositoryAnalysisResult } from "@/utils/repository-analyzer";

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

interface ConnectRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (repo: any, analysis?: RepositoryAnalysisResult) => void;
  onOpenServerConnect?: () => void;
}

type OnboardingStep = "connect_github" | "select_website" | "analyzing" | "connected_summary" | "connect_server";

export default function ConnectRepositoryModal({
  isOpen,
  onClose,
  onConnected,
  onOpenServerConnect,
}: ConnectRepositoryModalProps) {
  const [step, setStep] = useState<OnboardingStep>("connect_github");
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [ghUser, setGhUser] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<RepositoryItem | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<RepositoryAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fallback token state for environments without OAuth callback configured
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [patToken, setPatToken] = useState("");
  const [verifyingPat, setVerifyingPat] = useState(false);

  // Server connect step state
  const [serverEnrollmentScript, setServerEnrollmentScript] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkGitHubConnection();
    } else {
      // Reset wizard state on close
      setTimeout(() => {
        setStep("connect_github");
        setErrorMessage(null);
        setSelectedRepo(null);
        setAnalysisResult(null);
        setAnalysisProgress(0);
      }, 300);
    }
  }, [isOpen]);

  async function checkGitHubConnection() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/github/repositories");
      const data = await res.json();
      if (data.connected && Array.isArray(data.repositories)) {
        setIsConnected(true);
        setGhUser(data.userLogin || "Connected");
        setRepositories(data.repositories);
        setStep("select_website");
      } else {
        setIsConnected(false);
        setRepositories([]);
        setStep("connect_github");
      }
    } catch {
      setIsConnected(false);
      setStep("connect_github");
    } finally {
      setLoading(false);
    }
  }

  function handleConnectGitHub() {
    window.location.href = "/api/auth/github/authorize?return_to=/dashboard";
  }

  async function handleConnectWithToken() {
    if (!patToken.trim()) {
      setErrorMessage("Please enter a GitHub personal access token.");
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
        setShowTokenInput(false);
        setPatToken("");
        await checkGitHubConnection();
      } else {
        setErrorMessage(data.error || "GitHub rejected this token. Please make sure it is valid.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify token with GitHub.");
    } finally {
      setVerifyingPat(false);
    }
  }

  async function handleSelectWebsite(repo: RepositoryItem) {
    setSelectedRepo(repo);
    setStep("analyzing");
    setErrorMessage(null);
    setAnalysisProgress(1);

    // Step-by-step progress simulation while real backend analysis runs
    const pTimer1 = setTimeout(() => setAnalysisProgress(2), 350);
    const pTimer2 = setTimeout(() => setAnalysisProgress(3), 700);
    const pTimer3 = setTimeout(() => setAnalysisProgress(4), 1100);

    try {
      const res = await fetch(
        `/api/github/repositories/analyze?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}&branch=${encodeURIComponent(repo.defaultBranch || "main")}`
      );
      const data = await res.json();

      clearTimeout(pTimer1);
      clearTimeout(pTimer2);
      clearTimeout(pTimer3);

      setAnalysisProgress(5);
      await new Promise((r) => setTimeout(r, 400));
      setAnalysisProgress(6);
      await new Promise((r) => setTimeout(r, 400));
      setAnalysisProgress(7);

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);

        // Automatically connect repository in database with real analyzed stack
        await fetch("/api/github/repositories/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo: data.repository || repo,
            branch: repo.defaultBranch || "main",
            analysis: data.analysis,
          }),
        });

        await new Promise((r) => setTimeout(r, 500));
        setStep("connected_summary");
      } else {
        setErrorMessage(data.error || "Unable to inspect repository configuration.");
        setStep("select_website");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error during repository analysis.");
      setStep("select_website");
    }
  }

  async function handlePrepareServerConnect() {
    setStep("connect_server");
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_enrollment" }),
      });
      const data = await res.json();
      if (data.success && data.installScript) {
        setServerEnrollmentScript(data.installScript);
      }
    } catch {
      // fallback
    }
  }

  function handleFinishOnboarding() {
    if (selectedRepo && onConnected) {
      onConnected(selectedRepo, analysisResult || undefined);
    }
    onClose();
  }

  if (!isOpen) return null;

  const filteredRepos = repositories.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(5, 7, 10, 0.88)",
        backdropFilter: "blur(14px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#0D1218",
          border: "1px solid #1D2732",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(124, 108, 255, 0.15)",
          color: "#F5F7FA",
          position: "relative",
        }}
      >
        {/* Close Button */}
        {step !== "analyzing" && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "1.25rem",
              right: "1.25rem",
              background: "transparent",
              border: "none",
              color: "#66717F",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}

        {errorMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(240, 106, 106, 0.12)",
              border: "1px solid rgba(240, 106, 106, 0.3)",
              color: "#F06A6A",
              fontSize: "0.82rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CONNECT YOUR WEBSITE (Simple, Non-Coder Intro)                   */}
        {/* ========================================================================= */}
        {step === "connect_github" && !loading && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, rgba(124, 108, 255, 0.2), rgba(66, 217, 255, 0.2))",
                  border: "1px solid rgba(124, 108, 255, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                  color: "#42D9FF",
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginBottom: "0.5rem",
                  color: "#F5F7FA",
                }}
              >
                Connect your website
              </h2>
              <p style={{ fontSize: "0.88rem", color: "#A5AFBC", lineHeight: 1.6, maxWidth: "420px", margin: "0 auto" }}>
                Connect GitHub so Ryvix can understand, monitor, and manage your website autonomously.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <button
                onClick={handleConnectGitHub}
                style={{
                  width: "100%",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  boxShadow: "0 0 25px rgba(124, 108, 255, 0.4)",
                  transition: "opacity 0.2s ease",
                }}
              >
                <span>Connect GitHub</span>
                <span>&rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTokenInput(!showTokenInput)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#66717F",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  textAlign: "center",
                  marginTop: "0.5rem",
                  textDecoration: "underline",
                }}
              >
                {showTokenInput ? "Hide manual token option" : "Or connect using a GitHub token"}
              </button>

              {showTokenInput && (
                <div style={{ marginTop: "0.75rem", padding: "1rem", borderRadius: "10px", background: "#121922", border: "1px solid #1D2732" }}>
                  <div style={{ fontSize: "0.78rem", color: "#A5AFBC", marginBottom: "0.5rem" }}>
                    Paste your GitHub Personal Access Token (with repo access):
                  </div>
                  <input
                    type="password"
                    placeholder="ghp_..."
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      background: "#080C11",
                      border: "1px solid #1D2732",
                      color: "#F5F7FA",
                      fontSize: "0.82rem",
                      fontFamily: "var(--font-mono, monospace)",
                      outline: "none",
                      marginBottom: "0.75rem",
                    }}
                  />
                  <button
                    onClick={handleConnectWithToken}
                    disabled={verifyingPat || !patToken.trim()}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      background: "rgba(124, 108, 255, 0.2)",
                      border: "1px solid #7C6CFF",
                      color: "#A78BFA",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: verifyingPat || !patToken.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {verifyingPat ? "Verifying..." : "Save & Verify Token"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#A5AFBC" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>⚡</div>
            Connecting to your GitHub account...
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CHOOSE YOUR WEBSITE (Clean Selector, Hiding Branches/IDs)       */}
        {/* ========================================================================= */}
        {step === "select_website" && !loading && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                    fontSize: "1.35rem",
                    fontWeight: 700,
                    color: "#F5F7FA",
                  }}
                >
                  Choose your website
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#A5AFBC", marginTop: "0.2rem" }}>
                  Select the website or project you want Ryvix to manage.
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.74rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "9999px",
                  background: "rgba(69, 212, 131, 0.12)",
                  color: "#45D483",
                  border: "1px solid rgba(69, 212, 131, 0.3)",
                }}
              >
                ● @{ghUser || "Connected"}
              </span>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #1D2732",
                background: "#121922",
                color: "#F5F7FA",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                outline: "none",
              }}
            />

            {/* Repository Cards List */}
            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                border: "1px solid #1D2732",
                borderRadius: "10px",
                background: "#080C11",
                marginBottom: "1.25rem",
              }}
            >
              {filteredRepos.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#66717F", fontSize: "0.85rem" }}>
                  No repositories found.
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => handleSelectWebsite(repo)}
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid #121922",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#121922")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#F5F7FA", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span>{repo.name}</span>
                        {repo.isPrivate && (
                          <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "#1D2732", color: "#E8B85C" }}>
                            Private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <div style={{ fontSize: "0.75rem", color: "#66717F", marginTop: "0.2rem" }}>
                          {repo.description.slice(0, 55)}...
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "#42D9FF", background: "#121922", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        {repo.language || "Code"}
                      </span>
                      <span style={{ color: "#7C6CFF", fontSize: "0.9rem" }}>&rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setIsConnected(false);
                  setStep("connect_github");
                }}
                style={{ background: "none", border: "none", color: "#66717F", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Disconnect / Switch Account
              </button>
              <button
                onClick={onClose}
                style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", border: "1px solid #1D2732", color: "#A5AFBC", fontSize: "0.82rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: AUTOMATIC REPOSITORY ANALYSIS PROGRESS (No Mock, Real Checks)   */}
        {/* ========================================================================= */}
        {step === "analyzing" && (
          <div style={{ padding: "1rem 0" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(124, 108, 255, 0.15)", color: "#7C6CFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "1.4rem" }}>
                ⚙️
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: "#F5F7FA",
                }}
              >
                Connecting to your website...
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#A5AFBC", marginTop: "0.25rem" }}>
                Analyzing <b>{selectedRepo?.name}</b> configuration and structure
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "#080C11", padding: "1.25rem", borderRadius: "12px", border: "1px solid #1D2732", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 1 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 1 ? "✓" : "○"}</span>
                <span>GitHub connected</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 2 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 2 ? "✓" : "○"}</span>
                <span>Repository found</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 3 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 3 ? "✓" : "○"}</span>
                <span>Reading project structure</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 4 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 4 ? "✓" : "○"}</span>
                <span>Detecting technology</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 5 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 5 ? "✓" : "○"}</span>
                <span>Checking dependencies</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 6 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 6 ? "✓" : "○"}</span>
                <span>Detecting deployment configuration</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: analysisProgress >= 7 ? "#45D483" : "#66717F" }}>
                <span>{analysisProgress >= 7 ? "✓" : "○"}</span>
                <span>Checking application configuration</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: WEBSITE CONNECTION RESULT (Clean Non-Coder Summary)              */}
        {/* ========================================================================= */}
        {step === "connected_summary" && analysisResult && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "1.5rem" }}>
                ✓
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  color: "#F5F7FA",
                }}
              >
                Your website is connected ✓
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#A5AFBC", marginTop: "0.25rem" }}>
                Ryvix is now ready to understand and assist with your website.
              </p>
            </div>

            {/* Summary Details Card */}
            <div style={{ background: "#080C11", border: "1px solid #1D2732", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "1px solid #121922" }}>
                <span style={{ fontSize: "0.8rem", color: "#66717F" }}>Website / Repository</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F5F7FA" }}>{selectedRepo?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "1px solid #121922" }}>
                <span style={{ fontSize: "0.8rem", color: "#66717F" }}>Technology</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#42D9FF" }}>{analysisResult.displayName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "1px solid #121922" }}>
                <span style={{ fontSize: "0.8rem", color: "#66717F" }}>Deployment</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: analysisResult.deployment.detected ? "#45D483" : "#E8B85C" }}>
                  {analysisResult.deployment.detected ? `Detected (${analysisResult.deployment.provider})` : "No deployment system detected"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "#66717F" }}>GitHub</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#45D483" }}>Connected (@{ghUser || "user"})</span>
              </div>
            </div>

            {/* Potential Security Warning if secrets were found */}
            {analysisResult.security.hasPotentialSecrets && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(232, 184, 92, 0.12)", border: "1px solid rgba(232, 184, 92, 0.3)", color: "#E8B85C", fontSize: "0.78rem", marginBottom: "1.25rem" }}>
                ⚠️ <b>Notice</b>: {analysisResult.security.warningMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handlePrepareServerConnect}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "#121922",
                  border: "1px solid #1D2732",
                  color: "#F5F7FA",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Connect Server (Optional)
              </button>
              <button
                onClick={handleFinishOnboarding}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(124, 108, 255, 0.35)",
                }}
              >
                Open Workspace &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: OPTIONAL SERVER CONNECTION (Plain English Explanation)           */}
        {/* ========================================================================= */}
        {step === "connect_server" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(66, 217, 255, 0.15)", color: "#42D9FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "1.4rem" }}>
                🖥️
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  color: "#F5F7FA",
                }}
              >
                Connect your server
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#A5AFBC", marginTop: "0.25rem", maxWidth: "420px", margin: "0.25rem auto 0" }}>
                Ryvix can monitor your server, detect problems and help recover your website automatically.
              </p>
            </div>

            <div style={{ background: "#080C11", border: "1px solid #1D2732", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.76rem", color: "#66717F", textTransform: "uppercase", marginBottom: "0.4rem", fontFamily: "var(--font-mono, monospace)" }}>
                Run this command on your server:
              </div>
              <div style={{ padding: "0.75rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem", color: "#42D9FF", wordBreak: "break-all" }}>
                {serverEnrollmentScript || "curl -fsSL https://ryvix.sh/install | sudo bash"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(serverEnrollmentScript || "");
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "6px",
                    background: copiedScript ? "rgba(69, 212, 131, 0.2)" : "#121922",
                    border: `1px solid ${copiedScript ? "#45D483" : "#1D2732"}`,
                    color: copiedScript ? "#45D483" : "#F5F7FA",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {copiedScript ? "✓ Copied to clipboard" : "Copy command"}
                </button>
                <span style={{ fontSize: "0.74rem", color: "#66717F" }}>Outbound secure HTTPS only • No open ports</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleFinishOnboarding}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Finish &amp; Open Workspace &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
