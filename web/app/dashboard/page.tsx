"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import MovingBlocks3D from "@/components/MovingBlocks3D";

// =========================================================================
// 1. LUCIDE-STYLE VECTOR ICONS (Zero external dependencies, pixel-perfect)
// =========================================================================
function IconHome({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconGlobe({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconSparkles({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
      <path d="M5 3v4" />
      <path d="M3 5h4" />
      <path d="M19 17v4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function IconHistory({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function IconSettings({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconCheck({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowRight({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconExternalLink({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconLock({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconTerminal({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconGithub({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconShield({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconMonitor({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconTablet({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconSmartphone({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconCpu({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

// =========================================================================
// 2. TYPES & STATE CONTRACTS
// =========================================================================
interface ConnectedServer {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  provider: string;
  status: "healthy" | "degraded" | "unreachable";
  cpuPercent?: number;
  memoryPercent?: number;
  diskPercent?: number;
}

interface DatabaseTask {
  id: string;
  title: string;
  task_type: string;
  status: string;
  created_at: string;
  user_prompt?: string;
  summary?: string;
}

interface ChangeHistoryItem {
  id: string;
  time: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  title: string;
  request: string;
  aiSummary: string;
  status: "Live" | "Approved" | "Deploying" | "Pending";
  filesCount: number;
  branch: string;
  commit: string;
  previewUrl: string;
  liveUrl: string;
}

type TabType = "home" | "websites" | "ai" | "changes" | "settings";
type PreviewState = "none" | "analyzing" | "preview_ready" | "deploying" | "deployed";
type ViewportMode = "desktop" | "tablet" | "mobile";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // User & Organization State
  const [userEmail, setUserEmail] = useState<string>("developer@company.com");
  const [orgName, setOrgName] = useState<string>("Nova Studio");
  const [websiteDomain, setWebsiteDomain] = useState<string>("novastudio.agency");
  const [selectedWebsite, setSelectedWebsite] = useState<string>("Nova Studio");

  // Real Database Data
  const [servers, setServers] = useState<ConnectedServer[]>([]);
  const [tasks, setTasks] = useState<DatabaseTask[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Entrance Intro State
  const [showEntrance, setShowEntrance] = useState<boolean>(true);

  // GitHub & Project Connection State
  const [githubConnected, setGithubConnected] = useState<boolean>(true);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [connectStep, setConnectStep] = useState<1 | 2 | 3 | 4>(1);
  const [repoSearch, setRepoSearch] = useState<string>("");
  const [customLiveUrl, setCustomLiveUrl] = useState<string>("https://novastudio.agency");

  // AI Prompt & Workspace State
  const [promptText, setPromptText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("AI READY");
  const [previewState, setPreviewState] = useState<PreviewState>("none");
  const [analyzingStep, setAnalyzingStep] = useState<number>(0);
  const [deploymentStep, setDeploymentStep] = useState<number>(0);

  // Preview & Comparison State
  const [comparisonMode, setComparisonMode] = useState<"toggle" | "slider" | "side-by-side">("slider");
  const [isShowingAfter, setIsShowingAfter] = useState<boolean>(true);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);

  // Drawers & Modals
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState<boolean>(false);

  // 3D Card Perspective Tilt
  const [cardRotate, setCardRotate] = useState<{ x: number; y: number; mouseX: number; mouseY: number }>({
    x: 0,
    y: 0,
    mouseX: 0,
    mouseY: 0,
  });

  const heroCardRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Suggested Prompts
  const suggestedChanges = [
    { id: "modern", text: "Make homepage look more modern" },
    { id: "dark", text: "Add dark mode & contrast tokens" },
    { id: "mobile", text: "Improve responsive mobile layout" },
    { id: "hero", text: "Redesign the hero section" },
    { id: "pricing", text: "Add an interactive pricing grid" },
    { id: "nav", text: "Modernize navigation bar" },
  ];

  // Mock Repositories
  const mockRepos = [
    { name: "my-portfolio", stack: "Next.js 15 · TypeScript", status: "Connected", branch: "main" },
    { name: "saas-landing-page", stack: "React · Vite · Tailwind", status: "Available", branch: "production" },
    { name: "ecommerce-store", stack: "Next.js · Tailwind", status: "Available", branch: "main" },
  ];

  // Change History Records
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([
    {
      id: "ch-101",
      dateGroup: "Today",
      time: "10:42 AM",
      title: "Homepage redesign & modern typography",
      request: "Make homepage modern with Space Grotesk typography and interactive glass cards.",
      aiSummary: "Modernized hero banner, increased typographic contrast, and added subtle gradient border cards.",
      status: "Live",
      filesCount: 4,
      branch: "ryvix/patch-modernize-hero",
      commit: "a8f9c2d",
      previewUrl: "https://preview-myportfolio.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
    {
      id: "ch-102",
      dateGroup: "Today",
      time: "09:20 AM",
      title: "Added dark mode & contrast tokens",
      request: "Add dark mode and fix header contrast.",
      aiSummary: "Injected CSS dark tokens, smooth transition classes, and theme switcher hook.",
      status: "Live",
      filesCount: 3,
      branch: "ryvix/patch-dark-mode",
      commit: "e4b107c",
      previewUrl: "https://preview-darkmode.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
    {
      id: "ch-103",
      dateGroup: "Yesterday",
      time: "03:15 PM",
      title: "Mobile navigation drawer fix",
      request: "Improve the mobile layout and navigation.",
      aiSummary: "Converted horizontal nav to sliding sheet drawer for viewports under 768px.",
      status: "Live",
      filesCount: 2,
      branch: "ryvix/patch-mobile-nav",
      commit: "f92d41a",
      previewUrl: "https://preview-mobilenav.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
  ]);

  // Entrance animation timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEntrance(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Live Database Data
  useEffect(() => {
    async function loadWorkspaceData() {
      setLoadingData(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          const namePart = user.user_metadata?.full_name || user.email.split("@")[0];
          setOrgName(`${namePart}'s Studio`);
          const domain = `${namePart.toLowerCase().replace(/[^a-z0-9]/g, "")}.agency`;
          setWebsiteDomain(domain);
          setCustomLiveUrl(`https://${domain}`);
          setSelectedWebsite(`${namePart}'s Studio`);
        }

        const serverResp = await fetch("/api/servers");
        if (serverResp.ok) {
          const serverData = await serverResp.json();
          if (Array.isArray(serverData.servers) && serverData.servers.length > 0) {
            setServers(serverData.servers);
          }
        }

        const taskResp = await fetch("/api/tasks");
        if (taskResp.ok) {
          const taskData = await taskResp.json();
          if (Array.isArray(taskData.tasks)) {
            setTasks(taskData.tasks);
          }
        }
      } catch (err) {
        console.error("Workspace data fetch notice:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadWorkspaceData();
  }, [supabase]);

  // Mouse tilt on hero card
  function handleHeroMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // max 2.5deg tilt
    const rotateX = ((y - centerY) / centerY) * -2.5;
    const rotateY = ((x - centerX) / centerX) * 2.5;
    setCardRotate({ x: rotateX, y: rotateY, mouseX: x, mouseY: y });
  }

  function handleHeroMouseLeave() {
    setCardRotate({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  }

  // Slider Dragging Listener
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      setSliderPos(Math.round(percent));
    }

    function handleMouseUp() {
      isDraggingRef.current = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Submit Prompt to AI & Orchestrate Working Flow
  async function handlePromptSubmit(e?: React.FormEvent, customPrompt?: string) {
    if (e) e.preventDefault();
    const finalPrompt = customPrompt || promptText.trim();
    if (!finalPrompt) return;

    if (!customPrompt) setPromptText(finalPrompt);

    if (!githubConnected) {
      setShowProjectModal(true);
      return;
    }

    setIsProcessing(true);
    setPreviewState("analyzing");
    setAnalyzingStep(0);
    setStatusMessage("AI WORKING");

    // Background task recording
    try {
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.task) setTasks((prev) => [data.task, ...prev]);
        })
        .catch(() => {});
    } catch {}

    // Step-by-step progress simulation
    setTimeout(() => setAnalyzingStep(1), 500); // Analyzing website
    setTimeout(() => setAnalyzingStep(2), 1100); // Finding components
    setTimeout(() => setAnalyzingStep(3), 1700); // Preparing changes
    setTimeout(() => {
      setAnalyzingStep(4);
      setPreviewState("preview_ready");
      setIsProcessing(false);
      setStatusMessage("AI READY");
      setActiveTab("ai");
    }, 2300);
  }

  // User Approves & Deploys
  async function handleApproveDeployment() {
    setShowApprovalModal(false);
    setPreviewState("deploying");
    setStatusMessage("DEPLOYING");
    setDeploymentStep(0);

    setTimeout(() => setDeploymentStep(1), 500);
    setTimeout(() => setDeploymentStep(2), 1100);
    setTimeout(() => setDeploymentStep(3), 1700);
    setTimeout(() => {
      setDeploymentStep(4);
      setPreviewState("deployed");
      setStatusMessage("LIVE");

      const newHistoryItem: ChangeHistoryItem = {
        id: `ch-${Date.now()}`,
        dateGroup: "Today",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: promptText ? promptText.slice(0, 36) + "..." : "Modernized website update",
        request: promptText || "Homepage modernization",
        aiSummary: "Applied hero enhancements, typography tweaks, and responsive grid optimization.",
        status: "Live",
        filesCount: 4,
        branch: "ryvix/patch-live-deploy",
        commit: Math.random().toString(16).slice(2, 9),
        previewUrl: "https://preview-myportfolio.ryvix.dev",
        liveUrl: customLiveUrl || `https://${websiteDomain}`,
      };

      setChangeHistory((prev) => [newHistoryItem, ...prev]);
    }, 2500);
  }

  function handleChipClick(chipText: string) {
    setPromptText(chipText);
    handlePromptSubmit(undefined, chipText);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const activePreviewUrl = "https://preview-myportfolio.ryvix.dev";
  const activeLiveUrl = customLiveUrl || `https://${websiteDomain}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#05070A",
        color: "#F5F7FA",
        fontFamily: "var(--font-sans, 'Inter', system-ui, -apple-system, sans-serif)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* ========================================================================= */}
      {/* 3. CINEMATIC BACKGROUND LAYERS (Radial Lighting, Grid, Slow Kinetic Fields) */}
      {/* ========================================================================= */}
      <div style={{ opacity: 0.18, pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0 }}>
        <MovingBlocks3D density="spacious" interactive={false} />
      </div>

      {/* Layer 2: Subtle Technical Grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Layer 3: Central Deep Radial Glow */}
      <div
        style={{
          position: "fixed",
          top: "12%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1100px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(124, 108, 255, 0.11) 0%, rgba(66, 217, 255, 0.04) 40%, transparent 70%)",
          filter: "blur(110px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ========================================================================= */}
      {/* 4. ENTRANCE ANIMATION (High-tech fade reveal)                             */}
      {/* ========================================================================= */}
      {showEntrance && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#05070A",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.25rem",
            transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Abstract Gyro Core */}
          <div
            style={{
              position: "relative",
              width: "56px",
              height: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid rgba(124, 108, 255, 0.5)",
                borderTopColor: "#42D9FF",
                animation: "spin 1.8s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "6px",
                borderRadius: "50%",
                border: "1.5px dashed rgba(167, 139, 250, 0.4)",
                animation: "spinReverse 3s linear infinite",
              }}
            />
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                boxShadow: "0 0 20px #7C6CFF",
              }}
            />
          </div>

          <div
            style={{
              fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "0.22em",
              color: "#F5F7FA",
            }}
          >
            RYVIX
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: "0.75rem",
              color: "#45D483",
              letterSpacing: "0.14em",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#45D483", boxShadow: "0 0 8px #45D483" }} />
            AUTONOMOUS WORKSPACE READY
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TOP BAR (Project pill, AI Status, Telemetry & User Profile)             */}
      {/* ========================================================================= */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: "rgba(8, 12, 17, 0.88)",
          borderBottom: "1px solid #1D2732",
          padding: "0.65rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "1680px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          {/* Left: Brand + Project Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  boxShadow: "0 0 16px rgba(124, 108, 255, 0.4)",
                }}
              >
                ✦
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#F5F7FA",
                }}
              >
                RYVIX
              </span>
            </Link>

            {/* AI Dynamic Status Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.22rem 0.65rem",
                borderRadius: "9999px",
                background: isProcessing ? "rgba(66, 217, 255, 0.12)" : "rgba(69, 212, 131, 0.1)",
                border: `1px solid ${isProcessing ? "rgba(66, 217, 255, 0.35)" : "rgba(69, 212, 131, 0.25)"}`,
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: isProcessing ? "#42D9FF" : "#45D483",
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isProcessing ? "#42D9FF" : "#45D483",
                  boxShadow: `0 0 8px ${isProcessing ? "#42D9FF" : "#45D483"}`,
                }}
              />
              {statusMessage}
            </div>

            {/* Target Project Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowWebsiteModal(!showWebsiteModal)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  padding: "0.32rem 0.75rem",
                  background: "#0D1218",
                  border: "1px solid #1D2732",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "#F5F7FA",
                  textAlign: "left",
                }}
              >
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#7C6CFF" }} />
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F5F7FA" }}>
                  my-portfolio
                </span>
                <span style={{ fontSize: "0.68rem", color: "#66717F" }}>▾</span>
              </button>

              {showWebsiteModal && (
                <div
                  style={{
                    position: "absolute",
                    top: "115%",
                    left: 0,
                    width: "260px",
                    background: "#0D1218",
                    border: "1px solid #2A3542",
                    borderRadius: "10px",
                    padding: "0.5rem",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.85)",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.66rem",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      color: "#66717F",
                      fontWeight: 700,
                      padding: "0.4rem 0.6rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Select Connected Project
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
                      color: "#42D9FF",
                      background: "rgba(66, 217, 255, 0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>✦ my-portfolio</span>
                    <span style={{ fontSize: "0.68rem", color: "#45D483" }}>Active</span>
                  </div>
                  {servers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedWebsite(s.hostname);
                        setWebsiteDomain(s.ip);
                        setShowWebsiteModal(false);
                      }}
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: "#A5AFBC",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>💻 {s.hostname}</span>
                      <span style={{ fontSize: "0.68rem", color: "#45D483" }}>{s.status}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #1D2732", marginTop: "0.35rem", paddingTop: "0.35rem" }}>
                    <button
                      onClick={() => {
                        setShowWebsiteModal(false);
                        setShowProjectModal(true);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        padding: "0.4rem 0.6rem",
                        fontSize: "0.78rem",
                        color: "#7C6CFF",
                        cursor: "pointer",
                      }}
                    >
                      + Connect Another GitHub Repo &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Website Badge Link */}
            <a
              href={activeLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.28rem 0.65rem",
                borderRadius: "6px",
                background: "rgba(18, 25, 34, 0.8)",
                border: "1px solid #1D2732",
                color: "#A5AFBC",
                fontSize: "0.76rem",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                textDecoration: "none",
              }}
            >
              <IconGlobe size={13} color="#45D483" />
              <span>{activeLiveUrl.replace("https://", "")}</span>
              <IconExternalLink size={11} color="#66717F" />
            </a>
          </div>

          {/* Right: Telemetry & User Account */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setShowTelemetry(!showTelemetry)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                background: "#0D1218",
                border: "1px solid #1D2732",
                color: "#A5AFBC",
                fontSize: "0.76rem",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <IconTerminal size={13} color="#7C6CFF" />
              <span>Telemetry</span>
            </button>

            {/* User Profile */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.3rem 0.65rem",
                borderRadius: "8px",
                background: "#0D1218",
                border: "1px solid #1D2732",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C6CFF, #A78BFA)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#A5AFBC",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                }}
              >
                {userEmail.split("@")[0]}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                style={{
                  background: "none",
                  border: "none",
                  color: "#66717F",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  padding: "0 0.15rem",
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 6. MAIN APPLICATION SHELL (MINIMAL SIDEBAR + WORKSPACE)                   */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "flex",
          flex: 1,
          maxWidth: "1680px",
          width: "100%",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* MINIMAL HACKER SIDEBAR */}
        <aside
          style={{
            width: "200px",
            borderRight: "1px solid #1D2732",
            backgroundColor: "#080C11",
            padding: "1.5rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "0.66rem",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              color: "#66717F",
              fontWeight: 700,
              padding: "0 0.65rem 0.5rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Navigation
          </div>

          <button
            onClick={() => setActiveTab("home")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "home" ? "#121922" : "transparent",
              color: activeTab === "home" ? "#F5F7FA" : "#A5AFBC",
              borderLeft: activeTab === "home" ? "3px solid #7C6CFF" : "3px solid transparent",
              fontSize: "0.85rem",
              fontWeight: activeTab === "home" ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <IconHome size={16} color={activeTab === "home" ? "#7C6CFF" : "#66717F"} />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "ai" ? "#121922" : "transparent",
              color: activeTab === "ai" ? "#F5F7FA" : "#A5AFBC",
              borderLeft: activeTab === "ai" ? "3px solid #A78BFA" : "3px solid transparent",
              fontSize: "0.85rem",
              fontWeight: activeTab === "ai" ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <IconSparkles size={16} color={activeTab === "ai" ? "#A78BFA" : "#66717F"} />
            <span>AI Assistant</span>
            {previewState !== "none" && (
              <span
                style={{
                  marginLeft: "auto",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#45D483",
                  boxShadow: "0 0 6px #45D483",
                }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab("websites")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "websites" ? "#121922" : "transparent",
              color: activeTab === "websites" ? "#F5F7FA" : "#A5AFBC",
              borderLeft: activeTab === "websites" ? "3px solid #42D9FF" : "3px solid transparent",
              fontSize: "0.85rem",
              fontWeight: activeTab === "websites" ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <IconGlobe size={16} color={activeTab === "websites" ? "#42D9FF" : "#66717F"} />
            <span>Websites</span>
          </button>

          <button
            onClick={() => setActiveTab("changes")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "changes" ? "#121922" : "transparent",
              color: activeTab === "changes" ? "#F5F7FA" : "#A5AFBC",
              borderLeft: activeTab === "changes" ? "3px solid #E8B85C" : "3px solid transparent",
              fontSize: "0.85rem",
              fontWeight: activeTab === "changes" ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <IconHistory size={16} color={activeTab === "changes" ? "#E8B85C" : "#66717F"} />
            <span>Changes</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.66rem",
                padding: "0.1rem 0.35rem",
                borderRadius: "9999px",
                background: "#121922",
                color: "#66717F",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              }}
            >
              {changeHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "settings" ? "#121922" : "transparent",
              color: activeTab === "settings" ? "#F5F7FA" : "#A5AFBC",
              borderLeft: activeTab === "settings" ? "3px solid #7C6CFF" : "3px solid transparent",
              fontSize: "0.85rem",
              fontWeight: activeTab === "settings" ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <IconSettings size={16} color={activeTab === "settings" ? "#7C6CFF" : "#66717F"} />
            <span>Settings</span>
          </button>

          {/* Quick Target Box at Bottom */}
          <div
            style={{
              marginTop: "auto",
              padding: "0.85rem",
              borderRadius: "8px",
              background: "#0D1218",
              border: "1px solid #1D2732",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "0.64rem",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "#66717F",
                  textTransform: "uppercase",
                }}
              >
                Active Website
              </span>
              <span style={{ fontSize: "0.62rem", color: "#45D483" }}>● Ready</span>
            </div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F7FA" }}>
              my-portfolio
            </div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "#A5AFBC",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeLiveUrl.replace("https://", "")}
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 7. DYNAMIC WORKSPACE (Tabs: Home, AI Workspace, Websites, Changes, Setts)  */}
        {/* ========================================================================= */}
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto", minHeight: "calc(100vh - 60px)" }}>
          {/* ------------------------------------------------------------------- */}
          {/* TAB 1: HOME (THE HERO AI COMMAND CENTER WITH 3D DEPTH)              */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === "home" && (
            <div
              style={{
                maxWidth: "980px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "1.5rem",
              }}
            >
              {/* Pulsating Abstract AI Core / Orb */}
              <div
                style={{
                  position: "relative",
                  width: "72px",
                  height: "72px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Outer Gyro Ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "2px solid rgba(124, 108, 255, 0.4)",
                    borderTopColor: "#42D9FF",
                    borderBottomColor: "#A78BFA",
                    animation: isProcessing ? "spin 1s linear infinite" : "spin 12s linear infinite",
                  }}
                />
                {/* Inner Counter-tilted Ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: "8px",
                    borderRadius: "50%",
                    border: "1.5px dashed rgba(66, 217, 255, 0.4)",
                    animation: isProcessing ? "spinReverse 1.5s linear infinite" : "spinReverse 8s linear infinite",
                  }}
                />
                {/* Center Core Glowing Orb */}
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)",
                    boxShadow: "0 0 25px rgba(124, 108, 255, 0.7)",
                    animation: "pulse 2s infinite ease-in-out",
                  }}
                />
              </div>

              {/* Status Pill Indicator */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  padding: "0.3rem 0.9rem",
                  background: "#0D1218",
                  border: "1px solid #1D2732",
                  borderRadius: "9999px",
                  fontSize: "0.76rem",
                  color: "#A5AFBC",
                  marginBottom: "1.5rem",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#45D483", boxShadow: "0 0 6px #45D483" }} />
                <span>Target Website:</span>
                <span style={{ color: "#F5F7FA", fontWeight: 600, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {activeLiveUrl.replace("https://", "")}
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "4px",
                    background: "rgba(124, 108, 255, 0.15)",
                    color: "#A78BFA",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  }}
                >
                  GitHub Synced
                </span>
              </div>

              {/* Major Headline */}
              <h1
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                  fontSize: "clamp(2.4rem, 5.2vw, 3.8rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  textAlign: "center",
                  lineHeight: 1.15,
                  marginBottom: "0.85rem",
                  color: "#F5F7FA",
                }}
              >
                What would you like to change?
              </h1>

              {/* Subhead */}
              <p
                style={{
                  fontSize: "1.08rem",
                  color: "#A5AFBC",
                  textAlign: "center",
                  marginBottom: "2.6rem",
                  maxWidth: "600px",
                  lineHeight: 1.5,
                }}
              >
                Tell RYVIX what you want to change on your existing website. RYVIX handles the code, builds the preview, and updates your site.
              </p>

              {/* 3D PERSPECTIVE AI COMMAND SURFACE */}
              <div
                ref={heroCardRef}
                onMouseMove={handleHeroMouseMove}
                onMouseLeave={handleHeroMouseLeave}
                style={{
                  width: "100%",
                  maxWidth: "780px",
                  perspective: "1000px",
                  marginBottom: "1.4rem",
                }}
              >
                <form
                  onSubmit={(e) => handlePromptSubmit(e)}
                  style={{
                    transform: `rotateX(${cardRotate.x}deg) rotateY(${cardRotate.y}deg)`,
                    transition: "transform 0.15s ease-out, box-shadow 0.2s ease",
                    background: "#0D1218",
                    backgroundImage: cardRotate.mouseX
                      ? `radial-gradient(circle at ${cardRotate.mouseX}px ${cardRotate.mouseY}px, rgba(124, 108, 255, 0.12) 0%, transparent 60%)`
                      : "none",
                    border: "1px solid #1D2732",
                    borderRadius: "16px",
                    padding: "1.25rem 1.4rem",
                    boxShadow: "0 20px 45px rgba(0, 0, 0, 0.7), 0 0 25px rgba(124, 108, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ color: "#7C6CFF", marginTop: "2px" }}>
                      <IconSparkles size={20} color="#7C6CFF" />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Describe what you want to change on your website... (e.g., 'Make my homepage more modern and add dark mode')"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handlePromptSubmit(e);
                        }
                      }}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#F5F7FA",
                        fontSize: "1.05rem",
                        fontWeight: 400,
                        fontFamily: "inherit",
                        resize: "none",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #1D2732",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        color: "#66717F",
                      }}
                    >
                      <span>Press</span>
                      <span style={{ padding: "0.1rem 0.35rem", borderRadius: "3px", background: "#121922", border: "1px solid #1D2732" }}>
                        ⌘ Enter
                      </span>
                      <span>to run</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing || !promptText.trim()}
                      style={{
                        padding: "0.65rem 1.45rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        background: promptText.trim()
                          ? "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)"
                          : "#121922",
                        color: promptText.trim() ? "#ffffff" : "#66717F",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: promptText.trim() ? "pointer" : "default",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        boxShadow: promptText.trim() ? "0 0 25px rgba(124, 108, 255, 0.45)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ffffff", animation: "pulse 1s infinite" }} />
                          <span>AI Working...</span>
                        </>
                      ) : (
                        <>
                          <span>RUN AI</span>
                          <IconArrowRight size={15} color="#ffffff" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Safety Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.78rem",
                  color: "#66717F",
                  marginBottom: "2.8rem",
                  textAlign: "center",
                }}
              >
                <IconShield size={15} color="#45D483" />
                <span>
                  Preview only — your live website has not been changed. Live site updates only when you approve.
                </span>
              </div>

              {/* Suggested Quick Action Chips */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "780px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "3.2rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    color: "#66717F",
                    textTransform: "uppercase",
                    marginBottom: "1rem",
                  }}
                >
                  Quick Actions
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.6rem",
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
                        padding: "0.48rem 0.95rem",
                        borderRadius: "9999px",
                        background: "#0D1218",
                        border: "1px solid #1D2732",
                        color: "#A5AFBC",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#7C6CFF";
                        e.currentTarget.style.color = "#F5F7FA";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#1D2732";
                        e.currentTarget.style.color = "#A5AFBC";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <span style={{ color: "#7C6CFF" }}>✦</span>
                      <span>{chip.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Connected Project Miniature Browser Perspective Card */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "780px",
                  borderRadius: "14px",
                  background: "#0D1218",
                  border: "1px solid #1D2732",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      background: "rgba(124, 108, 255, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#7C6CFF",
                    }}
                  >
                    <IconGlobe size={22} color="#7C6CFF" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5F7FA" }}>
                      Connected Project: my-portfolio
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        color: "#66717F",
                      }}
                    >
                      GitHub: Connected ✓ · Live: {activeLiveUrl} · AI: Ready ✓
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("ai")}
                  style={{
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                  }}
                >
                  <span>Open AI Workspace</span>
                  <IconArrowRight size={14} color="#ffffff" />
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 2: AI WORKSPACE (SPLIT-SCREEN: CONVERSATION + 3D BROWSER FRAME)  */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === "ai" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(380px, 420px) 1fr",
                gap: "1.5rem",
                height: "calc(100vh - 120px)",
                minHeight: "680px",
              }}
            >
              {/* LEFT PANE: AI REASONING, PLAN & WORKING STATE */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "#0D1218",
                  border: "1px solid #1D2732",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {/* AI Header */}
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderBottom: "1px solid #1D2732",
                    background: "#080C11",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        background: "linear-gradient(135deg, #7C6CFF, #A78BFA)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                      }}
                    >
                      <IconSparkles size={14} color="#ffffff" />
                    </div>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F5F7FA" }}>
                      RYVIX AI
                    </span>
                  </div>

                  <span
                    style={{
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: "0.7rem",
                      color: isProcessing ? "#42D9FF" : "#45D483",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isProcessing ? "#42D9FF" : "#45D483",
                      }}
                    />
                    {isProcessing ? "Analyzing Codebase..." : "Interactive Session"}
                  </span>
                </div>

                {/* Conversation Stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {/* System Context Card */}
                  <div
                    style={{
                      padding: "0.95rem 1.15rem",
                      borderRadius: "10px",
                      background: "#121922",
                      border: "1px solid #1D2732",
                      fontSize: "0.82rem",
                      color: "#A5AFBC",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#F5F7FA", marginBottom: "0.25rem" }}>
                      Target Project: my-portfolio
                    </div>
                    <div>
                      Branch: <span style={{ color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>main</span> · Live URL:{" "}
                      <span style={{ color: "#45D483", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>{activeLiveUrl}</span>
                    </div>
                  </div>

                  {/* User Request Bubble */}
                  {promptText && (
                    <div
                      style={{
                        alignSelf: "flex-end",
                        maxWidth: "85%",
                        padding: "0.85rem 1.1rem",
                        borderRadius: "14px 14px 2px 14px",
                        background: "linear-gradient(135deg, #7C6CFF 0%, #6366f1 100%)",
                        color: "#ffffff",
                        fontSize: "0.88rem",
                        lineHeight: 1.45,
                        boxShadow: "0 4px 15px rgba(124, 108, 255, 0.25)",
                      }}
                    >
                      {promptText}
                    </div>
                  )}

                  {/* AI Reasoning & Plan */}
                  {previewState !== "none" && (
                    <div
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: "92%",
                        padding: "1.1rem 1.25rem",
                        borderRadius: "14px 14px 14px 2px",
                        background: "#121922",
                        border: "1px solid #1D2732",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <IconSparkles size={16} color="#A78BFA" />
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#F5F7FA" }}>
                          I understand.
                        </span>
                      </div>

                      <div style={{ fontSize: "0.84rem", color: "#A5AFBC", lineHeight: 1.5 }}>
                        You want to modernize the website layout, enhance typographic contrast, and introduce interactive glass cards while maintaining brand integrity.
                      </div>

                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                          fontWeight: 700,
                          color: "#66717F",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Changes Planned:
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#F5F7FA" }}>
                          <IconCheck size={14} color="#45D483" />
                          <span>Hero redesign with Space Grotesk typography</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#F5F7FA" }}>
                          <IconCheck size={14} color="#45D483" />
                          <span>Glassmorphism feature cards with border glow</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#F5F7FA" }}>
                          <IconCheck size={14} color="#45D483" />
                          <span>CTA button update with hover depth</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#F5F7FA" }}>
                          <IconCheck size={14} color="#45D483" />
                          <span>Responsive mobile layout &amp; navigation drawer</span>
                        </div>
                      </div>

                      {/* Animated Working State Tracker */}
                      {isProcessing ? (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.85rem",
                            borderRadius: "8px",
                            background: "#0D1218",
                            border: "1px solid #1D2732",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem",
                            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                            fontSize: "0.75rem",
                          }}
                        >
                          <div style={{ color: analyzingStep >= 1 ? "#45D483" : "#66717F" }}>
                            {analyzingStep >= 1 ? "✓" : "●"} Understanding request
                          </div>
                          <div style={{ color: analyzingStep >= 2 ? "#45D483" : "#66717F" }}>
                            {analyzingStep >= 2 ? "✓" : analyzingStep === 1 ? "●" : "○"} Analyzing website
                          </div>
                          <div style={{ color: analyzingStep >= 3 ? "#45D483" : "#66717F" }}>
                            {analyzingStep >= 3 ? "✓" : analyzingStep === 2 ? "●" : "○"} Finding relevant components
                          </div>
                          <div style={{ color: analyzingStep >= 4 ? "#45D483" : "#66717F" }}>
                            {analyzingStep >= 4 ? "✓" : analyzingStep === 3 ? "●" : "○"} Preparing changes
                          </div>
                          <div style={{ color: analyzingStep >= 4 ? "#45D483" : "#66717F" }}>
                            {analyzingStep >= 4 ? "✓" : "○"} Building preview
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: "0.4rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.78rem",
                            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                            color: "#45D483",
                          }}
                        >
                          <IconCheck size={14} color="#45D483" />
                          <span>Preview ready for review in right pane</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Input Form */}
                <form
                  onSubmit={(e) => handlePromptSubmit(e)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderTop: "1px solid #1D2732",
                    background: "#080C11",
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Tell RYVIX what to adjust..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    disabled={isProcessing}
                    style={{
                      flex: 1,
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "#0D1218",
                      border: "1px solid #1D2732",
                      color: "#F5F7FA",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !promptText.trim()}
                    style={{
                      padding: "0.65rem 1rem",
                      borderRadius: "8px",
                      border: "none",
                      background: promptText.trim() ? "#7C6CFF" : "#121922",
                      color: promptText.trim() ? "#ffffff" : "#66717F",
                      fontWeight: 600,
                      cursor: promptText.trim() ? "pointer" : "default",
                      fontSize: "0.85rem",
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* RIGHT PANE: REALISTIC 3D BROWSER FRAME & BEFORE/AFTER COMPARISON */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "#0D1218",
                  border: "1px solid #1D2732",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {/* Browser Titlebar */}
                <div
                  style={{
                    padding: "0.65rem 1rem",
                    background: "#080C11",
                    borderBottom: "1px solid #1D2732",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Window Controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F06A6A" }} />
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E8B85C" }} />
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#45D483" }} />
                  </div>

                  {/* Address Bar */}
                  <div
                    style={{
                      flex: 1,
                      maxWidth: "460px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.32rem 0.85rem",
                      borderRadius: "6px",
                      background: "#121922",
                      border: "1px solid #1D2732",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: "0.74rem",
                    }}
                  >
                    <IconLock size={12} color="#45D483" />
                    <span
                      style={{
                        padding: "0.1rem 0.35rem",
                        borderRadius: "3px",
                        background: isShowingAfter ? "rgba(124, 108, 255, 0.2)" : "rgba(232, 184, 92, 0.2)",
                        color: isShowingAfter ? "#A78BFA" : "#E8B85C",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      {previewState === "deployed" ? "LIVE" : "PREVIEW"}
                    </span>
                    <span style={{ color: "#A5AFBC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {previewState === "deployed" ? activeLiveUrl : activePreviewUrl}
                    </span>
                  </div>

                  {/* Viewport Toggles */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <button
                      onClick={() => setViewport("desktop")}
                      style={{
                        background: viewport === "desktop" ? "#121922" : "transparent",
                        border: "1px solid",
                        borderColor: viewport === "desktop" ? "#7C6CFF" : "transparent",
                        color: viewport === "desktop" ? "#F5F7FA" : "#66717F",
                        borderRadius: "5px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <IconMonitor size={13} color={viewport === "desktop" ? "#7C6CFF" : "#66717F"} />
                      <span>Desktop</span>
                    </button>
                    <button
                      onClick={() => setViewport("tablet")}
                      style={{
                        background: viewport === "tablet" ? "#121922" : "transparent",
                        border: "1px solid",
                        borderColor: viewport === "tablet" ? "#7C6CFF" : "transparent",
                        color: viewport === "tablet" ? "#F5F7FA" : "#66717F",
                        borderRadius: "5px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <IconTablet size={13} color={viewport === "tablet" ? "#7C6CFF" : "#66717F"} />
                      <span>Tablet</span>
                    </button>
                    <button
                      onClick={() => setViewport("mobile")}
                      style={{
                        background: viewport === "mobile" ? "#121922" : "transparent",
                        border: "1px solid",
                        borderColor: viewport === "mobile" ? "#7C6CFF" : "transparent",
                        color: viewport === "mobile" ? "#F5F7FA" : "#66717F",
                        borderRadius: "5px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <IconSmartphone size={13} color={viewport === "mobile" ? "#7C6CFF" : "#66717F"} />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Header: Comparison Switcher & Safety Notice */}
                <div
                  style={{
                    padding: "0.55rem 1rem",
                    background: "#121922",
                    borderBottom: "1px solid #1D2732",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        color: "#66717F",
                        textTransform: "uppercase",
                      }}
                    >
                      Comparison:
                    </span>

                    {/* Toggle Buttons */}
                    <div
                      style={{
                        display: "flex",
                        background: "#080C11",
                        border: "1px solid #1D2732",
                        borderRadius: "6px",
                        padding: "2px",
                      }}
                    >
                      <button
                        onClick={() => {
                          setComparisonMode("toggle");
                          setIsShowingAfter(false);
                        }}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "4px",
                          border: "none",
                          background: comparisonMode === "toggle" && !isShowingAfter ? "#121922" : "transparent",
                          color: comparisonMode === "toggle" && !isShowingAfter ? "#E8B85C" : "#66717F",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Before
                      </button>
                      <button
                        onClick={() => {
                          setComparisonMode("toggle");
                          setIsShowingAfter(true);
                        }}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "4px",
                          border: "none",
                          background: comparisonMode === "toggle" && isShowingAfter ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : "transparent",
                          color: comparisonMode === "toggle" && isShowingAfter ? "#ffffff" : "#66717F",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        After (AI)
                      </button>
                    </div>

                    <button
                      onClick={() => setComparisonMode(comparisonMode === "slider" ? "toggle" : "slider")}
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "6px",
                        background: comparisonMode === "slider" ? "rgba(124, 108, 255, 0.15)" : "transparent",
                        border: "1px solid",
                        borderColor: comparisonMode === "slider" ? "#7C6CFF" : "#1D2732",
                        color: comparisonMode === "slider" ? "#A78BFA" : "#A5AFBC",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                      }}
                    >
                      {comparisonMode === "slider" ? "Disable Split Slider" : "Interactive Split Slider"}
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#A5AFBC",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span style={{ color: "#E8B85C" }}>●</span>
                    <span>Live website is untouched until you approve.</span>
                  </div>
                </div>

                {/* BROWSER VIEWPORT FRAME */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    background: "#05070A",
                    display: "flex",
                    justifyContent: "center",
                    padding: viewport === "desktop" ? "0" : "1.5rem",
                  }}
                >
                  <div
                    ref={sliderRef}
                    style={{
                      width: viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "375px",
                      maxWidth: "100%",
                      minHeight: "100%",
                      background: "#080C11",
                      color: "#F5F7FA",
                      position: "relative",
                      transition: "width 0.25s ease",
                      boxShadow: viewport !== "desktop" ? "0 10px 40px rgba(0, 0, 0, 0.8)" : "none",
                      border: viewport !== "desktop" ? "1px solid #1D2732" : "none",
                      borderRadius: viewport !== "desktop" ? "12px" : "0",
                      overflow: "hidden",
                    }}
                  >
                    {/* Interactive Split Slider Mode */}
                    {comparisonMode === "slider" ? (
                      <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "580px" }}>
                        <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                          <LegacyWebsiteSimulation />
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: `${sliderPos}%`,
                            overflow: "hidden",
                            borderRight: "2px solid #7C6CFF",
                            boxShadow: "2px 0 15px rgba(124, 108, 255, 0.5)",
                          }}
                        >
                          <div style={{ width: sliderRef.current?.clientWidth || "100%", minHeight: "580px" }}>
                            <ModernizedWebsiteSimulation />
                          </div>
                        </div>

                        {/* Slider Handle */}
                        <div
                          onMouseDown={() => (isDraggingRef.current = true)}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: `${sliderPos}%`,
                            transform: "translate(-50%, -50%)",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            cursor: "ew-resize",
                            zIndex: 10,
                            boxShadow: "0 0 18px rgba(124, 108, 255, 0.8)",
                          }}
                        >
                          ⮂⮄
                        </div>
                      </div>
                    ) : (
                      <div>
                        {isShowingAfter ? <ModernizedWebsiteSimulation /> : <LegacyWebsiteSimulation />}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM ACTION BAR (CHANGE SUMMARY + APPROVE BUTTON) */}
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    background: "#080C11",
                    borderTop: "1px solid #1D2732",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F7FA" }}>
                      Preview ready for review · 4 planned updates
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#A5AFBC" }}>
                      Files modified: 4 · Branch: <span style={{ color: "#A78BFA" }}>ryvix/patch-modernize</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <button
                      onClick={() => {
                        setPreviewState("none");
                        setPromptText("");
                      }}
                      style={{
                        padding: "0.55rem 0.95rem",
                        borderRadius: "8px",
                        background: "transparent",
                        border: "1px solid #1D2732",
                        color: "#A5AFBC",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Reject Changes
                    </button>

                    <button
                      onClick={() => setShowApprovalModal(true)}
                      style={{
                        padding: "0.55rem 1.35rem",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)",
                        border: "none",
                        color: "#05070A",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 0 18px rgba(69, 212, 131, 0.4)",
                      }}
                    >
                      APPROVE &amp; UPDATE WEBSITE &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 3: WEBSITES MANAGEMENT (PROJECTS & DATABASE NODES)              */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === "websites" && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.8rem", fontWeight: 700, color: "#F5F7FA" }}>
                    Connected Websites
                  </h2>
                  <p style={{ fontSize: "0.88rem", color: "#A5AFBC" }}>
                    Repositories and live domains synchronized with RYVIX AI.
                  </p>
                </div>

                <button
                  onClick={() => setShowProjectModal(true)}
                  style={{
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Connect Website
                </button>
              </div>

              {/* Grid of Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
                <div
                  style={{
                    background: "#0D1218",
                    border: "1px solid #1D2732",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: "rgba(124, 108, 255, 0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#7C6CFF",
                        }}
                      >
                        <IconGlobe size={20} color="#7C6CFF" />
                      </div>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>My Portfolio</div>
                        <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F" }}>
                          Next.js 15 · TypeScript
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        background: "rgba(69, 212, 131, 0.1)",
                        color: "#45D483",
                        border: "1px solid rgba(69, 212, 131, 0.3)",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                      }}
                    >
                      ● LIVE
                    </span>
                  </div>

                  <div
                    style={{
                      padding: "0.6rem 0.8rem",
                      borderRadius: "6px",
                      background: "#121922",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      color: "#A5AFBC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{activeLiveUrl}</span>
                    <a href={activeLiveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#42D9FF", textDecoration: "none" }}>
                      <IconExternalLink size={12} color="#42D9FF" />
                    </a>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                    <button
                      onClick={() => {
                        setSelectedWebsite("My Portfolio");
                        setActiveTab("ai");
                      }}
                      style={{
                        flex: 1,
                        padding: "0.45rem",
                        borderRadius: "6px",
                        background: "#121922",
                        border: "1px solid #1D2732",
                        color: "#F5F7FA",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Ask AI
                    </button>
                    <a
                      href={activeLiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: "6px",
                        background: "transparent",
                        border: "1px solid #1D2732",
                        color: "#A5AFBC",
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        textAlign: "center",
                      }}
                    >
                      Open Site
                    </a>
                  </div>
                </div>

                {servers.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: "#0D1218",
                      border: "1px solid #1D2732",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "rgba(66, 217, 255, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#42D9FF",
                          }}
                        >
                          <IconCpu size={20} color="#42D9FF" />
                        </div>
                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>{s.hostname}</div>
                          <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F" }}>
                            {s.provider} · {s.os}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "0.2rem 0.55rem",
                          borderRadius: "9999px",
                          background: s.status === "healthy" ? "rgba(69, 212, 131, 0.1)" : "rgba(232, 184, 92, 0.1)",
                          color: s.status === "healthy" ? "#45D483" : "#E8B85C",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      >
                        ● {s.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922", fontSize: "0.78rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#A5AFBC" }}>
                      IP: {s.ip}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                      <button
                        onClick={() => {
                          setSelectedWebsite(s.hostname);
                          setWebsiteDomain(s.ip);
                          setActiveTab("ai");
                        }}
                        style={{
                          flex: 1,
                          padding: "0.45rem",
                          borderRadius: "6px",
                          background: "#121922",
                          border: "1px solid #1D2732",
                          color: "#F5F7FA",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Edit Site with AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 4: CHANGES HISTORY (CHRONOLOGICAL AUDIT & DATABASE LOGS)        */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === "changes" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.8rem", fontWeight: 700, color: "#F5F7FA" }}>
                  Change History
                </h2>
                <p style={{ fontSize: "0.88rem", color: "#A5AFBC" }}>
                  Chronological record of user prompts, AI changes, and live deployment statuses.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {["Today", "Yesterday"].map((group) => {
                  const groupItems = changeHistory.filter((c) => c.dateGroup === group);
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={group}>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                          color: "#66717F",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "0.85rem",
                        }}
                      >
                        {group}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {groupItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              padding: "1.1rem 1.35rem",
                              borderRadius: "10px",
                              background: "#0D1218",
                              border: "1px solid #1D2732",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <span style={{ fontSize: "0.76rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F" }}>
                                {item.time}
                              </span>
                              <div>
                                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#F5F7FA" }}>
                                  {item.title}
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "#A5AFBC", marginTop: "2px" }}>
                                  &ldquo;{item.request}&rdquo;
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                padding: "0.2rem 0.55rem",
                                borderRadius: "4px",
                                background: "rgba(69, 212, 131, 0.1)",
                                border: "1px solid rgba(69, 212, 131, 0.25)",
                                color: "#45D483",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                              }}
                            >
                              ✓ Live
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Database Tasks */}
                {tasks.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        color: "#66717F",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "0.85rem",
                        marginTop: "1rem",
                      }}
                    >
                      Supabase Database Tasks
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {tasks.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          style={{
                            padding: "0.85rem 1.15rem",
                            borderRadius: "8px",
                            background: "#0D1218",
                            border: "1px solid #1D2732",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#F5F7FA" }}>
                              {t.title}
                            </div>
                            <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F" }}>
                              ID: {t.id.slice(0, 8)}... · Type: {t.task_type}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#A78BFA" }}>
                            {t.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 5: SETTINGS                                                     */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.8rem", fontWeight: 700, color: "#F5F7FA" }}>
                  Workspace Settings
                </h2>
                <p style={{ fontSize: "0.88rem", color: "#A5AFBC" }}>
                  Configure GitHub repositories, deployment environments, and AI model telemetry.
                </p>
              </div>

              <div
                style={{
                  background: "#0D1218",
                  border: "1px solid #1D2732",
                  borderRadius: "12px",
                  padding: "1.8rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#A5AFBC", marginBottom: "0.4rem" }}>
                    Authenticated Account
                  </label>
                  <input
                    type="text"
                    disabled
                    value={userEmail}
                    style={{
                      width: "100%",
                      padding: "0.7rem 0.95rem",
                      borderRadius: "8px",
                      background: "#121922",
                      border: "1px solid #1D2732",
                      color: "#F5F7FA",
                      fontSize: "0.88rem",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#A5AFBC", marginBottom: "0.4rem" }}>
                    Organization Workspace
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.7rem 0.95rem",
                      borderRadius: "8px",
                      background: "#121922",
                      border: "1px solid #1D2732",
                      color: "#F5F7FA",
                      fontSize: "0.88rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#A5AFBC", marginBottom: "0.4rem" }}>
                    Connected GitHub Integration
                  </label>
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "8px",
                      background: "#121922",
                      border: "1px solid #1D2732",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <IconGithub size={18} color="#ffffff" />
                      <span style={{ fontSize: "0.85rem", color: "#F5F7FA" }}>
                        GitHub Synced (Read/Write Access to Repositories)
                      </span>
                    </div>
                    <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#45D483" }}>
                      Active
                    </span>
                  </div>
                </div>

                <div style={{ paddingTop: "1.2rem", borderTop: "1px solid #1D2732", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.8rem", color: "#45D483" }}>
                    ● Supabase RLS Session Active
                  </span>
                  <button
                    onClick={handleSignOut}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "1px solid rgba(240, 106, 106, 0.4)",
                      color: "#F06A6A",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Sign Out of Workspace
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 8. MODAL: GITHUB CONNECTION & REPO SELECTOR                               */}
      {/* ========================================================================= */}
      {showProjectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 7, 10, 0.88)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "#0D1218",
              border: "1px solid #2A3542",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <IconSparkles size={18} color="#7C6CFF" />
                <span style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.2rem", fontWeight: 700, color: "#F5F7FA" }}>
                  Connect your project
                </span>
              </div>
              <button
                onClick={() => setShowProjectModal(false)}
                style={{ background: "none", border: "none", color: "#66717F", cursor: "pointer", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>

            {connectStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <p style={{ fontSize: "0.88rem", color: "#A5AFBC", lineHeight: 1.5 }}>
                  Connect your GitHub account so RYVIX can inspect your project components and prepare verified diffs.
                </p>

                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "10px",
                    background: "#121922",
                    border: "1px solid #1D2732",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <IconGithub size={26} color="#ffffff" />
                    <div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#F5F7FA" }}>GitHub</div>
                      <div style={{ fontSize: "0.75rem", color: "#66717F" }}>Access repository components &amp; branches</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setGithubConnected(true);
                      setConnectStep(2);
                    }}
                    style={{
                      padding: "0.55rem 1.15rem",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Connect GitHub
                  </button>
                </div>
              </div>
            )}

            {connectStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>Choose your website repository</h3>
                  <p style={{ fontSize: "0.82rem", color: "#A5AFBC" }}>Select the repository RYVIX should inspect and modify.</p>
                </div>

                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  style={{
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "#121922",
                    border: "1px solid #1D2732",
                    color: "#F5F7FA",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "220px", overflowY: "auto" }}>
                  {mockRepos
                    .filter((r) => r.name.toLowerCase().includes(repoSearch.toLowerCase()))
                    .map((repo) => (
                      <div
                        key={repo.name}
                        onClick={() => {
                          setSelectedWebsite(repo.name);
                          setConnectStep(3);
                        }}
                        style={{
                          padding: "0.85rem 1rem",
                          borderRadius: "8px",
                          background: "#121922",
                          border: "1px solid #1D2732",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#F5F7FA" }}>{repo.name}</div>
                          <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F" }}>
                            {repo.stack} · {repo.branch}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.82rem", color: "#7C6CFF", fontWeight: 600 }}>Select &rarr;</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {connectStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>Where is this website live?</h3>
                  <p style={{ fontSize: "0.82rem", color: "#A5AFBC" }}>Provide your production domain so RYVIX can inspect live styles.</p>
                </div>

                <input
                  type="text"
                  value={customLiveUrl}
                  onChange={(e) => setCustomLiveUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "#121922",
                    border: "1px solid #1D2732",
                    color: "#F5F7FA",
                    fontSize: "0.92rem",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    outline: "none",
                  }}
                />

                <button
                  onClick={() => setConnectStep(4)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Connect Website &rarr;
                </button>
              </div>
            )}

            {connectStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center", alignItems: "center" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(69, 212, 131, 0.15)",
                    color: "#45D483",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconCheck size={24} color="#45D483" />
                </div>

                <div>
                  <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.3rem", fontWeight: 700, color: "#F5F7FA" }}>
                    Your website is ready.
                  </h3>
                  <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.82rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#45D483" }}>
                    <div>GitHub Connected ✓</div>
                    <div>Website Connected ✓</div>
                    <div>AI Ready ✓</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setActiveTab("home");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Start Editing with AI &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: APPROVAL CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {showApprovalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 7, 10, 0.88)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#0D1218",
              border: "1px solid #2A3542",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <IconSparkles size={22} color="#7C6CFF" />
              <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FA" }}>
                Ready to update your website?
              </h3>
            </div>

            <p style={{ fontSize: "0.86rem", color: "#A5AFBC", lineHeight: 1.5 }}>
              Your live website at <span style={{ color: "#42D9FF" }}>{activeLiveUrl}</span> will be updated with the changes you have reviewed in the preview.
            </p>

            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "#121922",
                border: "1px solid #1D2732",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                fontSize: "0.8rem",
                color: "#F5F7FA",
              }}
            >
              <div>✓ 4 files will be updated on branch <span style={{ color: "#A78BFA" }}>main</span></div>
              <div>✓ Automated build and regression tests will execute</div>
              <div>✓ Instant edge deployment with zero downtime</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                onClick={() => setShowApprovalModal(false)}
                style={{
                  flex: 1,
                  padding: "0.65rem",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid #1D2732",
                  color: "#A5AFBC",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleApproveDeployment}
                style={{
                  flex: 1,
                  padding: "0.65rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)",
                  border: "none",
                  color: "#05070A",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Approve &amp; Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: DEPLOYMENT PROGRESSION & LIVE SUCCESS STATE                     */}
      {/* ========================================================================= */}
      {(previewState === "deploying" || previewState === "deployed") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 7, 10, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#0D1218",
              border: "1px solid #2A3542",
              borderRadius: "16px",
              padding: "2.2rem",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {previewState === "deploying" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "#42D9FF",
                      boxShadow: "0 0 10px #42D9FF",
                      animation: "pulse 1s infinite",
                    }}
                  />
                  <h3
                    style={{
                      fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#F5F7FA",
                    }}
                  >
                    UPDATING YOUR WEBSITE...
                  </h3>
                </div>

                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "10px",
                    background: "#121922",
                    border: "1px solid #1D2732",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ color: deploymentStep >= 1 ? "#45D483" : "#66717F" }}>
                    {deploymentStep >= 1 ? "✓" : "●"} Changes approved
                  </div>
                  <div style={{ color: deploymentStep >= 2 ? "#45D483" : "#66717F" }}>
                    {deploymentStep >= 2 ? "✓" : deploymentStep === 1 ? "●" : "○"} Build completed
                  </div>
                  <div style={{ color: deploymentStep >= 3 ? "#45D483" : "#66717F" }}>
                    {deploymentStep >= 3 ? "✓" : deploymentStep === 2 ? "●" : "○"} Deployment completed
                  </div>
                  <div style={{ color: deploymentStep >= 4 ? "#45D483" : "#66717F" }}>
                    {deploymentStep >= 4 ? "✓" : deploymentStep === 3 ? "●" : "○"} Website verified
                  </div>
                </div>
              </div>
            ) : (
              // SUCCESS STATE
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center", alignItems: "center" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(69, 212, 131, 0.15)",
                    color: "#45D483",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconCheck size={28} color="#45D483" />
                </div>

                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      color: "#F5F7FA",
                      marginBottom: "0.4rem",
                    }}
                  >
                    YOUR WEBSITE IS LIVE
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "#A5AFBC" }}>
                    The verified AI modifications have been pushed to production.
                  </p>
                </div>

                <div
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    background: "#121922",
                    border: "1px solid #1D2732",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: "#45D483" }}>{activeLiveUrl}</span>
                  <a href={activeLiveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#42D9FF", textDecoration: "none" }}>
                    <IconExternalLink size={14} color="#42D9FF" />
                  </a>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                  <a
                    href={activeLiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      textAlign: "center",
                    }}
                  >
                    OPEN WEBSITE ↗
                  </a>
                  <button
                    onClick={() => {
                      setPreviewState("none");
                      setPromptText("");
                      setActiveTab("home");
                    }}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: "#121922",
                      border: "1px solid #1D2732",
                      color: "#F5F7FA",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Continue Editing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. ADVANCED TELEMETRY DRAWER                                             */}
      {/* ========================================================================= */}
      {showTelemetry && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "360px",
            background: "#0D1218",
            border: "1px solid #2A3542",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.8)",
            zIndex: 60,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#7C6CFF",
                textTransform: "uppercase",
              }}
            >
              System Telemetry
            </span>
            <button onClick={() => setShowTelemetry(false)} style={{ background: "none", border: "none", color: "#66717F", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: "0.74rem",
              color: "#A5AFBC",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>AI Engine:</span>
              <span style={{ color: "#42D9FF" }}>ryvix-orchestrator-v1</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Database Sync:</span>
              <span style={{ color: "#45D483" }}>Supabase RLS Connected</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Active Servers:</span>
              <span style={{ color: "#F5F7FA" }}>{servers.length} Fleet Nodes</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Docker Sandbox:</span>
              <span style={{ color: "#A78BFA" }}>Ephemeral Container Ready</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 12. HIGH-IMPACT BEFORE VS AFTER WEBSITE SIMULATIONS
// =========================================================================

/**
 * BEFORE SIMULATION (Plain legacy website)
 */
function LegacyWebsiteSimulation() {
  return (
    <div style={{ padding: "3rem 2.5rem", background: "#0b0f15", color: "#94a3b8", minHeight: "600px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #1a2332",
          paddingBottom: "1rem",
          marginBottom: "3.5rem",
        }}
      >
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#cbd5e1" }}>My Portfolio (Old)</div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
          <span>Home</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      </div>

      <div style={{ textAlign: "center", maxWidth: "550px", margin: "0 auto 4rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "1rem" }}>
          Welcome to my portfolio
        </h2>
        <p style={{ fontSize: "0.95rem", color: "#64748b", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          I build web applications and digital tools. Check out my work below.
        </p>
        <button
          style={{
            padding: "0.6rem 1.2rem",
            background: "#263548",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            fontSize: "0.85rem",
          }}
        >
          View Work
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ padding: "1.5rem", background: "#111822", border: "1px solid #1a2332", borderRadius: "4px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "0.5rem" }}>
            Project One
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Basic web application built with React.</div>
        </div>
        <div style={{ padding: "1.5rem", background: "#111822", border: "1px solid #1a2332", borderRadius: "4px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "0.5rem" }}>
            Project Two
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Simple database integration and dashboard.</div>
        </div>
      </div>
    </div>
  );
}

/**
 * AFTER SIMULATION (Modernized by RYVIX with bold typography, glassmorphism, accent glow)
 */
function ModernizedWebsiteSimulation() {
  return (
    <div
      style={{
        padding: "3.5rem 3rem",
        background: "radial-gradient(ellipse at top, #0f1624 0%, #05070A 100%)",
        color: "#F5F7FA",
        minHeight: "600px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <IconSparkles size={14} color="#ffffff" />
          </div>
          <span
            style={{
              fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              fontSize: "1.1rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            NOVA STUDIO
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.85rem", color: "#A5AFBC" }}>
          <span style={{ color: "#F5F7FA", fontWeight: 500 }}>Projects</span>
          <span>Services</span>
          <span>About</span>
          <button
            style={{
              padding: "0.4rem 0.95rem",
              borderRadius: "9999px",
              background: "rgba(124, 108, 255, 0.15)",
              border: "1px solid rgba(124, 108, 255, 0.4)",
              color: "#A78BFA",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Get In Touch &rarr;
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", maxWidth: "620px", margin: "0 auto 4.5rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: "rgba(66, 217, 255, 0.1)",
            border: "1px solid rgba(66, 217, 255, 0.3)",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: "0.72rem",
            color: "#42D9FF",
            marginBottom: "1.2rem",
          }}
        >
          <IconSparkles size={12} color="#42D9FF" />
          <span>MODERNIZED BY RYVIX AI</span>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
            fontSize: "2.8rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: "1.2rem",
            background: "linear-gradient(135deg, #ffffff 30%, #A78BFA 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Building high-impact digital experiences.
        </h2>

        <p style={{ fontSize: "1.05rem", color: "#A5AFBC", lineHeight: 1.6, marginBottom: "2rem" }}>
          Next-generation interface design and engineering for forward-thinking engineering startups and product teams.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.85rem" }}>
          <button
            style={{
              padding: "0.75rem 1.6rem",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 25px rgba(124, 108, 255, 0.4)",
            }}
          >
            Explore Projects &rarr;
          </button>
          <button
            style={{
              padding: "0.75rem 1.4rem",
              borderRadius: "10px",
              background: "#121922",
              border: "1px solid #1D2732",
              color: "#F5F7FA",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Book Consultation
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div
          style={{
            padding: "1.8rem",
            background: "rgba(18, 25, 34, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(124, 108, 255, 0.25)",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
            Interactive Design Systems
          </div>
          <div style={{ fontSize: "0.85rem", color: "#A5AFBC", lineHeight: 1.5 }}>
            Component architecture built with rigorous design tokens, accessible color palettes, and micro-interactions.
          </div>
        </div>

        <div
          style={{
            padding: "1.8rem",
            background: "rgba(18, 25, 34, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(66, 217, 255, 0.25)",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
            High-Performance Web Apps
          </div>
          <div style={{ fontSize: "0.85rem", color: "#A5AFBC", lineHeight: 1.5 }}>
            Sub-millisecond render times, responsive layouts, and edge deployment optimized for global traffic.
          </div>
        </div>
      </div>
    </div>
  );
}
