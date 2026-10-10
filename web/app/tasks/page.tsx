"use client";

import Link from 'next/link';
import TaskCheckTimeline from '@/components/TaskCheckTimeline';

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
  verification: Array<{command:string;success:boolean;exitCode:number}>;
  hasDiff: boolean;
  pullRequestUrl?: string;
  pipeline?:React.ComponentProps<typeof TaskCheckTimeline>['events'];
  pipelineUnavailable?:boolean;
  pipelineTruncated?:boolean;
}

function recordedTask(task:any):ActiveTask {
  return {id:task.id,prompt:task.user_prompt,title:task.summary||'Repository task',status:task.status,pipeline:task.pipeline,pipelineUnavailable:task.pipelineUnavailable,pipelineTruncated:task.pipelineTruncated,
    steps:task.plans?.find((p:any)=>p.id===task.active_plan_id)?.steps||[],
    previewUrl:task.workspace?.previewUrl,verification:Array.isArray(task.result?.verification)?task.result.verification:[],
    hasDiff:Array.isArray(task.result?.files)&&task.result.files.length>0,pullRequestUrl:task.pullRequest?.url};
}

export default function TasksPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [prCreated, setPrCreated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [connectedRepos, setConnectedRepos] = useState<any[]>([]);
  const [repositoryId, setRepositoryId] = useState("");

  const [supabase] = useState(() => createClient());
  const activeTaskId = activeTask?.id;
  const activeTaskStatus = activeTask?.status;

  useEffect(() => {
    const id=new URLSearchParams(window.location.search).get('task');
    if(!id)return;
    const abort=new AbortController();
    void fetch('/api/tasks',{signal:abort.signal,cache:'no-store'}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Task unavailable.');
      const task=data.tasks?.find((t:any)=>t.id===id);if(!task)throw new Error('Linked task is unavailable to this account.');
      setActiveTask(recordedTask(task));setPrCreated(task.pullRequest?.url||null);
    }).catch(error=>{if(!abort.signal.aborted)setErrorMessage(error.message);});
    return()=>abort.abort();
  },[]);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    }
    checkUser();
    fetch('/api/github/repositories/connect').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Repositories unavailable.');
      setConnectedRepos(data.repositories || []);
    }).catch(error => setErrorMessage(error.message));
  }, [supabase]);

  useEffect(() => {
    if (!activeTaskId || !activeTaskStatus || !['queued','planning','executing','verifying'].includes(activeTaskStatus)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const response = await fetch('/api/tasks', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Task status unavailable.');
        const task = data.tasks?.find((item: any) => item.id === activeTaskId);
        if (task) {
          setActiveTask(recordedTask(task));setPrCreated(task.pullRequest?.url||null);
          if (task.status === 'failed') setErrorMessage(task.error_details || 'Task failed.');
        }
      } catch (error) { if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Task status unavailable.'); }
      finally { if (!controller.signal.aborted) timer = setTimeout(refresh,3000); }
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [activeTaskId, activeTaskStatus]);

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
        body: JSON.stringify({ prompt: prompt.trim(), repositoryId }),
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
        verification:[],hasDiff:false,
      });
      setPrompt("");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error initiating task");
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveAndShip() {
    if (!activeTask || loading || activeTask.status!=='awaiting_approval' || !activeTask.hasDiff) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(activeTask.id)}/ship`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.pullRequest?.url) throw new Error(result.error || "Pull request creation failed.");
      setPrCreated(result.pullRequest.url);
      setActiveTask((previous) => previous ? { ...previous, status: result.task.status } : null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Shipping failed.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header Bar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", minWidth: 0, overflowWrap: "anywhere" }}>
          {userEmail && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {userEmail}
            </span>
          )}
          <Link href="/dashboard" className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", textDecoration: "none" }}>
            Return to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Coding Workspace Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "2rem" }}>
        {/* Prompt Input Panel */}
        <div className="glass-panel glow-indigo" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Autonomous Coding Prompt
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            Describe the feature, bugfix, or website modification. The AI will analyze the repository stack, generate unified diffs, run verification tests in an isolated sandbox, and expose a live preview.
          </p>

          <form onSubmit={handleSubmitPrompt} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <select required value={repositoryId} onChange={event => setRepositoryId(event.target.value)} disabled={loading} aria-label="Repository" style={{ minWidth: 0, maxWidth: "100%" }}>
              <option value="">Select a connected repository</option>
              {connectedRepos.map(repo => <option key={repo.id} value={repo.id}>{repo.full_name}</option>)}
            </select>
            <input
              type="text"
              required
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build a dark mode toggle button on the top navigation bar..."
              className="input-field"
              style={{ flex: "1 1 300px", minWidth: 0, maxWidth: "100%" }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="btn-primary"
              style={{ width: "auto", maxWidth: "100%", whiteSpace: "normal", padding: "0.85rem 1.8rem" }}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "1.5rem", minWidth:0 }}>
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
                <TaskCheckTimeline events={activeTask.pipeline} status={activeTask.status} unavailable={activeTask.pipelineUnavailable} truncated={activeTask.pipelineTruncated}/>
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
                  Workspace: <span>{activeTask.previewUrl?'Preview session available':'No active preview session recorded'}</span>
                </div>
                <div style={{ color: "#9ca3af", marginBottom: "0.4rem" }}>
                  Verification: <span>{activeTask.verification.length?`${activeTask.verification.length} recorded checks`:'No verification results recorded'}</span>
                </div>
                <div style={{ color: "#9ca3af", marginBottom: "0.4rem" }}>
                  {activeTask.verification.map((check,index)=><p key={index} style={{overflowWrap:'anywhere'}}>{check.command}: {check.success&&check.exitCode===0?'Passed':'Failed'} (exit {check.exitCode})</p>)}
                </div>
                {activeTask.previewUrl && (
                  <div style={{ color: "#9ca3af", marginTop: "0.5rem" }}>
                    Preview Port: <a href={activeTask.previewUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>{activeTask.previewUrl}</a>
                  </div>
                )}
              </div>

              {/* Approval Gate */}
              {!prCreated ? (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.45 }}>
                    {activeTask.status==='awaiting_approval'&&activeTask.hasDiff?'Review the recorded changes and verification before approving a pull request.':'No pull request is recorded. Approval becomes available when the worker has prepared changes for review.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleApproveAndShip}
                    disabled={loading||activeTask.status!=='awaiting_approval'||!activeTask.hasDiff}
                    className="btn-primary"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)" }}
                  >
                    ✓ Approve, Commit Branch &amp; Open GitHub PR
                  </button>
                </div>
              ) : (
                <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "1rem", borderRadius: "8px" }}>
                  <div style={{ color: "#34d399", fontWeight: 600, fontSize: "0.92rem", marginBottom: "0.35rem" }}>
                    GitHub pull request recorded
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                    The PR is open. Review its checks, then approve the release to start your existing deployment pipeline.
                  </p>
                  <a
                    href={prCreated || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", fontSize: "0.85rem", textDecoration: "underline", display: "inline-block", marginTop: "0.5rem", fontFamily: "var(--font-mono)" }}
                  >
                    {prCreated}
                  </a>
                  <p><Link href="/releases">Review and approve release</Link> · <Link href="/notifications">Enable deployment email</Link></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
