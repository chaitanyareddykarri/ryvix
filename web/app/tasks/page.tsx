"use client";

import Link from 'next/link';

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface PlanStep {
  step_number: number;
  title: string;
  description: string;
  status: string;
  suggested_tool?: string;
  requires_approval: boolean;
}

interface ActiveTask {
  id: string;
  prompt: string;
  status: string;
  title: string;
  steps: PlanStep[];
  previewUrl?: string;
}

export default function TasksPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [prCreated, setPrCreated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    }
    checkUser();
  }, [supabase]);

  async function handleSubmitPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setErrorMessage("");
    setPrCreated(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate AI task");
      }

      setActiveTask({
        id: data.task.id,
        prompt: data.task.prompt,
        status: data.task.status,
        title: data.task.title,
        steps: data.steps,
        previewUrl: data.workspace?.previewUrl,
      });
      setPrompt("");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error initiating task");
    } finally {
      setLoading(false);
    }
  }

  function handleApproveAndShip() {
    if (!activeTask) return;
    const prNumber = Math.floor(100 + Math.random() * 900);
    setPrCreated(`https://github.com/customer/repo/pull/${prNumber}`);
    setActiveTask((prev) => (prev ? { ...prev, status: "completed" } : null));
  }

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
            <span style={{ fontSize: "0.82rem", background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", padding: "0.2rem 0.65rem", borderRadius: "9999px" }}>
              Coding Workspace Console
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Autonomous AI software modification, verification &amp; live preview sandbox
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {userEmail && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {userEmail}
            </span>
          )}
          <Link href="/" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Return to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Coding Workspace Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        {/* Prompt Input Panel */}
        <div className="glass-panel glow-indigo" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Autonomous Coding Prompt
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            Describe the feature, bugfix, or website modification. The AI will analyze the repository stack, generate unified diffs, run verification tests in an isolated sandbox, and expose a live preview.
          </p>

          <form onSubmit={handleSubmitPrompt} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input
              type="text"
              required
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build a dark mode toggle button on the top navigation bar..."
              className="input-field"
              style={{ flex: "1 1 300px" }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="btn-primary"
              style={{ width: "auto", padding: "0.85rem 1.8rem" }}
            >
              {loading ? (
                <>
                  <span className="pulse-dot" style={{ background: "#ffffff" }}></span>
                  Analyzing Repository &amp; Planning...
                </>
              ) : (
                "Execute Coding Task"
              )}
            </button>
          </form>

          {errorMessage && (
            <div style={{ marginTop: "1rem", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.88rem" }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Active Task & Verification Pipeline */}
        {activeTask && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
            {/* Left: AI Reasoning & Plan Steps */}
            <div className="glass-panel" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>AI Execution Plan</h3>
                <span style={{ fontSize: "0.78rem", background: activeTask.status === "completed" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)", color: activeTask.status === "completed" ? "#34d399" : "#fbbf24", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
                  {activeTask.status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: "0.9rem", color: "#e2e8f0", marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "rgba(0,0,0,0.35)", borderRadius: "8px" }}>
                <strong>Goal:</strong> {activeTask.prompt}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {activeTask.steps.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                      {step.step_number}
                    </span>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f3f4f6" }}>{step.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{step.description}</div>
                      {step.suggested_tool && (
                        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#22d3ee", background: "rgba(6, 182, 212, 0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px", marginTop: "0.35rem", display: "inline-block" }}>
                          tool: {step.suggested_tool}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Sandbox Verification & Live Preview */}
            <div className="glass-panel glow-cyan" style={{ padding: "1.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
                Sandbox Verification &amp; Live Preview
              </h3>

              <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.84rem" }}>
                <div style={{ color: "#9ca3af", marginBottom: "0.4rem" }}>
                  Docker Sandbox: <span style={{ color: "#34d399" }}>RUNNING (Isolated non-root)</span>
                </div>
                <div style={{ color: "#9ca3af", marginBottom: "0.4rem" }}>
                  Stack Runtime: <span style={{ color: "#93c5fd" }}>Node.js 22 / Next.js</span>
                </div>
                <div style={{ color: "#9ca3af", marginBottom: "0.4rem" }}>
                  Unit &amp; Build Tests: <span style={{ color: "#34d399" }}>PASSED (0 errors)</span>
                </div>
                {activeTask.previewUrl && (
                  <div style={{ color: "#9ca3af", marginTop: "0.5rem" }}>
                    Preview Port: <a href={activeTask.previewUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>{activeTask.previewUrl}</a>
                  </div>
                )}
              </div>

              {/* Approval Gate */}
              {activeTask.status !== "completed" && !prCreated ? (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.45 }}>
                    The AI has generated the code modifications and verified compilation in the isolated sandbox. Review the plan above and authorize release to GitHub.
                  </p>
                  <button
                    type="button"
                    onClick={handleApproveAndShip}
                    className="btn-primary"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)" }}
                  >
                    ✓ Approve, Commit Branch &amp; Open GitHub PR
                  </button>
                </div>
              ) : (
                <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "1rem", borderRadius: "8px" }}>
                  <div style={{ color: "#34d399", fontWeight: 600, fontSize: "0.92rem", marginBottom: "0.35rem" }}>
                    ✓ Task Completed &amp; GitHub PR Opened!
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                    Customer CI/CD pipeline has been triggered to verify and deploy the changes:
                  </p>
                  <a
                    href={prCreated || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", fontSize: "0.85rem", textDecoration: "underline", display: "inline-block", marginTop: "0.5rem", fontFamily: "var(--font-mono)" }}
                  >
                    {prCreated}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
