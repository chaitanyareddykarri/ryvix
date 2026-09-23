"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ThoughtTrace {
  type: "system1" | "system2" | "rag";
  label: string;
  content: string;
  action?: string;
  executableCommand?: string;
  latencyMs?: number;
  branches?: number;
}

interface ActionPlan {
  primaryDomain: string;
  intent: string;
  blastRadius: string;
  actionPlan: string[];
  confidence: number;
}

interface DiffPayload {
  diff: string;
  filesChanged: string[];
  suggestedCommitMessage?: string;
}

interface ApprovalPayload {
  approvalId: string;
  title: string;
  action: string;
  blastRadius: string;
  riskScore: number;
  suggestedSteps: string[];
  mitigationCommand?: string;
  requiresApproval: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  thoughts?: ThoughtTrace[];
  plan?: ActionPlan;
  diff?: DiffPayload;
  approval?: ApprovalPayload;
  metrics?: {
    durationMs?: number;
  };
}

const STARTER_PROMPTS = [
  {
    title: "Triage Port 3000 EADDRINUSE Conflict",
    prompt: "We are getting EADDRINUSE port 3000 errors on web-edge-01. How do we triage and perform zero-downtime swap?",
    icon: "⚡"
  },
  {
    title: "SSRF Cloud Metadata Containment",
    prompt: "A microservice received request targeting link-local IP 169.254.169.254. How do we contain IMDS exfiltration?",
    icon: "🛡️"
  },
  {
    title: "Add Healthcheck Endpoint",
    prompt: "Add a production healthcheck endpoint to the backend API with memory and database ping checks.",
    icon: "💻"
  },
  {
    title: "Postgres Pool Exhaustion",
    prompt: "PostgreSQL pool connections reached 100/100 and queries are timing out. Generate diagnosis and remediation.",
    icon: "🔍"
  }
];

export default function WebChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      content: "Hello! I am **Ryvix AGI**, your autonomous engineering and infrastructure partner. I can write and review code diffs, triage server outages, contain security threats, and execute verified operational runbooks in sub-millisecond cycles.\n\nHow can I assist your infrastructure or codebase today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "diff" | "preview">("chat");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeDiff, setActiveDiff] = useState<DiffPayload | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [approvedActions, setApprovedActions] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-send or prefill prompt if passed from Dashboard AI command bar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryPrompt = params.get("prompt");
      if (queryPrompt && !isStreaming) {
        handleSendMessage(queryPrompt);
      }
    }
  }, []);

  const toggleThoughts = (msgId: string) => {
    setExpandedThoughts(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleApproveAction = (approvalId: string, actionName: string) => {
    setApprovedActions(prev => ({ ...prev, [approvalId]: true }));
    const systemAckMsg: ChatMessage = {
      id: `ack_${Date.now()}`,
      role: "system",
      content: `✅ **Action Authorized & Executed**: ` + actionName + `\nExecution status dispatched to Ryvix Cluster Orchestrator with audit record created.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, systemAckMsg]);
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isStreaming) return;

    setInputPrompt("");
    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `asst_${Date.now()}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      thoughts: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage, initialAssistantMessage]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, stream: true }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to communicate with Ryvix AGI.`);
      }

      if (!response.body) {
        throw new Error("No response body received from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;
          const lines = rawEvent.split("\n");
          let eventType = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim();
            }
          }

          if (!dataStr) continue;
          let parsedData: any = null;
          try {
            parsedData = JSON.parse(dataStr);
          } catch {
            continue;
          }

          setMessages(prev =>
            prev.map(msg => {
              if (msg.id !== assistantMsgId) return msg;

              if (eventType === "token") {
                return {
                  ...msg,
                  content: (msg.content || "") + (parsedData.chunk || "")
                };
              } else if (eventType === "thought") {
                const currentThoughts = msg.thoughts || [];
                return {
                  ...msg,
                  thoughts: [...currentThoughts, parsedData]
                };
              } else if (eventType === "plan") {
                return {
                  ...msg,
                  plan: parsedData
                };
              } else if (eventType === "diff") {
                setActiveDiff(parsedData);
                return {
                  ...msg,
                  diff: parsedData
                };
              } else if (eventType === "approval") {
                return {
                  ...msg,
                  approval: parsedData
                };
              } else if (eventType === "done") {
                return {
                  ...msg,
                  metrics: { durationMs: parsedData.totalDurationMs }
                };
              }
              return msg;
            })
          );
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + "\n\n*[Stream stopped by user]*" }
              : msg
          )
        );
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMsgId
              ? { ...msg, content: `⚠️ **Communication Error**: ${err.message}` }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#090d16", color: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* 1. Header Bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>
              RY<span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VIX</span>
            </span>
            <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", fontWeight: 700, border: "1px solid rgba(139, 92, 246, 0.3)" }}>
              AGI CHAT
            </span>
          </Link>

          <div style={{ height: "18px", width: "1px", background: "rgba(255, 255, 255, 0.15)" }} />

          {/* Project & Cluster Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            <span>Project:</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600, background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
              prod-core-infrastructure (main)
            </span>
          </div>
        </div>

        {/* Telemetry Sparkline & View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Status Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "0.2rem 0.55rem", borderRadius: "9999px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
              Cluster Healthy
            </span>
            <span style={{ color: "#94a3b8" }}>CPU: <strong style={{ color: "#cbd5e1" }}>18%</strong></span>
            <span style={{ color: "#94a3b8" }}>RAM: <strong style={{ color: "#cbd5e1" }}>32%</strong></span>
          </div>

          <div style={{ height: "18px", width: "1px", background: "rgba(255, 255, 255, 0.15)" }} />

          {/* Nav Links */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/servers" style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", color: "#cbd5e1", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
              🖥️ Servers
            </Link>
            <Link href="/tasks" style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", color: "#cbd5e1", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
              📋 Tasks &amp; PRs
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Dual-Pane Workspace */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Pane: Conversation Thread & Thought Stream */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: activeDiff ? "1px solid rgba(255,255,255,0.08)" : "none", overflow: "hidden" }}>
          
          {/* Tab Selector Header if Diff / Preview Active */}
          {activeDiff && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0b101b" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setActiveTab("chat")}
                  style={{ padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer", background: activeTab === "chat" ? "#3b82f6" : "transparent", color: activeTab === "chat" ? "#fff" : "#94a3b8" }}
                >
                  💬 Conversation
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  style={{ padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer", background: activeTab === "diff" ? "#8b5cf6" : "transparent", color: activeTab === "diff" ? "#fff" : "#94a3b8" }}
                >
                  📝 Unified Diff ({activeDiff.filesChanged.length} Files)
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  style={{ padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer", background: activeTab === "preview" ? "#10b981" : "transparent", color: activeTab === "preview" ? "#fff" : "#94a3b8" }}
                >
                  🌐 Live Preview
                </button>
              </div>

              {activeTab === "preview" && (
                <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.06)", padding: "0.2rem", borderRadius: "6px" }}>
                  {(["desktop", "tablet", "mobile"] as const).map(dev => (
                    <button
                      key={dev}
                      onClick={() => setPreviewDevice(dev)}
                      style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", border: "none", cursor: "pointer", textTransform: "capitalize", background: previewDevice === dev ? "rgba(255,255,255,0.15)" : "transparent", color: previewDevice === dev ? "#fff" : "#94a3b8" }}
                    >
                      {dev}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message List Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "100%"
                }}
              >
                {/* Header: Role & Timestamp */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", fontSize: "0.75rem", color: "#64748b" }}>
                  <span style={{ fontWeight: 700, color: msg.role === "user" ? "#60a5fa" : msg.role === "assistant" ? "#c084fc" : "#f59e0b" }}>
                    {msg.role === "user" ? "You" : msg.role === "assistant" ? "Ryvix AGI Core" : "System Dispatch"}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.metrics?.durationMs && (
                    <span style={{ color: "#34d399", background: "rgba(16,185,129,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                      ⚡ {(msg.metrics.durationMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>

                {/* Message Bubble / Container */}
                <div
                  style={{
                    maxWidth: msg.role === "user" ? "75%" : "88%",
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    background: msg.role === "user" ? "#1e293b" : msg.role === "system" ? "rgba(245, 158, 11, 0.1)" : "#0f172a",
                    border: msg.role === "user" ? "1px solid rgba(59, 130, 246, 0.3)" : msg.role === "system" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    fontSize: "0.93rem",
                    lineHeight: 1.6
                  }}
                >
                  {/* Collapsible Thought Trace Component */}
                  {msg.thoughts && msg.thoughts.length > 0 && (
                    <div style={{ marginBottom: "1rem", borderRadius: "8px", border: "1px solid rgba(139, 92, 246, 0.3)", background: "rgba(139, 92, 246, 0.06)", overflow: "hidden" }}>
                      <div
                        onClick={() => toggleThoughts(msg.id)}
                        style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "rgba(139, 92, 246, 0.12)" }}
                      >
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          🧠 AGI Deliberative Cognitive Stream (System 1 + 2) [{msg.thoughts.length} steps]
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#a855f7" }}>
                          {expandedThoughts[msg.id] ? "▲ Collapse" : "▼ Expand Trace"}
                        </span>
                      </div>

                      {expandedThoughts[msg.id] && (
                        <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                          {msg.thoughts.map((th, idx) => (
                            <div key={idx} style={{ padding: "0.5rem", borderRadius: "6px", background: "rgba(0,0,0,0.25)", borderLeft: th.type === "system1" ? "3px solid #3b82f6" : th.type === "rag" ? "3px solid #10b981" : "3px solid #8b5cf6" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                                <strong style={{ color: th.type === "system1" ? "#60a5fa" : th.type === "rag" ? "#34d399" : "#c084fc" }}>
                                  {th.label}
                                </strong>
                                {th.latencyMs && (
                                  <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{th.latencyMs.toFixed(2)}ms</span>
                                )}
                              </div>
                              <p style={{ margin: 0, color: "#cbd5e1" }}>{th.content}</p>
                              {th.executableCommand && (
                                <code style={{ display: "block", marginTop: "0.3rem", padding: "0.3rem 0.5rem", borderRadius: "4px", background: "#050811", color: "#34d399", fontSize: "0.78rem" }}>
                                  $ {th.executableCommand}
                                </code>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Message Content */}
                  <div style={{ whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                    {msg.content || (isStreaming && msg.id === messages[messages.length - 1]?.id ? "Thinking..." : "")}
                  </div>

                  {/* Action Approval Card */}
                  {msg.approval && (
                    <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.35)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          🚨 {msg.approval.title}
                        </span>
                        <span style={{ padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800, background: msg.approval.blastRadius === "CRITICAL" ? "#ef4444" : "#f97316", color: "#fff" }}>
                          BLAST RADIUS: {msg.approval.blastRadius}
                        </span>
                      </div>

                      <p style={{ fontSize: "0.82rem", color: "#cbd5e1", margin: "0.4rem 0" }}>
                        Action Proposed: <code>{msg.approval.action}</code>
                      </p>

                      {msg.approval.mitigationCommand && (
                        <div style={{ margin: "0.5rem 0" }}>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Automated Remediation Command:</span>
                          <code style={{ display: "block", marginTop: "0.2rem", padding: "0.4rem 0.6rem", borderRadius: "4px", background: "#050811", color: "#34d399", fontSize: "0.8rem" }}>
                            # {msg.approval.mitigationCommand}
                          </code>
                        </div>
                      )}

                      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                        {approvedActions[msg.approval.approvalId] ? (
                          <span style={{ color: "#34d399", fontSize: "0.82rem", fontWeight: 600 }}>
                            ✓ Action Authorized &amp; Executed
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApproveAction(msg.approval!.approvalId, msg.approval!.action)}
                              style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 700, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}
                            >
                              ⚡ Authorize &amp; Execute
                            </button>
                            <button
                              style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Diff Preview Button if Diff Present */}
                  {msg.diff && (
                    <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button
                        onClick={() => { setActiveDiff(msg.diff!); setActiveTab("diff"); }}
                        style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "1px solid rgba(139, 92, 246, 0.4)", background: "rgba(139, 92, 246, 0.15)", color: "#c084fc", cursor: "pointer" }}
                      >
                        📝 Inspect Code Diff ({msg.diff.filesChanged.length} Files)
                      </button>
                      <button
                        onClick={() => { setActiveDiff(msg.diff!); setActiveTab("preview"); }}
                        style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "1px solid rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", cursor: "pointer" }}
                      >
                        🌐 Live Preview
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Starter Prompt Chips (shown if messages <= 2) */}
          {messages.length <= 2 && (
            <div style={{ padding: "0 1.5rem 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
              {STARTER_PROMPTS.map((sp, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendMessage(sp.prompt)}
                  style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" }}>
                    <span>{sp.icon}</span>
                    <span>{sp.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.4 }}>{sp.prompt}</p>
                </div>
              ))}
            </div>
          )}

          {/* Input Box Footer */}
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(15, 23, 42, 0.6)" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <textarea
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Ryvix AGI to triage an outage, write code, run security forensics, or query runbooks..."
                rows={2}
                disabled={isStreaming}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "#090d16",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontSize: "0.92rem",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />

              {isStreaming ? (
                <button
                  onClick={handleStopStream}
                  style={{ padding: "0.75rem 1.25rem", borderRadius: "8px", background: "#ef4444", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", height: "54px" }}
                >
                  ⏹ Stop
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim()}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "8px",
                    background: inputPrompt.trim() ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "rgba(255, 255, 255, 0.08)",
                    color: inputPrompt.trim() ? "#fff" : "#64748b",
                    border: "none",
                    fontWeight: 700,
                    cursor: inputPrompt.trim() ? "pointer" : "not-allowed",
                    height: "54px",
                    boxShadow: inputPrompt.trim() ? "0 4px 14px rgba(59, 130, 246, 0.3)" : "none"
                  }}
                >
                  Send ➔
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem", fontSize: "0.72rem", color: "#64748b" }}>
              <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for newline</span>
              <span>Model: <strong>Ryvix Top-Level AGI (OODA Apex + Claude + DeepSeek + 64-D Neural Reflex)</strong></span>
            </div>
          </div>
        </section>

        {/* Right Pane: Split-View Diff & Live Preview Panel */}
        {activeDiff && activeTab !== "chat" && (
          <aside style={{ flex: 1, display: "flex", flexDirection: "column", background: "#050811", overflow: "hidden" }}>
            {activeTab === "diff" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#f8fafc" }}>
                      Unified Git Diff: {activeDiff.filesChanged.join(", ")}
                    </h3>
                    {activeDiff.suggestedCommitMessage && (
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        Commit: <code>{activeDiff.suggestedCommitMessage}</code>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(activeDiff.diff)}
                    style={{ padding: "0.3rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#cbd5e1", cursor: "pointer" }}
                  >
                    Copy Patch
                  </button>
                </div>

                <pre style={{ flex: 1, margin: 0, padding: "1rem", overflow: "auto", fontFamily: "'Fira Code', monospace", fontSize: "0.82rem", lineHeight: 1.5, background: "#050811" }}>
                  {activeDiff.diff.split("\n").map((line, idx) => {
                    const isAdd = line.startsWith("+") && !line.startsWith("+++");
                    const isDel = line.startsWith("-") && !line.startsWith("---");
                    const isHeader = line.startsWith("@@") || line.startsWith("diff") || line.startsWith("---") || line.startsWith("+++");
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isAdd ? "rgba(16, 185, 129, 0.15)" : isDel ? "rgba(239, 68, 68, 0.15)" : "transparent",
                          color: isAdd ? "#34d399" : isDel ? "#f87171" : isHeader ? "#60a5fa" : "#94a3b8",
                          padding: "0 0.5rem"
                        }}
                      >
                        {line}
                      </div>
                    );
                  })}
                </pre>
              </div>
            )}

            {activeTab === "preview" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <div
                  style={{
                    width: previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "375px",
                    height: "100%",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    background: "#0f172a",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                  }}
                >
                  <div style={{ padding: "0.4rem 0.75rem", background: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", background: "rgba(0,0,0,0.3)", padding: "0.15rem 0.5rem", borderRadius: "4px", flex: 1, textAlign: "center" }}>
                      http://localhost:3000/preview/temp-ws-4819
                    </span>
                  </div>

                  <iframe
                    src="/"
                    title="Live App Preview"
                    style={{ flex: 1, border: "none", width: "100%", background: "#fff" }}
                  />
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
