"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import MovingBlocks3D from "@/components/MovingBlocks3D";

interface ConnectedServer {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  provider: string;
  status: "healthy" | "degraded" | "unreachable";
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
}

interface DatabaseTask {
  id: string;
  title: string;
  task_type: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // Navigation State
  const [activeTab, setActiveTab] = useState<"home" | "websites" | "changes" | "settings">("home");

  // User & Organization State
  const [userEmail, setUserEmail] = useState<string>("developer@company.com");
  const [orgName, setOrgName] = useState<string>("Nova Studio");
  const [websiteDomain, setWebsiteDomain] = useState<string>("novastudio.agency");

  // Live Database Data
  const [servers, setServers] = useState<ConnectedServer[]>([]);
  const [tasks, setTasks] = useState<DatabaseTask[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Command & Modal State
  const [selectedWebsite, setSelectedWebsite] = useState<string>("Nova Studio");
  const [promptText, setPromptText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const suggestedChanges = [
    { id: "modern", icon: "✨", text: "Make my homepage more modern" },
    { id: "dark", icon: "🌙", text: "Add dark mode" },
    { id: "mobile", icon: "📱", text: "Improve the mobile layout" },
    { id: "colors", icon: "🎨", text: "Change the website colors" },
    { id: "pricing", icon: "➕", text: "Add a pricing section" },
    { id: "nav", icon: "🔑", text: "Fix the navigation menu" },
  ];

  // 1. Fetch Real Database & Auth Data on Mount
  useEffect(() => {
    async function loadWorkspaceData() {
      setLoadingData(true);
      try {
        // Authenticate User
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          const namePart = user.user_metadata?.full_name || user.email.split("@")[0];
          setOrgName(`${namePart}'s Studio`);
          setWebsiteDomain(`${namePart.toLowerCase().replace(/[^a-z0-9]/g, "")}.agency`);
          setSelectedWebsite(`${namePart}'s Studio`);
        }

        // Fetch Live Connected Servers / Websites
        const serverResp = await fetch("/api/servers");
        if (serverResp.ok) {
          const serverData = await serverResp.json();
          if (Array.isArray(serverData.servers) && serverData.servers.length > 0) {
            setServers(serverData.servers);
          }
        }

        // Fetch Live Tasks from Database
        const taskResp = await fetch("/api/tasks");
        if (taskResp.ok) {
          const taskData = await taskResp.json();
          if (Array.isArray(taskData.tasks)) {
            setTasks(taskData.tasks);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadWorkspaceData();
  }, [supabase]);

  // 2. Submit AI Prompt & Navigate to Live Agent Workbench
  async function handlePromptSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!promptText.trim()) return;

    setIsProcessing(true);
    setStatusMessage(`Analyzing ${selectedWebsite} and dispatching plan to AI orchestrator...`);

    try {
      // Create real task in database
      const taskReq = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText.trim(),
        }),
      });

      if (taskReq.ok) {
        const taskData = await taskReq.json();
        // Route to chat with task context
        router.push(`/chat?prompt=${encodeURIComponent(promptText.trim())}&taskId=${taskData.task?.id || ""}`);
        return;
      }
    } catch {
      // Fallback direct navigation
    }

    // Direct navigation if background queue active
    setTimeout(() => {
      router.push(`/chat?prompt=${encodeURIComponent(promptText.trim())}`);
    }, 600);
  }

  function handleChipClick(chipText: string) {
    setPromptText(chipText);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "rgba(5, 7, 14, 0.68)",
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.032) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.032) 1px, transparent 1px)
        `,
        backgroundSize: "36px 36px",
        backgroundPosition: "center center",
        color: "#f8fafc",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* 3D Animated Kinetic Moving Blocks Background */}
      <MovingBlocks3D density="normal" interactive={true} />

      {/* Central Ambient Glow */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "400px",
          background: "radial-gradient(ellipse, rgba(99, 102, 241, 0.16) 0%, rgba(6, 182, 212, 0.06) 50%, transparent 70%)",
          filter: "blur(85px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* TOP NAVIGATION BAR */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          backgroundColor: "rgba(5, 7, 14, 0.82)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
          padding: "0.75rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {/* Left: Brand Logo & Website Dropdown Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "1rem",
                  boxShadow: "0 0 14px rgba(99, 102, 241, 0.5)",
                }}
              >
                ✦
              </div>
              <span
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#ffffff",
                }}
              >
                RYVIX
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  background: "rgba(99, 102, 241, 0.18)",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  color: "#a5b4fc",
                  letterSpacing: "0.05em",
                }}
              >
                AI EDITOR
              </span>
            </Link>

            {/* Current Website Pill Selector with Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowWebsiteModal(!showWebsiteModal)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.35rem 0.85rem",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "#ffffff",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>
                    {selectedWebsite}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    {websiteDomain}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.2rem" }}>
                  ▾
                </span>
              </button>

              {/* Dropdown Menu */}
              {showWebsiteModal && (
                <div
                  style={{
                    position: "absolute",
                    top: "115%",
                    left: 0,
                    width: "240px",
                    background: "rgba(15, 23, 42, 0.96)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "0.4rem",
                    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.7)",
                    zIndex: 60,
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, padding: "0.4rem 0.6rem", textTransform: "uppercase" }}>
                    Connected Sites &amp; Nodes
                  </div>
                  <div
                    onClick={() => {
                      setSelectedWebsite(orgName);
                      setShowWebsiteModal(false);
                    }}
                    style={{
                      padding: "0.5rem 0.6rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      color: selectedWebsite === orgName ? "#38bdf8" : "#f1f5f9",
                      background: selectedWebsite === orgName ? "rgba(56, 189, 248, 0.12)" : "transparent",
                    }}
                  >
                    🌐 {orgName} (Default)
                  </div>
                  {servers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedWebsite(s.hostname);
                        setWebsiteDomain(`${s.ip}`);
                        setShowWebsiteModal(false);
                      }}
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: selectedWebsite === s.hostname ? "#38bdf8" : "#cbd5e1",
                        background: selectedWebsite === s.hostname ? "rgba(56, 189, 248, 0.12)" : "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>💻 {s.hostname}</span>
                      <span style={{ fontSize: "0.7rem", color: "#10b981" }}>{s.status}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      marginTop: "0.3rem",
                      paddingTop: "0.3rem",
                    }}
                  >
                    <Link
                      href="/servers"
                      style={{
                        display: "block",
                        padding: "0.4rem 0.6rem",
                        fontSize: "0.78rem",
                        color: "#818cf8",
                        textDecoration: "none",
                      }}
                    >
                      + Connect New Website or Server &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Navigation Pill Tabs */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "9999px",
              padding: "3px",
              gap: "2px",
            }}
          >
            <button
              onClick={() => setActiveTab("home")}
              style={{
                padding: "0.38rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "none",
                background: activeTab === "home" ? "#3b82f6" : "transparent",
                color: activeTab === "home" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab("websites")}
              style={{
                padding: "0.38rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 500,
                border: "none",
                background: activeTab === "websites" ? "#3b82f6" : "transparent",
                color: activeTab === "websites" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              My Websites
            </button>
            <Link
              href="/chat"
              style={{
                padding: "0.38rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 500,
                border: "none",
                textDecoration: "none",
                color: "var(--text-secondary)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>✦</span> AI Assistant
            </Link>
            <button
              onClick={() => setActiveTab("changes")}
              style={{
                padding: "0.38rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 500,
                border: "none",
                background: activeTab === "changes" ? "#3b82f6" : "transparent",
                color: activeTab === "changes" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Changes
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              style={{
                padding: "0.38rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 500,
                border: "none",
                background: activeTab === "settings" ? "#3b82f6" : "transparent",
                color: activeTab === "settings" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Settings
            </button>
          </nav>

          {/* Right: Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                padding: "0.42rem 0.85rem",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>&lt;/&gt;</span> Advanced Details
            </button>
            <Link
              href="/servers"
              style={{
                padding: "0.42rem 0.95rem",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#6ee7b7",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>+</span> Connect Website
            </Link>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "0.42rem 0.65rem",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* TAB 1: HOME (THE MAIN AI EDITOR INTENT INTERFACE) */}
      {activeTab === "home" && (
        <main
          style={{
            flex: 1,
            maxWidth: "1000px",
            width: "100%",
            margin: "0 auto",
            padding: "3.5rem 1.5rem 4rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Status Pill Indicator */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: "0.32rem 0.9rem",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "9999px",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "1.75rem",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }}
            />
            <span>Editing website:</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <span>🌐</span> {selectedWebsite}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                background: "rgba(255, 255, 255, 0.08)",
                padding: "0.1rem 0.35rem",
                borderRadius: "4px",
                color: "#94a3b8",
              }}
            >
              main
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 3.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              textAlign: "center",
              lineHeight: 1.15,
              marginBottom: "0.75rem",
              color: "#ffffff",
            }}
          >
            What would you like to change?
          </h1>

          {/* Subhead */}
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              textAlign: "center",
              marginBottom: "2.75rem",
              maxWidth: "600px",
            }}
          >
            Tell RYVIX what you want to change on your existing website.
          </p>

          {/* AI COMMAND BAR */}
          <form
            onSubmit={handlePromptSubmit}
            style={{
              width: "100%",
              maxWidth: "760px",
              position: "relative",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: "14px",
                padding: "0.65rem 0.75rem 0.65rem 1.25rem",
                boxShadow: "0 12px 35px -8px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.15)",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <span
                style={{
                  color: "#818cf8",
                  fontSize: "1.2rem",
                  marginRight: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ✦
              </span>
              <input
                type="text"
                placeholder="Describe a change to your website..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 400,
                  fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={isProcessing || !promptText.trim()}
                style={{
                  padding: "0.65rem 1.35rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: promptText.trim()
                    ? "linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)"
                    : "rgba(30, 41, 59, 0.6)",
                  color: promptText.trim() ? "#ffffff" : "#94a3b8",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: promptText.trim() ? "pointer" : "default",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  boxShadow: promptText.trim() ? "0 0 18px rgba(99, 102, 241, 0.45)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {isProcessing ? (
                  <>
                    <span className="pulse-dot" style={{ background: "#ffffff", width: "6px", height: "6px" }} />
                    Processing...
                  </>
                ) : (
                  <>
                    Ask AI <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Safety Notice */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "3rem",
              textAlign: "center",
            }}
          >
            <span style={{ color: "#10b981", fontSize: "0.95rem" }}>🛡️</span>
            <span>
              Safe editing: RYVIX creates an interactive preview first. Your live website is never updated without your approval.
            </span>
          </div>

          {/* SUGGESTED CHIPS */}
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "4.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#64748b",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Suggested Website Changes
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.65rem",
                justifyContent: "center",
              }}
            >
              {suggestedChanges.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipClick(chip.text)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "9999px",
                    background: "rgba(15, 23, 42, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    color: "#e2e8f0",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                    e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.85)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.09)";
                    e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.65)";
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4-STEP PIPELINE CARDS */}
          <div
            style={{
              width: "100%",
              maxWidth: "840px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              paddingTop: "2rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div
              style={{
                padding: "1.1rem 1rem",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step 1
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                Tell AI
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Natural language request
              </div>
            </div>

            <div
              style={{
                padding: "1.1rem 1rem",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step 2
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                AI Works
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Understands site &amp; edits
              </div>
            </div>

            <div
              style={{
                padding: "1.1rem 1rem",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step 3
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                Live Preview
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Review Before vs After
              </div>
            </div>

            <div
              style={{
                padding: "1.1rem 1rem",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step 4
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                Approve &amp; Live
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                One-click deployment
              </div>
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: MY WEBSITES (REAL DATABASE NODES) */}
      {activeTab === "websites" && (
        <main style={{ flex: 1, maxWidth: "1000px", width: "100%", margin: "0 auto", padding: "3rem 1.5rem", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Connected Websites &amp; Fleets</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Active infrastructure and repositories synchronized with your tenant organization.
              </p>
            </div>
            <Link
              href="/servers"
              className="btn-shimmer"
              style={{ padding: "0.6rem 1.2rem", fontSize: "0.85rem" }}
            >
              + Connect Node &rarr;
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {servers.map((s) => (
              <div
                key={s.id}
                className="glass-panel"
                style={{
                  padding: "1.25rem 1.5rem",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(15, 23, 42, 0.7)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "rgba(56, 189, 248, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38bdf8",
                    }}
                  >
                    🌐
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{s.hostname}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {s.ip} · {s.provider} · {s.os}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.65rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: s.status === "healthy" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: s.status === "healthy" ? "#34d399" : "#fbbf24",
                      border: s.status === "healthy" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    ● {s.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedWebsite(s.hostname);
                      setWebsiteDomain(s.ip);
                      setActiveTab("home");
                    }}
                    className="btn-secondary"
                    style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                  >
                    Edit Site
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* TAB 3: CHANGES (REAL DATABASE TASKS) */}
      {activeTab === "changes" && (
        <main style={{ flex: 1, maxWidth: "1000px", width: "100%", margin: "0 auto", padding: "3rem 1.5rem", position: "relative", zIndex: 10 }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Audit &amp; Change Log</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Real-time tasks, automated diffs, and AI edits recorded in Supabase.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {tasks.length > 0 ? (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="glass-panel"
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(15, 23, 42, 0.65)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{t.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Type: {t.task_type} · ID: {t.id.slice(0, 8)}... · {new Date(t.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "rgba(99, 102, 241, 0.15)",
                      color: "#a5b4fc",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                    }}
                  >
                    {t.status.toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
                No change requests yet. Type a change on the Home tab to dispatch your first AI edit!
              </div>
            )}
          </div>
        </main>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === "settings" && (
        <main style={{ flex: 1, maxWidth: "800px", width: "100%", margin: "0 auto", padding: "3rem 1.5rem", position: "relative", zIndex: 10 }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Workspace Settings</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Configure organization permissions, connected APIs, and AI models.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "2rem", borderRadius: "12px", background: "rgba(15, 23, 42, 0.75)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Current Authenticated Account
              </label>
              <input
                type="text"
                disabled
                value={userEmail}
                className="input-field"
                style={{ opacity: 0.8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Tenant Organization Workspace
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Active AI Reasoning Engine
              </label>
              <div style={{ padding: "0.75rem 1rem", background: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)", fontSize: "0.85rem", color: "#38bdf8" }}>
                ryvix-orchestrator-v1 (Hugging Face / Neural SRE)
              </div>
            </div>

            <div style={{ paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", color: "#10b981" }}>
                ● Supabase RLS Active &amp; Connected
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-secondary"
                style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#fca5a5" }}
              >
                Sign Out of Workspace
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ADVANCED DETAILS DRAWER / MODAL */}
      {showAdvanced && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "380px",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.8)",
            zIndex: 60,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
              Operational Telemetry
            </h3>
            <button
              onClick={() => setShowAdvanced(false)}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1rem" }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Autonomous Engine:</span>
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>ryvix-orchestrator-v1</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Threat Classifier:</span>
              <span style={{ color: "#10b981", fontWeight: 600 }}>0.208ms Neural Latency</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sandbox State:</span>
              <span style={{ color: "#c084fc", fontWeight: 600 }}>Docker Port Range 3100+</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Database Sync:</span>
              <span style={{ color: "#34d399", fontWeight: 600 }}>Supabase RLS Active</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Connected Nodes:</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{servers.length} Fleet Nodes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
