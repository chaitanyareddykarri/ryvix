"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import MovingBlocks3D from "@/components/MovingBlocks3D";
import ConnectRepositoryModal from "@/components/ConnectRepositoryModal";
import ConnectServerModal from "@/components/ConnectServerModal";

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

function IconFolderGit({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <circle cx="12" cy="13" r="2" />
      <path d="M14 13h3" />
      <path d="M7 13h3" />
    </svg>
  );
}

function IconLayers({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconEye({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconRocket({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function IconActivity({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconAlertCircle({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconFileText({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconSliders({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

// =========================================================================
// 2. DATA CONTRACTS & STATE DEFINITIONS
// =========================================================================
export type NavSection =
  | "overview"
  | "ai"
  | "websites"
  | "repositories"
  | "tasks"
  | "workspaces"
  | "previews"
  | "changes"
  | "deployments"
  | "monitoring"
  | "incidents"
  | "security"
  | "audit"
  | "connections"
  | "settings";

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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavSection>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // User & Workspace Identity
  const [userEmail, setUserEmail] = useState<string>("developer@company.com");
  const [orgName, setOrgName] = useState<string>("Nova Studio");
  const [websiteDomain, setWebsiteDomain] = useState<string>("novastudio.agency");
  const [selectedWebsite, setSelectedWebsite] = useState<string>("Nova Studio");

  // Real Database Data
  const [servers, setServers] = useState<ConnectedServer[]>([]);
  const [tasks, setTasks] = useState<DatabaseTask[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Entrance Overlay
  const [showEntrance, setShowEntrance] = useState<boolean>(true);

  // Connection & Modals
  const [githubConnected, setGithubConnected] = useState<boolean>(true);
  const [showRepoModal, setShowRepoModal] = useState<boolean>(false);
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState<boolean>(false);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [customLiveUrl, setCustomLiveUrl] = useState<string>("https://novastudio.agency");

  // AI Prompt & Workspace State
  const [promptText, setPromptText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("AI READY");
  const [previewState, setPreviewState] = useState<"none" | "analyzing" | "preview_ready" | "deploying" | "deployed">("none");
  const [analyzingStep, setAnalyzingStep] = useState<number>(0);
  const [deploymentStep, setDeploymentStep] = useState<number>(0);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [monitoringAdvanced, setMonitoringAdvanced] = useState<boolean>(false);
  const [securityAdvanced, setSecurityAdvanced] = useState<boolean>(false);
  const [workspaceAdvanced, setWorkspaceAdvanced] = useState<boolean>(false);
  const [settingsCategory, setSettingsCategory] = useState<"account" | "project" | "ai" | "notifications" | "connections" | "security">("account");
  const [repoSearch, setRepoSearch] = useState<string>("");

  // Preview & Comparison State
  const [comparisonMode, setComparisonMode] = useState<"toggle" | "slider" | "side-by-side">("slider");
  const [isShowingAfter, setIsShowingAfter] = useState<boolean>(true);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);

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

  // Suggested Prompts (Section 14 Quick Actions)
  const suggestedChanges = [
    { id: "modern", text: "Make my homepage modern" },
    { id: "mobile", text: "Improve mobile design" },
    { id: "dark", text: "Add dark mode" },
    { id: "hero", text: "Redesign hero section" },
    { id: "perf", text: "Improve performance" },
  ];

  // Mock Repositories
  const mockRepos = [
    { name: "my-portfolio", stack: "Next.js 15 · TypeScript", status: "Connected", branch: "main", stars: 18 },
    { name: "saas-landing-page", stack: "React · Vite · Tailwind", status: "Available", branch: "production", stars: 42 },
    { name: "ecommerce-store", stack: "Next.js · Tailwind", status: "Available", branch: "main", stars: 7 },
  ];

  // Change History Records (Section 17 & 18)
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([
    {
      id: "ch-101",
      dateGroup: "Today",
      time: "2 minutes ago",
      title: "Homepage redesign",
      request: "Make homepage modern with Space Grotesk typography and interactive glass cards.",
      aiSummary: "Modernized hero banner, increased typographic contrast, and added subtle gradient border cards.",
      status: "Live",
      filesCount: 8,
      branch: "ryvix/patch-modernize-hero",
      commit: "a8f9c2d",
      previewUrl: "https://preview-myportfolio.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
    {
      id: "ch-102",
      dateGroup: "Today",
      time: "1 hour ago",
      title: "Mobile navigation update",
      request: "Improve mobile navigation and responsive layout.",
      aiSummary: "Converted horizontal nav to sliding sheet drawer for viewports under 768px.",
      status: "Live",
      filesCount: 4,
      branch: "ryvix/patch-mobile-nav",
      commit: "f92d41a",
      previewUrl: "https://preview-mobilenav.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
    {
      id: "ch-103",
      dateGroup: "Yesterday",
      time: "Yesterday",
      title: "Dark mode implementation",
      request: "Add dark mode and fix contrast tokens across elements.",
      aiSummary: "Injected CSS dark tokens, smooth transition classes, and theme switcher hook.",
      status: "Live",
      filesCount: 3,
      branch: "ryvix/patch-dark-mode",
      commit: "e4b107c",
      previewUrl: "https://preview-darkmode.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
    {
      id: "ch-104",
      dateGroup: "Yesterday",
      time: "Yesterday",
      title: "Hero section update",
      request: "Redesign the hero section with animated badge and high-contrast CTA.",
      aiSummary: "Updated headline hierarchy, integrated live telemetry chip, and polished button transitions.",
      status: "Live",
      filesCount: 5,
      branch: "ryvix/patch-hero-refresh",
      commit: "c3d719e",
      previewUrl: "https://preview-hero.ryvix.dev",
      liveUrl: "https://novastudio.agency",
    },
  ]);

  // Entrance Timer
  useEffect(() => {
    const timer = setTimeout(() => setShowEntrance(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Database & Server Data
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
        console.warn("Failed to load live workspace data:", err);
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
    const rotateX = ((y - centerY) / centerY) * -2.5;
    const rotateY = ((x - centerX) / centerX) * 2.5;
    setCardRotate({ x: rotateX, y: rotateY, mouseX: x, mouseY: y });
  }

  function handleHeroMouseLeave() {
    setCardRotate({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  }

  // Draggable Slider
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

  // Submit Prompt to AI & Orchestrate Workflow
  async function handlePromptSubmit(e?: React.FormEvent, customPrompt?: string) {
    if (e) e.preventDefault();
    const finalPrompt = customPrompt || promptText.trim();
    if (!finalPrompt) return;

    if (!customPrompt) setPromptText(finalPrompt);

    setIsProcessing(true);
    setPreviewState("analyzing");
    setAnalyzingStep(0);
    setStatusMessage("AI WORKING");

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

    setTimeout(() => setAnalyzingStep(1), 500);
    setTimeout(() => setAnalyzingStep(2), 1100);
    setTimeout(() => setAnalyzingStep(3), 1700);
    setTimeout(() => {
      setAnalyzingStep(4);
      setPreviewState("preview_ready");
      setIsProcessing(false);
      setStatusMessage("AI READY");
      setActiveTab("previews");
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
      {/* Background Kinetic Layer */}
      <div style={{ opacity: 0.18, pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0 }}>
        <MovingBlocks3D density="spacious" interactive={false} />
      </div>

      {/* Subtle Engineering Grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.016) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.016) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Volumetric Radial Glow */}
      <div
        style={{
          position: "fixed",
          top: "12%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1100px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(124, 108, 255, 0.1) 0%, rgba(66, 217, 255, 0.035) 40%, transparent 70%)",
          filter: "blur(110px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ========================================================================= */}
      {/* ENTRANCE INTRO                                                            */}
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
          <div style={{ position: "relative", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(124, 108, 255, 0.5)", borderTopColor: "#42D9FF", animation: "spin 1.8s linear infinite" }} />
            <div style={{ position: "absolute", inset: "6px", borderRadius: "50%", border: "1.5px dashed rgba(167, 139, 250, 0.4)", animation: "spinReverse 3s linear infinite" }} />
            <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", boxShadow: "0 0 20px #7C6CFF" }} />
          </div>
          <div style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "0.22em", color: "#F5F7FA" }}>
            RYVIX
          </div>
          <div style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.75rem", color: "#45D483", letterSpacing: "0.14em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#45D483", boxShadow: "0 0 8px #45D483" }} />
            AI WEBSITE CONTROL CENTER
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP BAR                                                                   */}
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
        <div style={{ maxWidth: "1680px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          {/* Left: Brand + Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
              <span style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#F5F7FA" }}>
                RYVIX
              </span>
            </Link>

            <span style={{ color: "#66717F", fontSize: "0.85rem" }}>/</span>

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
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F5F7FA" }}>my-portfolio</span>
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
                  <div style={{ fontSize: "0.66rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", fontWeight: 700, padding: "0.4rem 0.6rem", textTransform: "uppercase" }}>
                    Select Target Website
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
                        setShowRepoModal(true);
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
                      + Connect Repository &rarr;
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

          {/* Center Context Pill */}
          <div
            style={{
              display: "none",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: "0.74rem",
              color: "#66717F",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
            className="desktop-only-flex"
          >
            <span>AI WORKSPACE</span>
            <span>{"//"}</span>
            <span style={{ color: "#F5F7FA" }}>{activeTab}</span>
          </div>

          {/* Right: AI Status, Telemetry & User */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isProcessing ? "#42D9FF" : "#45D483", boxShadow: `0 0 8px ${isProcessing ? "#42D9FF" : "#45D483"}` }} />
              {statusMessage}
            </div>

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

            {/* Profile Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.3rem 0.65rem", borderRadius: "8px", background: "#0D1218", border: "1px solid #1D2732" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "linear-gradient(135deg, #7C6CFF, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#ffffff" }}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: "0.78rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                {userEmail.split("@")[0]}
              </span>
              <button onClick={handleSignOut} title="Sign Out" style={{ background: "none", border: "none", color: "#66717F", cursor: "pointer", fontSize: "0.75rem", padding: "0 0.15rem" }}>
                Exit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN APPLICATION SHELL (COLLAPSIBLE SIDEBAR + FULL WORKSPACE)             */}
      {/* ========================================================================= */}
      <div style={{ display: "flex", flex: 1, maxWidth: "1680px", width: "100%", margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* COLLAPSIBLE PREMIUM SIDEBAR */}
        <aside
          style={{
            width: isSidebarCollapsed ? "68px" : "220px",
            borderRight: "1px solid #1D2732",
            backgroundColor: "#080C11",
            padding: "1.25rem 0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            flexShrink: 0,
            transition: "width 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            overflowX: "hidden",
          }}
        >
          {/* Collapse Toggle Button */}
          <div style={{ display: "flex", justifyContent: isSidebarCollapsed ? "center" : "flex-end", padding: "0 0.4rem 0.75rem" }}>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{
                background: "none",
                border: "none",
                color: "#66717F",
                cursor: "pointer",
                padding: "0.3rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? "⇥" : "⇤"}
            </button>
          </div>

          {/* NAVIGATION SECTIONS */}
          <SidebarNavGroup
            title="MAIN"
            collapsed={isSidebarCollapsed}
            items={[
              { id: "overview", label: "Overview", icon: <IconHome size={16} /> },
              { id: "ai", label: "AI Assistant", icon: <IconSparkles size={16} />, badge: previewState !== "none" ? "●" : undefined },
              { id: "websites", label: "Websites", icon: <IconGlobe size={16} /> },
              { id: "repositories", label: "Repositories", icon: <IconFolderGit size={16} /> },
              { id: "tasks", label: "Tasks", icon: <IconCpu size={16} />, badge: tasks.length ? `${tasks.length}` : undefined },
            ]}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          <SidebarNavGroup
            title="WORKSPACE"
            collapsed={isSidebarCollapsed}
            items={[
              { id: "workspaces", label: "Workspaces", icon: <IconLayers size={16} /> },
              { id: "previews", label: "Previews", icon: <IconEye size={16} /> },
              { id: "changes", label: "Changes / History", icon: <IconHistory size={16} />, badge: `${changeHistory.length}` },
            ]}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          <SidebarNavGroup
            title="DELIVERY"
            collapsed={isSidebarCollapsed}
            items={[
              { id: "deployments", label: "Deployments", icon: <IconRocket size={16} /> },
              { id: "monitoring", label: "Monitoring", icon: <IconActivity size={16} /> },
              { id: "incidents", label: "Incidents", icon: <IconAlertCircle size={16} /> },
            ]}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          <SidebarNavGroup
            title="TRUST"
            collapsed={isSidebarCollapsed}
            items={[
              { id: "security", label: "Security", icon: <IconShield size={16} /> },
              { id: "audit", label: "Audit", icon: <IconFileText size={16} /> },
              { id: "connections", label: "Connections", icon: <IconSliders size={16} /> },
            ]}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          <SidebarNavGroup
            title="SYSTEM"
            collapsed={isSidebarCollapsed}
            items={[
              { id: "settings", label: "Settings", icon: <IconSettings size={16} /> },
            ]}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          {/* Bottom Project Box */}
          {!isSidebarCollapsed && (
            <div style={{ marginTop: "auto", padding: "0.85rem", borderRadius: "8px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.64rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase" }}>
                  Active Project
                </span>
                <span style={{ fontSize: "0.62rem", color: "#45D483" }}>● Synced</span>
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F7FA" }}>my-portfolio</div>
              <div style={{ fontSize: "0.68rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeLiveUrl.replace("https://", "")}
              </div>
            </div>
          )}
        </aside>

        {/* ========================================================================= */}
        {/* WORKSPACE CONTENT AREA (Responsive to All Navigation Tabs)                */}
        {/* ========================================================================= */}
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto", minHeight: "calc(100vh - 60px)" }}>
          {/* 1. OVERVIEW (DEFAULT USER-FIRST FLAGSHIP PAGE) */}
          {activeTab === "overview" && (
            <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1rem" }}>
              {/* Gyroscopic AI Core */}
              <div style={{ position: "relative", width: "68px", height: "68px", marginBottom: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(124, 108, 255, 0.4)", borderTopColor: "#42D9FF", borderBottomColor: "#A78BFA", animation: isProcessing ? "spin 1s linear infinite" : "spin 12s linear infinite" }} />
                <div style={{ position: "absolute", inset: "8px", borderRadius: "50%", border: "1.5px dashed rgba(66, 217, 255, 0.4)", animation: isProcessing ? "spinReverse 1.5s linear infinite" : "spinReverse 8s linear infinite" }} />
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)", boxShadow: "0 0 25px rgba(124, 108, 255, 0.7)", animation: "pulse 2s infinite ease-in-out" }} />
              </div>

              {/* Status Pill */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", padding: "0.3rem 0.9rem", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "9999px", fontSize: "0.76rem", color: "#A5AFBC", marginBottom: "1.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#45D483", boxShadow: "0 0 6px #45D483" }} />
                <span>Connected Website:</span>
                <span style={{ color: "#F5F7FA", fontWeight: 600, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {activeLiveUrl.replace("https://", "")}
                </span>
                <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.35rem", borderRadius: "4px", background: "rgba(124, 108, 255, 0.15)", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  GitHub Synced
                </span>
              </div>

              {/* Section 12: Greeting */}
              <div style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.15rem", fontWeight: 600, color: "#A5AFBC", letterSpacing: "-0.01em", marginBottom: "0.4rem" }}>
                Good evening.
              </div>

              {/* Section 13: Headline */}
              <h1 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "clamp(2.4rem, 5.2vw, 3.8rem)", fontWeight: 800, letterSpacing: "-0.04em", textAlign: "center", lineHeight: 1.15, marginBottom: "0.8rem", color: "#F5F7FA" }}>
                What would you like to change?
              </h1>

              {/* Section 13: Subtitle */}
              <p style={{ fontSize: "1.06rem", color: "#A5AFBC", textAlign: "center", marginBottom: "2.4rem", maxWidth: "600px", lineHeight: 1.5 }}>
                Describe what you want changed. RYVIX handles the technical work.
              </p>

              {/* 3D PERSPECTIVE AI COMMAND SURFACE */}
              <div
                ref={heroCardRef}
                onMouseMove={handleHeroMouseMove}
                onMouseLeave={handleHeroMouseLeave}
                style={{ width: "100%", maxWidth: "780px", perspective: "1000px", marginBottom: "1.2rem" }}
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
                      placeholder="Tell RYVIX what you want to change..."
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

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid #1D2732" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F" }}>
                      <span>Press</span>
                      <span style={{ padding: "0.1rem 0.35rem", borderRadius: "3px", background: "#121922", border: "1px solid #1D2732" }}>⌘ Enter</span>
                      <span>to run</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing || !promptText.trim()}
                      style={{
                        padding: "0.65rem 1.45rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        background: promptText.trim() ? "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)" : "#121922",
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
                          <span>Run with RYVIX</span>
                          <IconArrowRight size={15} color="#ffffff" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Safety Pill */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "#66717F", marginBottom: "2.6rem" }}>
                <IconShield size={15} color="#45D483" />
                <span>Preview only — your live website has not been changed. Live site updates only when you approve.</span>
              </div>

              {/* Quick Actions */}
              <div style={{ width: "100%", maxWidth: "780px", display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center", marginBottom: "3rem" }}>
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

              {/* YOUR WEBSITE STATUS CARD */}
              <div style={{ width: "100%", maxWidth: "780px", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "0.66rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase" }}>YOUR WEBSITE</span>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#F5F7FA", marginTop: "0.2rem" }}>My Portfolio</h3>
                  </div>
                  <span style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", border: "1px solid rgba(69, 212, 131, 0.3)", color: "#45D483", fontSize: "0.72rem", fontWeight: 600 }}>
                    ● LIVE
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", background: "#121922", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.7rem", color: "#66717F" }}>GitHub</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#45D483", marginTop: "2px" }}>✓ Connected</div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "#121922", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.7rem", color: "#66717F" }}>AI</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#45D483", marginTop: "2px" }}>✓ Ready</div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "#121922", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.7rem", color: "#66717F" }}>Website</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#45D483", marginTop: "2px" }}>✓ Online</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                  <span style={{ fontSize: "0.78rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                    {activeLiveUrl}
                  </span>
                  <button onClick={() => setActiveTab("previews")} style={{ padding: "0.45rem 1rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                    Open Preview Studio &rarr;
                  </button>
                </div>
              </div>

              {/* Section 16: CURRENT WORK TIMELINE */}
              <div style={{ width: "100%", maxWidth: "780px", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA" }}>Current Work</h4>
                    <p style={{ fontSize: "0.82rem", color: isProcessing ? "#42D9FF" : "#A5AFBC", marginTop: "2px" }}>
                      {isProcessing ? "AI is updating your website" : "AI is updating your website"}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "rgba(124, 108, 255, 0.12)", border: "1px solid rgba(124, 108, 255, 0.3)", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                    {isProcessing ? "In Progress" : "Preview Ready"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "0.5rem 0" }}>
                  {["Analyzing", "Planning", "Coding", "Testing", "Preview", "Review", "Deploy"].map((step, idx) => {
                    const isDone = idx <= (isProcessing ? analyzingStep : 4);
                    const isCurrent = idx === (isProcessing ? analyzingStep : 4);
                    return (
                      <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", zIndex: 2 }}>
                        <div
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: isCurrent ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : isDone ? "#7C6CFF" : "#121922",
                            border: `2px solid ${isCurrent ? "#42D9FF" : isDone ? "#A78BFA" : "#1D2732"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "#ffffff",
                            boxShadow: isCurrent ? "0 0 14px rgba(66, 217, 255, 0.5)" : "none",
                            transition: "all 0.3s ease",
                          }}
                        >
                          {isDone ? "✓" : `${idx + 1}`}
                        </div>
                        <span style={{ fontSize: "0.68rem", color: isDone ? "#F5F7FA" : "#66717F", fontWeight: isCurrent ? 600 : 400, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                  {/* Connecting Line */}
                  <div style={{ position: "absolute", top: "18px", left: "20px", right: "20px", height: "2px", background: "#1D2732", zIndex: 1 }} />
                </div>
              </div>

              {/* Section 17: RECENT CHANGES */}
              <div style={{ width: "100%", maxWidth: "780px", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA" }}>Recent Changes</h4>
                  <button onClick={() => setActiveTab("changes")} style={{ background: "none", border: "none", color: "#7C6CFF", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <span>View Full History</span>
                    <span>→</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {changeHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setExpandedHistoryId(item.id);
                        setActiveTab("changes");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.85rem 1rem",
                        background: "#121922",
                        borderRadius: "8px",
                        border: "1px solid #1D2732",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#7C6CFF";
                        e.currentTarget.style.transform = "translateX(3px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#1D2732";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#F5F7FA" }}>{item.title}</div>
                        <div style={{ fontSize: "0.74rem", color: "#66717F", marginTop: "2px" }}>
                          {item.dateGroup} · {item.time} · {item.filesCount} files changed
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "4px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", fontWeight: 600 }}>
                          LIVE
                        </span>
                        <span style={{ color: "#66717F", fontSize: "0.8rem" }}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. AI ASSISTANT DEEP WORKSPACE */}
          {activeTab === "ai" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 420px) 1fr", gap: "1.5rem", height: "calc(100vh - 120px)", minHeight: "680px" }}>
              {/* Left Column: AI Conversation */}
              <div style={{ display: "flex", flexDirection: "column", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px", overflow: "hidden" }}>
                {/* Section 20: Project-Aware Context Bar */}
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #1D2732", background: "#080C11", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #7C6CFF, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                        <IconSparkles size={14} color="#ffffff" />
                      </div>
                      <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#F5F7FA" }}>RYVIX AI</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.7rem", color: "#45D483" }}>● Project Aware</span>
                  </div>

                  {/* Context Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem", padding: "0.45rem", background: "#0D1218", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>PROJECT</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#F5F7FA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>My Portfolio</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>GITHUB</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#45D483" }}>Connected</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>WEBSITE</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#45D483" }}>Live</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>FRAMEWORK</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#42D9FF" }}>Next.js</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>STATUS</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#A78BFA" }}>Ready</div>
                    </div>
                  </div>
                </div>

                {/* Section 19: AI Workspace Chat Stream */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* User Bubble */}
                  <div style={{ alignSelf: "flex-end", maxWidth: "85%", padding: "0.85rem 1.1rem", borderRadius: "14px 14px 2px 14px", background: "linear-gradient(135deg, #7C6CFF 0%, #6366f1 100%)", color: "#ffffff", fontSize: "0.88rem", lineHeight: 1.45 }}>
                    <div style={{ fontSize: "0.68rem", opacity: 0.8, marginBottom: "0.2rem", fontWeight: 600 }}>User:</div>
                    {promptText || "Make the homepage more modern."}
                  </div>

                  {/* AI Bubble */}
                  <div style={{ alignSelf: "flex-start", maxWidth: "92%", padding: "1.1rem 1.25rem", borderRadius: "14px 14px 14px 2px", background: "#121922", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <IconSparkles size={16} color="#A78BFA" />
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#F5F7FA" }}>AI: I will update the hero and typography.</span>
                    </div>
                    <div style={{ fontSize: "0.84rem", color: "#A5AFBC", lineHeight: 1.5 }}>
                      I will update the hero section, typography tokens, and responsive layout for your active website while preserving all existing routing and content.
                    </div>
                    <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontWeight: 700, color: "#66717F", textTransform: "uppercase" }}>
                      Planned modifications:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.82rem", color: "#F5F7FA" }}>
                      <div>✓ Hero redesign with Space Grotesk hierarchy</div>
                      <div>✓ Subtle glassmorphic feature cards</div>
                      <div>✓ Mobile navigation drawer optimization</div>
                      <div>✓ Zero breaking schema changes</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => handlePromptSubmit(e)} style={{ padding: "0.85rem 1rem", borderTop: "1px solid #1D2732", background: "#080C11", display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Tell RYVIX what to do..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    disabled={isProcessing}
                    style={{ flex: 1, padding: "0.65rem 0.85rem", borderRadius: "8px", background: "#0D1218", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.85rem", outline: "none" }}
                  />
                  <button type="submit" disabled={isProcessing || !promptText.trim()} style={{ padding: "0.65rem 1.25rem", borderRadius: "8px", border: "none", background: promptText.trim() ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : "#121922", color: promptText.trim() ? "#ffffff" : "#66717F", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.04em", cursor: promptText.trim() ? "pointer" : "default" }}>
                    SEND
                  </button>
                </form>
              </div>

              {/* Right Column: Preview studio */}
              <div style={{ display: "flex", flexDirection: "column", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px", overflow: "hidden" }}>
                <PreviewStudioFrame
                  activeLiveUrl={activeLiveUrl}
                  activePreviewUrl={activePreviewUrl}
                  comparisonMode={comparisonMode}
                  setComparisonMode={setComparisonMode}
                  isShowingAfter={isShowingAfter}
                  setIsShowingAfter={setIsShowingAfter}
                  sliderPos={sliderPos}
                  setSliderPos={setSliderPos}
                  sliderRef={sliderRef}
                  isDraggingRef={isDraggingRef}
                  viewport={viewport}
                  setViewport={setViewport}
                  onApprove={() => setShowApprovalModal(true)}
                  onReject={() => {
                    setPreviewState("none");
                    setPromptText("");
                  }}
                />
              </div>
            </div>
          )}

          {/* Section 23: WEBSITES / PROJECTS */}
          {activeTab === "websites" && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Production Fleets
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    WEBSITES &amp; PROJECTS
                  </h2>
                </div>
                <button onClick={() => setShowRepoModal(true)} style={{ padding: "0.55rem 1.15rem", borderRadius: "8px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer" }}>
                  + Connect Website
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
                {/* Primary Connected Website Card (Section 23) */}
                <div style={{ background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(124, 108, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconGlobe size={20} color="#7C6CFF" />
                      </div>
                      <div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA" }}>My Portfolio</div>
                        <div style={{ fontSize: "0.74rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>github.com/user/my-portfolio</div>
                      </div>
                    </div>
                    <span style={{ padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontSize: "0.7rem", fontWeight: 600 }}>
                      ● LIVE
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem" }}>
                    <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922" }}>
                      <div style={{ fontSize: "0.65rem", color: "#66717F", textTransform: "uppercase" }}>Framework</div>
                      <div style={{ fontWeight: 600, color: "#42D9FF", marginTop: "2px" }}>Next.js</div>
                    </div>
                    <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922" }}>
                      <div style={{ fontSize: "0.65rem", color: "#66717F", textTransform: "uppercase" }}>Last updated</div>
                      <div style={{ fontWeight: 600, color: "#A5AFBC", marginTop: "2px" }}>2 minutes ago</div>
                    </div>
                  </div>

                  <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922", fontSize: "0.78rem", color: "#A5AFBC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>{activeLiveUrl}</span>
                    <a href={activeLiveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#42D9FF", textDecoration: "none" }}>↗</a>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                    <button onClick={() => { setActiveTab("overview"); }} style={{ flex: 1, padding: "0.55rem", borderRadius: "6px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
                      Open Project
                    </button>
                    <button onClick={() => { setActiveTab("ai"); }} style={{ padding: "0.55rem 1rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                      Ask AI
                    </button>
                  </div>
                </div>

                {servers.map((s) => (
                  <div key={s.id} style={{ background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(66, 217, 255, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <IconCpu size={20} color="#42D9FF" />
                        </div>
                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>{s.hostname}</div>
                          <div style={{ fontSize: "0.72rem", color: "#66717F" }}>{s.provider} · {s.os}</div>
                        </div>
                      </div>
                      <span style={{ padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", fontSize: "0.7rem", fontWeight: 600 }}>
                        ● {s.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922", fontSize: "0.78rem", color: "#A5AFBC" }}>
                      IP: {s.ip}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 21 & 22: REPOSITORIES */}
          {activeTab === "repositories" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Codebases
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    Your repositories
                  </h2>
                </div>
                <button onClick={() => setShowRepoModal(true)} style={{ padding: "0.55rem 1.15rem", borderRadius: "8px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer" }}>
                  + Connect GitHub Repo
                </button>
              </div>

              {/* Section 21: GitHub Connection Banner */}
              <div style={{ padding: "1.25rem 1.5rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5F7FA" }}>Connect your GitHub project</h4>
                  <p style={{ fontSize: "0.82rem", color: "#A5AFBC", marginTop: "2px" }}>
                    RYVIX needs access to your existing project to understand and modify your website.
                  </p>
                </div>
                <button onClick={() => setShowRepoModal(true)} style={{ padding: "0.45rem 1rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", color: "#42D9FF", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Connect GitHub
                </button>
              </div>

              {/* Search Bar (Section 22) */}
              <div style={{ marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "#0D1218",
                    border: "1px solid #1D2732",
                    color: "#F5F7FA",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Repository Cards (Section 22) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {mockRepos
                  .filter((r) => r.name.toLowerCase().includes(repoSearch.toLowerCase()) || r.stack.toLowerCase().includes(repoSearch.toLowerCase()))
                  .map((repo) => (
                    <div
                      key={repo.name}
                      onClick={() => {
                        setSelectedWebsite(repo.name);
                        setActiveTab("overview");
                      }}
                      style={{
                        padding: "1.2rem 1.5rem",
                        borderRadius: "10px",
                        background: "#0D1218",
                        border: "1px solid #1D2732",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#7C6CFF";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#1D2732";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <IconFolderGit size={22} color="#7C6CFF" />
                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>{repo.name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#66717F", marginTop: "2px" }}>
                            {repo.stack} · branch: <span style={{ color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>{repo.branch}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontWeight: 600 }}>
                          ● Connected
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWebsite(repo.name);
                            setActiveTab("overview");
                          }}
                          style={{
                            padding: "0.45rem 0.95rem",
                            borderRadius: "6px",
                            background: "#121922",
                            border: "1px solid #1D2732",
                            color: "#F5F7FA",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Select Project
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 24: TASKS */}
          {activeTab === "tasks" && (
            <div style={{ maxWidth: "980px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Autonomous Pipeline
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    AI TASK OPERATIONS
                  </h2>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  Lifecycle System
                </div>
              </div>

              {/* Lifecycle Stage Pills (Section 24) */}
              <div style={{ padding: "0.75rem 1rem", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "10px", marginBottom: "1.5rem", overflowX: "auto" }}>
                <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.45rem" }}>
                  Complete Operation Lifecycle Statuses:
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                  {[
                    "Planning",
                    "Awaiting Approval",
                    "Coding",
                    "Testing",
                    "Preview Ready",
                    "Awaiting Review",
                    "Creating PR",
                    "CI",
                    "Deploying",
                    "Verifying",
                    "Succeeded",
                    "Failed",
                  ].map((st, idx) => (
                    <span
                      key={st}
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        background: st === "Preview Ready" || st === "Succeeded" ? "rgba(69, 212, 131, 0.12)" : "#121922",
                        border: `1px solid ${st === "Preview Ready" || st === "Succeeded" ? "rgba(69, 212, 131, 0.3)" : "#1D2732"}`,
                        color: st === "Preview Ready" || st === "Succeeded" ? "#45D483" : "#A5AFBC",
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        fontWeight: 600,
                      }}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tasks List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {[
                  {
                    id: "task-01",
                    request: promptText || "Homepage redesign with Space Grotesk typography and modern cards",
                    status: isProcessing ? "Coding" : "Preview Ready",
                    time: "Today · 2 minutes ago",
                    project: "my-portfolio",
                    progress: isProcessing ? "3/7 steps" : "5/7 steps (Ready for review)",
                  },
                  {
                    id: "task-02",
                    request: "Improve mobile navigation layout and responsive drawer",
                    status: "Succeeded",
                    time: "Today · 1 hour ago",
                    project: "my-portfolio",
                    progress: "Completed & deployed",
                  },
                  {
                    id: "task-03",
                    request: "Inject dark mode color tokens into root stylesheet",
                    status: "Succeeded",
                    time: "Yesterday · 09:20 AM",
                    project: "my-portfolio",
                    progress: "Completed & deployed",
                  },
                ].map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "1.2rem 1.4rem",
                      borderRadius: "10px",
                      background: "#0D1218",
                      border: "1px solid #1D2732",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5F7FA" }}>{t.request}</div>
                        <div style={{ fontSize: "0.76rem", color: "#66717F", marginTop: "2px" }}>
                          Project: <span style={{ color: "#42D9FF" }}>{t.project}</span> · {t.time}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          padding: "0.22rem 0.6rem",
                          borderRadius: "4px",
                          background: t.status === "Succeeded" ? "rgba(69, 212, 131, 0.12)" : t.status === "Preview Ready" ? "rgba(124, 108, 255, 0.15)" : "rgba(66, 217, 255, 0.12)",
                          color: t.status === "Succeeded" ? "#45D483" : t.status === "Preview Ready" ? "#A78BFA" : "#42D9FF",
                          fontWeight: 700,
                        }}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                      <span style={{ fontSize: "0.76rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                        Progress: {t.progress}
                      </span>
                      {t.status === "Preview Ready" && (
                        <button
                          onClick={() => setActiveTab("previews")}
                          style={{
                            padding: "0.35rem 0.85rem",
                            borderRadius: "6px",
                            background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                            border: "none",
                            color: "#ffffff",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Review Preview &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 25: WORKSPACES */}
          {activeTab === "workspaces" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Isolated Synthesis Environment
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    AI WORKSPACES
                  </h2>
                </div>

                <button
                  onClick={() => setWorkspaceAdvanced(!workspaceAdvanced)}
                  style={{
                    padding: "0.45rem 0.95rem",
                    borderRadius: "6px",
                    background: workspaceAdvanced ? "rgba(124, 108, 255, 0.15)" : "#0D1218",
                    border: `1px solid ${workspaceAdvanced ? "#7C6CFF" : "#1D2732"}`,
                    color: workspaceAdvanced ? "#A78BFA" : "#A5AFBC",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {workspaceAdvanced ? "Hide Technical Details" : "Expand Advanced Details"}
                </button>
              </div>

              {/* Section 25 User-Friendly Summary Card */}
              <div style={{ padding: "1.75rem", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase" }}>AI Workspace</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F5F7FA", marginTop: "2px" }}>Homepage redesign</div>
                  </div>
                  <span style={{ padding: "0.22rem 0.65rem", borderRadius: "9999px", background: "rgba(66, 217, 255, 0.12)", color: "#42D9FF", border: "1px solid rgba(66, 217, 255, 0.3)", fontSize: "0.74rem", fontWeight: 700 }}>
                    ● Working
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem" }}>
                  <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Project</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#F5F7FA", marginTop: "2px" }}>My Portfolio</div>
                  </div>
                  <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Files</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#42D9FF", marginTop: "2px" }}>6 changed</div>
                  </div>
                  <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Tests</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#45D483", marginTop: "2px" }}>Running</div>
                  </div>
                </div>

                {/* Advanced Expandable Details (Section 25) */}
                {workspaceAdvanced && (
                  <div style={{ padding: "1.25rem", borderRadius: "8px", background: "#080C11", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.75rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.8rem", color: "#A5AFBC" }}>
                    <div style={{ color: "#7C6CFF", fontWeight: 700 }}>Workspace Execution Container</div>
                    <div>Container ID: <span style={{ color: "#F5F7FA" }}>ws-ephem-myportfolio-01</span></div>
                    <div>Port Mapping: <span style={{ color: "#42D9FF" }}>127.0.0.1:3100 -&gt; 3000</span></div>
                    <div>File System Isolation: <span style={{ color: "#45D483" }}>OverlayFS (Ephemeral)</span></div>
                    <div>Stdout Stream: <span style={{ color: "#A5AFBC" }}>[info] compiled app/page.tsx in 142ms</span></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. PREVIEWS (DEDICATED FULL-SCREEN PREVIEW STUDIO) */}
          {activeTab === "previews" && (
            <div style={{ height: "calc(100vh - 120px)", minHeight: "680px", display: "flex", flexDirection: "column", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px", overflow: "hidden" }}>
              <PreviewStudioFrame
                activeLiveUrl={activeLiveUrl}
                activePreviewUrl={activePreviewUrl}
                comparisonMode={comparisonMode}
                setComparisonMode={setComparisonMode}
                isShowingAfter={isShowingAfter}
                setIsShowingAfter={setIsShowingAfter}
                sliderPos={sliderPos}
                setSliderPos={setSliderPos}
                sliderRef={sliderRef}
                isDraggingRef={isDraggingRef}
                viewport={viewport}
                setViewport={setViewport}
                onApprove={() => setShowApprovalModal(true)}
                onReject={() => {
                  setPreviewState("none");
                  setPromptText("");
                }}
              />
            </div>
          )}

          {/* Section 18: FULL HISTORY */}
          {activeTab === "changes" && (
            <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Audit &amp; Revision Log
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    CHANGE HISTORY
                  </h2>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  Total Changes: <span style={{ color: "#42D9FF", fontWeight: 700 }}>{changeHistory.length}</span>
                </div>
              </div>

              {/* Table Column Headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 2fr) 90px 110px 90px 120px 90px 40px",
                  padding: "0.75rem 1.25rem",
                  background: "#080C11",
                  border: "1px solid #1D2732",
                  borderRadius: "8px 8px 0 0",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontWeight: 700,
                  color: "#66717F",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  alignItems: "center",
                }}
              >
                <div>Change</div>
                <div>Status</div>
                <div>Date</div>
                <div>Files</div>
                <div>Preview</div>
                <div>Deployment</div>
                <div style={{ textAlign: "right" }}>Info</div>
              </div>

              {/* Table Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "#1D2732", border: "1px solid #1D2732", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {changeHistory.map((item) => {
                  const isExpanded = expandedHistoryId === item.id;
                  return (
                    <div key={item.id} style={{ background: "#0D1218" }}>
                      <div
                        onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(220px, 2fr) 90px 110px 90px 120px 90px 40px",
                          padding: "1rem 1.25rem",
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#121922";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#F5F7FA" }}>{item.title}</div>
                          <div style={{ fontSize: "0.74rem", color: "#A5AFBC", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.request}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "4px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", fontWeight: 600 }}>
                            ✓ Live
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#A5AFBC" }}>{item.dateGroup}</div>
                        <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#42D9FF" }}>
                          {item.filesCount} files
                        </div>
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab("previews");
                            }}
                            style={{
                              padding: "0.3rem 0.65rem",
                              borderRadius: "6px",
                              background: "rgba(124, 108, 255, 0.12)",
                              border: "1px solid rgba(124, 108, 255, 0.3)",
                              color: "#A78BFA",
                              fontSize: "0.74rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            View Preview
                          </button>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#45D483", fontWeight: 600 }}>
                          Live
                        </div>
                        <div style={{ textAlign: "right", color: "#66717F", fontSize: "0.85rem" }}>
                          {isExpanded ? "▲" : "▼"}
                        </div>
                      </div>

                      {/* Expanded Advanced Details (Section 18) */}
                      {isExpanded && (
                        <div style={{ padding: "1.25rem 1.5rem", background: "#080C11", borderTop: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1rem" }}>
                          <div style={{ fontSize: "0.76rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase" }}>
                            Advanced Modification Details
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                              <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Commit</div>
                              <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#42D9FF", marginTop: "2px" }}>
                                {item.commit}
                              </div>
                            </div>
                            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                              <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Branch</div>
                              <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#A78BFA", marginTop: "2px" }}>
                                {item.branch}
                              </div>
                            </div>
                            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                              <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Operator Approval</div>
                              <div style={{ fontSize: "0.85rem", color: "#45D483", fontWeight: 600, marginTop: "2px" }}>
                                ✓ Approved &amp; Signed
                              </div>
                            </div>
                            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                              <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Deployment Target</div>
                              <div style={{ fontSize: "0.85rem", color: "#F5F7FA", marginTop: "2px" }}>
                                Edge CDN (Global 200 OK)
                              </div>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                              AI Request Prompt
                            </div>
                            <div style={{ padding: "0.65rem 0.85rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", fontSize: "0.82rem", color: "#F5F7FA" }}>
                              &ldquo;{item.request}&rdquo;
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                              Files Changed ({item.filesCount})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.78rem", color: "#A5AFBC" }}>
                              <div style={{ padding: "0.3rem 0.6rem", background: "#121922", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                                <span>app/page.tsx</span>
                                <span style={{ color: "#45D483" }}>+48 -12</span>
                              </div>
                              <div style={{ padding: "0.3rem 0.6rem", background: "#121922", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                                <span>components/Hero.tsx</span>
                                <span style={{ color: "#45D483" }}>+112 -34</span>
                              </div>
                              <div style={{ padding: "0.3rem 0.6rem", background: "#121922", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                                <span>styles/globals.css</span>
                                <span style={{ color: "#42D9FF" }}>+22 -4</span>
                              </div>
                              <div style={{ padding: "0.3rem 0.6rem", background: "#121922", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                                <span>tailwind.config.ts</span>
                                <span style={{ color: "#E8B85C" }}>+8 -2</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 30: DEPLOYMENTS */}
          {activeTab === "deployments" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Production Delivery
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    DEPLOYMENT
                  </h2>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#45D483", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#45D483", boxShadow: "0 0 8px #45D483" }} />
                  <span>Edge Fleet Active</span>
                </div>
              </div>

              {/* Deployment Lifecycle Timeline Card */}
              <div style={{ padding: "1.75rem", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid #1D2732" }}>
                  <div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA" }}>Latest Production Run: dep-8931</div>
                    <div style={{ fontSize: "0.76rem", color: "#A5AFBC", marginTop: "2px" }}>Triggered via user approval · Branch <span style={{ color: "#A78BFA" }}>main</span></div>
                  </div>
                  <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.12)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontSize: "0.75rem", fontWeight: 700 }}>
                    ● 200 OK (LIVE)
                  </span>
                </div>

                {/* Section 30: Step-by-Step Lifecycle Pipeline */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {[
                    { step: "Changes approved", status: "Verified by operator", done: true },
                    { step: "Build", status: "Next.js 15 bundle compiled in 14.2s", done: true },
                    { step: "Tests", status: "12 unit and integration tests passing", done: true },
                    { step: "CI", status: "Linting, types, and security verified", done: true },
                    { step: "Deploy", status: "Synchronized to edge CDN worldwide", done: true },
                    { step: "Health Check", status: "Global latency 42ms · HTTP 200", done: true },
                  ].map((s, idx) => (
                    <div key={s.step} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#45D483", color: "#05070A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800 }}>
                          ✓
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#F5F7FA" }}>{s.step}</span>
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "#A5AFBC" }}>Live URL: <a href={activeLiveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#42D9FF", textDecoration: "none" }}>{activeLiveUrl} ↗</a></span>
                  <button onClick={() => setActiveTab("overview")} style={{ padding: "0.45rem 1rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.8rem", cursor: "pointer" }}>
                    Return to Overview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 32: MONITORING */}
          {activeTab === "monitoring" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#45D483", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Production Observability
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    WEBSITE HEALTH
                  </h2>
                </div>

                {/* Advanced View Toggle */}
                <button
                  onClick={() => setMonitoringAdvanced(!monitoringAdvanced)}
                  style={{
                    padding: "0.45rem 0.95rem",
                    borderRadius: "6px",
                    background: monitoringAdvanced ? "rgba(124, 108, 255, 0.15)" : "#0D1218",
                    border: `1px solid ${monitoringAdvanced ? "#7C6CFF" : "#1D2732"}`,
                    color: monitoringAdvanced ? "#A78BFA" : "#A5AFBC",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <IconCpu size={14} />
                  <span>{monitoringAdvanced ? "Hide Advanced Metrics" : "Show Advanced Metrics"}</span>
                </button>
              </div>

              {/* User-First Health Status Grid (Section 32) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732" }}>
                  <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>Status</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#45D483", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#45D483" }} />
                    <span>Online</span>
                  </div>
                </div>

                <div style={{ padding: "1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732" }}>
                  <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>Response</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#42D9FF", marginTop: "0.35rem" }}>
                    Fast (42ms)
                  </div>
                </div>

                <div style={{ padding: "1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732" }}>
                  <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>Errors</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#F5F7FA", marginTop: "0.35rem" }}>
                    0
                  </div>
                </div>

                <div style={{ padding: "1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732" }}>
                  <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>Last Deployment</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#A78BFA", marginTop: "0.35rem" }}>
                    2 minutes ago
                  </div>
                </div>
              </div>

              {/* Advanced Developer Infrastructure View (Section 32) */}
              {monitoringAdvanced && (
                <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ fontSize: "0.76rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase" }}>
                    Infrastructure Telemetry &amp; System Metrics
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
                    <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Latency (p95)</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#42D9FF", marginTop: "2px" }}>58ms</div>
                    </div>
                    <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>HTTP Errors</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#45D483", marginTop: "2px" }}>0.00%</div>
                    </div>
                    <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>CPU Usage</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA", marginTop: "2px" }}>12.4%</div>
                    </div>
                    <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>RAM Utilization</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA", marginTop: "2px" }}>340 MB / 2 GB</div>
                    </div>
                    <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Disk Read/Write</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA", marginTop: "2px" }}>1.2 MB/s</div>
                    </div>
                    <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Containers</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#45D483", marginTop: "2px" }}>3 Healthy</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 11. INCIDENTS */}
          {activeTab === "incidents" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", padding: "4rem 1rem" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <IconCheck size={28} color="#45D483" />
              </div>
              <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.6rem", fontWeight: 700, color: "#F5F7FA", marginBottom: "0.5rem" }}>
                Everything looks healthy.
              </h2>
              <p style={{ color: "#A5AFBC", fontSize: "0.92rem", maxWidth: "420px", margin: "0 auto" }}>
                Zero active incidents detected across all connected repositories and websites.
              </p>
            </div>
          )}

          {/* Section 34: SECURITY */}
          {activeTab === "security" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Protection &amp; Zero-Trust
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    SECURITY
                  </h2>
                </div>

                <button
                  onClick={() => setSecurityAdvanced(!securityAdvanced)}
                  style={{
                    padding: "0.45rem 0.95rem",
                    borderRadius: "6px",
                    background: securityAdvanced ? "rgba(124, 108, 255, 0.15)" : "#0D1218",
                    border: `1px solid ${securityAdvanced ? "#7C6CFF" : "#1D2732"}`,
                    color: securityAdvanced ? "#A78BFA" : "#A5AFBC",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {securityAdvanced ? "Hide Advanced Logs" : "Show Advanced Details"}
                </button>
              </div>

              {/* Status Box */}
              <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>Security Posture</div>
                  <span style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontSize: "0.75rem", fontWeight: 700 }}>
                    ● Project secure
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div style={{ padding: "0.95rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.72rem", color: "#66717F" }}>Repository</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#45D483", marginTop: "4px" }}>✓ Connected</div>
                  </div>
                  <div style={{ padding: "0.95rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.72rem", color: "#66717F" }}>Deployment</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#45D483", marginTop: "4px" }}>✓ Verified</div>
                  </div>
                  <div style={{ padding: "0.95rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.72rem", color: "#66717F" }}>Environment</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#45D483", marginTop: "4px" }}>✓ Configured</div>
                  </div>
                </div>
              </div>

              {/* Advanced Security Details */}
              {securityAdvanced && (
                <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.85rem", color: "#A5AFBC" }}>
                  <div style={{ fontSize: "0.76rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase" }}>
                    Access, Events &amp; Compliance Verification
                  </div>
                  <div>✓ Security Events: 0 unauthorized access attempts in last 30 days</div>
                  <div>✓ Access Privileges: Authenticated token scoped strictly to current repository</div>
                  <div>✓ Permissions: Ephemeral build sandbox runs with unprivileged user UID 1001</div>
                  <div>✓ Deployment Checks: Automated secret scanner passed · Zero API keys in client bundles</div>
                </div>
              )}
            </div>
          )}

          {/* Section 35: AUDIT */}
          {activeTab === "audit" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Verifiable Activity Trail
                </div>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                  AUDIT PIPELINE
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#A5AFBC", marginTop: "0.25rem" }}>
                  Cryptographically verifiable execution chain from initial user prompt to production health check.
                </p>
              </div>

              {/* Section 35: Complete 10-Step Pipeline */}
              <div style={{ padding: "1.5rem", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { step: "USER REQUEST", desc: "Make my homepage modern and optimize responsive layout", status: "Received" },
                  { step: "AI PLAN", desc: "Generated 4 component patches without touching backend or APIs", status: "Verified" },
                  { step: "APPROVAL", desc: "Design plan reviewed by operator", status: "Approved" },
                  { step: "WORKSPACE", desc: "Ephemeral Docker container initialized on isolated bridge network", status: "Active" },
                  { step: "FILES MODIFIED", desc: "4 files updated in working tree (app/page.tsx, components/Hero.tsx)", status: "Committed" },
                  { step: "TESTS", desc: "Next.js TypeScript check and unit suites passed (12/12)", status: "Passed" },
                  { step: "PREVIEW", desc: "Interactive sandboxed browser preview rendered on isolated port", status: "Ready" },
                  { step: "USER APPROVAL", desc: "Operator explicitly confirmed changes via Approve & Update", status: "Granted" },
                  { step: "DEPLOYMENT", desc: "Synchronized with edge CDN servers worldwide", status: "Succeeded" },
                  { step: "HEALTH CHECK", desc: "Automated probe: 200 OK · 42ms response latency verified", status: "Healthy" },
                ].map((item, idx, arr) => (
                  <div key={item.step} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700 }}>
                          ✓
                        </span>
                        <div>
                          <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#F5F7FA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            {item.step}
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "#A5AFBC", marginTop: "1px" }}>{item.desc}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.74rem", padding: "0.2rem 0.55rem", borderRadius: "4px", background: "rgba(124, 108, 255, 0.12)", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontWeight: 600 }}>
                        {item.status}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div style={{ width: "2px", height: "12px", background: "#7C6CFF", margin: "0 auto", opacity: 0.6 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 36: CONNECTIONS */}
          {activeTab === "connections" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Platform Integrations
                </div>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                  CONNECTIONS
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#A5AFBC", marginTop: "0.25rem" }}>
                  Active infrastructure credentials and synced integrations.
                </p>
              </div>

              {/* Section 36: Clean Integration Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <IconGithub size={20} color="#F5F7FA" />
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#F5F7FA" }}>GitHub</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontWeight: 600 }}>
                      ● Connected
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#A5AFBC" }}>Target repo: <span style={{ color: "#42D9FF" }}>my-portfolio</span> (branch: main)</div>
                </div>

                <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <IconRocket size={20} color="#7C6CFF" />
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#F5F7FA" }}>Deployment</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontWeight: 600 }}>
                      ● Connected
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#A5AFBC" }}>Global Edge CDN distribution pipeline</div>
                </div>

                <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <IconActivity size={20} color="#42D9FF" />
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#F5F7FA" }}>Monitoring</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontWeight: 600 }}>
                      ● Connected
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#A5AFBC" }}>Real-time health probes and HTTP error alerting</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 37: SETTINGS */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "880px", margin: "0 auto" }}>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Preferences &amp; Configuration
                </div>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                  SETTINGS
                </h2>
              </div>

              {/* Section 37: Categories Bar */}
              <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #1D2732", paddingBottom: "0.75rem", marginBottom: "1.75rem", overflowX: "auto" }}>
                {[
                  { id: "account", label: "Account" },
                  { id: "project", label: "Project" },
                  { id: "ai", label: "AI Preferences" },
                  { id: "notifications", label: "Notifications" },
                  { id: "connections", label: "Connections" },
                  { id: "security", label: "Security" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSettingsCategory(cat.id as any)}
                    style={{
                      padding: "0.45rem 0.95rem",
                      borderRadius: "6px",
                      background: settingsCategory === cat.id ? "#121922" : "transparent",
                      border: `1px solid ${settingsCategory === cat.id ? "#7C6CFF" : "transparent"}`,
                      color: settingsCategory === cat.id ? "#F5F7FA" : "#A5AFBC",
                      fontSize: "0.82rem",
                      fontWeight: settingsCategory === cat.id ? 600 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div style={{ background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px", padding: "1.8rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {settingsCategory === "account" && (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "#A5AFBC", marginBottom: "0.4rem" }}>Authenticated Email</label>
                      <input type="text" disabled value={userEmail} style={{ width: "100%", padding: "0.7rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.88rem" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "#A5AFBC", marginBottom: "0.4rem" }}>Organization Name</label>
                      <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ width: "100%", padding: "0.7rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.88rem" }} />
                    </div>
                  </>
                )}

                {settingsCategory === "project" && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "#A5AFBC", marginBottom: "0.4rem" }}>Active Website Domain</label>
                    <input type="text" value={customLiveUrl} onChange={(e) => setCustomLiveUrl(e.target.value)} style={{ width: "100%", padding: "0.7rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.88rem" }} />
                  </div>
                )}

                {settingsCategory === "ai" && (
                  <div style={{ fontSize: "0.85rem", color: "#A5AFBC", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 600, color: "#F5F7FA" }}>AI Synthesis Engine</div>
                    <div>Mode: Autonomous developer assistant with visual verification</div>
                    <div>Safety filter: Strict (Preserves all backend APIs, database schemas, and routes)</div>
                  </div>
                )}

                {settingsCategory === "notifications" && (
                  <div style={{ fontSize: "0.85rem", color: "#A5AFBC" }}>
                    Production deployment alerts are sent to: <span style={{ color: "#42D9FF" }}>{userEmail}</span>
                  </div>
                )}

                {settingsCategory === "connections" && (
                  <div style={{ fontSize: "0.85rem", color: "#A5AFBC" }}>
                    GitHub token and deployment hooks are currently synchronized.
                  </div>
                )}

                {settingsCategory === "security" && (
                  <div style={{ fontSize: "0.85rem", color: "#A5AFBC" }}>
                    Two-Factor Authentication and Row Level Security active via Supabase.
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid #1D2732" }}>
                  <span style={{ fontSize: "0.8rem", color: "#45D483" }}>● Supabase RLS Session Active</span>
                  <button onClick={handleSignOut} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", border: "1px solid rgba(240, 106, 106, 0.4)", color: "#F06A6A", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: APPROVAL & DEPLOYMENT                                             */}
      {/* ========================================================================= */}
      {showApprovalModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5, 7, 10, 0.88)", backdropFilter: "blur(14px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ width: "100%", maxWidth: "500px", background: "#0D1218", border: "1px solid #2A3542", borderRadius: "16px", padding: "2rem", boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <IconSparkles size={22} color="#7C6CFF" />
              <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FA" }}>
                Ready to update your website?
              </h3>
            </div>
            <p style={{ fontSize: "0.86rem", color: "#A5AFBC", lineHeight: 1.5 }}>
              Your live website at <span style={{ color: "#42D9FF" }}>{activeLiveUrl}</span> will be updated with the changes you have reviewed in the preview.
            </p>
            <div style={{ padding: "1rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem", color: "#F5F7FA" }}>
              <div>✓ 4 files will be updated on branch <span style={{ color: "#A78BFA" }}>main</span></div>
              <div>✓ Automated build and regression tests will execute</div>
              <div>✓ Instant edge deployment with zero downtime</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button onClick={() => setShowApprovalModal(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", background: "transparent", border: "1px solid #1D2732", color: "#A5AFBC", fontSize: "0.85rem", cursor: "pointer" }}>
                Go Back
              </button>
              <button onClick={handleApproveDeployment} style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)", border: "none", color: "#05070A", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
                Approve &amp; Update
              </button>
            </div>
          </div>
        </div>
      )}

      {(previewState === "deploying" || previewState === "deployed") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5, 7, 10, 0.92)", backdropFilter: "blur(16px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ width: "100%", maxWidth: "520px", background: "#0D1218", border: "1px solid #2A3542", borderRadius: "16px", padding: "2.2rem", boxShadow: "0 25px 50px rgba(0, 0, 0, 0.9)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {previewState === "deploying" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FA" }}>
                  UPDATING YOUR WEBSITE...
                </h3>
                <div style={{ padding: "1.25rem", borderRadius: "10px", background: "#121922", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.6rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.8rem" }}>
                  <div style={{ color: deploymentStep >= 1 ? "#45D483" : "#66717F" }}>{deploymentStep >= 1 ? "✓" : "●"} Changes approved</div>
                  <div style={{ color: deploymentStep >= 2 ? "#45D483" : "#66717F" }}>{deploymentStep >= 2 ? "✓" : "○"} Build completed</div>
                  <div style={{ color: deploymentStep >= 3 ? "#45D483" : "#66717F" }}>{deploymentStep >= 3 ? "✓" : "○"} Deployment completed</div>
                  <div style={{ color: deploymentStep >= 4 ? "#45D483" : "#66717F" }}>{deploymentStep >= 4 ? "✓" : "○"} Website verified</div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center", alignItems: "center" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconCheck size={28} color="#45D483" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.7rem", fontWeight: 800, color: "#F5F7FA", marginBottom: "0.4rem" }}>
                    Your website is live.
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "#A5AFBC" }}>All approved changes have been synchronized to your live website.</p>
                </div>
                <div style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.85rem" }}>
                  <span style={{ color: "#45D483" }}>{activeLiveUrl}</span>
                  <a href={activeLiveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#42D9FF", textDecoration: "none", fontSize: "0.82rem" }}>Open Website ↗</a>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                  <a href={activeLiveUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)", color: "#05070A", fontSize: "0.88rem", fontWeight: 700, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Open Website ↗
                  </a>
                  <button onClick={() => { setPreviewState("none"); setPromptText(""); setActiveTab("overview"); }} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
                    Continue Editing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect Repository Modal */}
      <ConnectRepositoryModal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        onConnected={(repo) => {
          setSelectedWebsite(repo.full_name || repo.name);
          setShowRepoModal(false);
        }}
      />

      {/* Connect Server Modal */}
      <ConnectServerModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
        onConnected={(srv) => {
          setServers((prev) => [srv, ...prev]);
          setShowServerModal(false);
        }}
      />
    </div>
  );
}

// =========================================================================
// HELPER COMPONENTS (PREVIEW STUDIO FRAME & NAVIGATION)
// =========================================================================

function SidebarNavGroup({
  title,
  collapsed,
  items,
  activeTab,
  onSelect,
}: {
  title: string;
  collapsed: boolean;
  items: { id: NavSection; label: string; icon: React.ReactNode; badge?: string }[];
  activeTab: NavSection;
  onSelect: (id: NavSection) => void;
}) {
  return (
    <div style={{ marginBottom: "0.6rem" }}>
      {!collapsed && (
        <div style={{ fontSize: "0.62rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", fontWeight: 700, padding: "0.2rem 0.65rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: "0.65rem",
                width: "100%",
                padding: "0.5rem 0.65rem",
                borderRadius: "7px",
                border: "none",
                background: isActive ? "#121922" : "transparent",
                color: isActive ? "#F5F7FA" : "#A5AFBC",
                borderLeft: !collapsed && isActive ? "3px solid #7C6CFF" : "3px solid transparent",
                fontSize: "0.82rem",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ color: isActive ? "#7C6CFF" : "#66717F", display: "flex", alignItems: "center" }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: "#121922", color: "#66717F" }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewStudioFrame({
  activeLiveUrl,
  activePreviewUrl,
  comparisonMode,
  setComparisonMode,
  isShowingAfter,
  setIsShowingAfter,
  sliderPos,
  setSliderPos,
  sliderRef,
  isDraggingRef,
  viewport,
  setViewport,
  onApprove,
  onReject,
}: {
  activeLiveUrl: string;
  activePreviewUrl: string;
  comparisonMode: "toggle" | "slider" | "side-by-side";
  setComparisonMode: (mode: "toggle" | "slider" | "side-by-side") => void;
  isShowingAfter: boolean;
  setIsShowingAfter: (after: boolean) => void;
  sliderPos: number;
  setSliderPos: (pos: number) => void;
  sliderRef: React.RefObject<HTMLDivElement | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  viewport: "desktop" | "tablet" | "mobile";
  setViewport: (vp: "desktop" | "tablet" | "mobile") => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <div style={{ padding: "0.65rem 1rem", background: "#080C11", borderBottom: "1px solid #1D2732", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F06A6A" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E8B85C" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#45D483" }} />
        </div>

        <div style={{ flex: 1, maxWidth: "540px", display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.32rem 0.85rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.74rem" }}>
          <IconLock size={12} color="#45D483" />
          <span style={{ padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(124, 108, 255, 0.2)", color: "#A78BFA", fontSize: "0.65rem", fontWeight: 700 }}>
            PREVIEW
          </span>
          <span style={{ color: "#45D483", fontSize: "0.7rem", fontWeight: 600 }}>
            ● Changes ready
          </span>
          <span style={{ color: "#66717F" }}>|</span>
          <span style={{ color: "#A5AFBC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activePreviewUrl}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <button onClick={() => setViewport("desktop")} style={{ background: viewport === "desktop" ? "#121922" : "transparent", border: `1px solid ${viewport === "desktop" ? "#7C6CFF" : "transparent"}`, color: viewport === "desktop" ? "#F5F7FA" : "#66717F", borderRadius: "5px", padding: "0.25rem 0.5rem", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <IconMonitor size={13} />
            <span>Desktop</span>
          </button>
          <button onClick={() => setViewport("tablet")} style={{ background: viewport === "tablet" ? "#121922" : "transparent", border: `1px solid ${viewport === "tablet" ? "#7C6CFF" : "transparent"}`, color: viewport === "tablet" ? "#F5F7FA" : "#66717F", borderRadius: "5px", padding: "0.25rem 0.5rem", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <IconTablet size={13} />
            <span>Tablet</span>
          </button>
          <button onClick={() => setViewport("mobile")} style={{ background: viewport === "mobile" ? "#121922" : "transparent", border: `1px solid ${viewport === "mobile" ? "#7C6CFF" : "transparent"}`, color: viewport === "mobile" ? "#F5F7FA" : "#66717F", borderRadius: "5px", padding: "0.25rem 0.5rem", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <IconSmartphone size={13} />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "0.55rem 1rem", background: "#121922", borderBottom: "1px solid #1D2732", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase" }}>Comparison:</span>
          <div style={{ display: "flex", background: "#080C11", border: "1px solid #1D2732", borderRadius: "6px", padding: "2px" }}>
            <button onClick={() => { setComparisonMode("toggle"); setIsShowingAfter(false); }} style={{ padding: "0.25rem 0.75rem", borderRadius: "4px", border: "none", background: comparisonMode === "toggle" && !isShowingAfter ? "#121922" : "transparent", color: comparisonMode === "toggle" && !isShowingAfter ? "#E8B85C" : "#66717F", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
              Before
            </button>
            <button onClick={() => { setComparisonMode("toggle"); setIsShowingAfter(true); }} style={{ padding: "0.25rem 0.75rem", borderRadius: "4px", border: "none", background: comparisonMode === "toggle" && isShowingAfter ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : "transparent", color: comparisonMode === "toggle" && isShowingAfter ? "#ffffff" : "#66717F", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
              After (AI)
            </button>
          </div>
          <button onClick={() => setComparisonMode(comparisonMode === "slider" ? "toggle" : "slider")} style={{ padding: "0.25rem 0.65rem", borderRadius: "6px", background: comparisonMode === "slider" ? "rgba(124, 108, 255, 0.15)" : "transparent", border: `1px solid ${comparisonMode === "slider" ? "#7C6CFF" : "#1D2732"}`, color: comparisonMode === "slider" ? "#A78BFA" : "#A5AFBC", fontSize: "0.74rem", cursor: "pointer" }}>
            {comparisonMode === "slider" ? "Disable Split Slider" : "Interactive Split Slider"}
          </button>
        </div>

        <div style={{ fontSize: "0.74rem", color: "#A5AFBC", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ color: "#E8B85C" }}>●</span>
          <span style={{ color: "#F5F7FA", fontWeight: 500 }}>Your live website has not been changed yet.</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#05070A", display: "flex", justifyContent: "center", padding: viewport === "desktop" ? "0" : "1.5rem" }}>
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
            border: viewport !== "desktop" ? "1px solid #1D2732" : "none",
            borderRadius: viewport !== "desktop" ? "12px" : "0",
            overflow: "hidden",
          }}
        >
          {comparisonMode === "slider" ? (
            <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "580px" }}>
              <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                <LegacyWebsiteSimulation />
              </div>
              <div style={{ position: "absolute", inset: 0, width: `${sliderPos}%`, overflow: "hidden", borderRight: "2px solid #7C6CFF", boxShadow: "2px 0 15px rgba(124, 108, 255, 0.5)" }}>
                <div style={{ width: sliderRef.current?.clientWidth || "100%", minHeight: "580px" }}>
                  <ModernizedWebsiteSimulation />
                </div>
              </div>
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
            <div>{isShowingAfter ? <ModernizedWebsiteSimulation /> : <LegacyWebsiteSimulation />}</div>
          )}
        </div>
      </div>

      {/* Section 28 & 29: CHANGE DETAILS & CLEAR APPROVAL */}
      <div style={{ padding: "0.95rem 1.25rem", background: "#080C11", borderTop: "1px solid #1D2732", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            WHAT RYVIX CHANGED
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginTop: "0.25rem", fontSize: "0.78rem", color: "#F5F7FA" }}>
            <span style={{ color: "#45D483" }}>✓ Hero section</span>
            <span style={{ color: "#45D483" }}>✓ Typography</span>
            <span style={{ color: "#45D483" }}>✓ Navigation</span>
            <span style={{ color: "#45D483" }}>✓ Responsive layout</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#A5AFBC", marginTop: "0.2rem" }}>
            <span style={{ color: "#42D9FF", fontWeight: 600 }}>6 files changed</span> · <span>12 improvements</span> · <span style={{ color: "#66717F" }}>Your live website has not been changed.</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button onClick={onReject} style={{ padding: "0.6rem 1rem", borderRadius: "8px", background: "transparent", border: "1px solid #1D2732", color: "#A5AFBC", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer" }}>
            Reject Changes
          </button>
          <button onClick={onApprove} style={{ padding: "0.6rem 1.35rem", borderRadius: "8px", background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)", border: "none", color: "#05070A", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 18px rgba(69, 212, 131, 0.4)" }}>
            Approve &amp; Update Website &rarr;
          </button>
        </div>
      </div>
    </>
  );
}

function LegacyWebsiteSimulation() {
  return (
    <div style={{ padding: "3rem 2.5rem", background: "#0b0f15", color: "#94a3b8", minHeight: "600px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a2332", paddingBottom: "1rem", marginBottom: "3.5rem" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#cbd5e1" }}>My Portfolio (Old)</div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
          <span>Home</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      </div>
      <div style={{ textAlign: "center", maxWidth: "550px", margin: "0 auto 4rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "1rem" }}>Welcome to my portfolio</h2>
        <p style={{ fontSize: "0.95rem", color: "#64748b", lineHeight: 1.6, marginBottom: "1.5rem" }}>I build web applications and digital tools. Check out my work below.</p>
        <button style={{ padding: "0.6rem 1.2rem", background: "#263548", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "0.85rem" }}>View Work</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ padding: "1.5rem", background: "#111822", border: "1px solid #1a2332", borderRadius: "4px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "0.5rem" }}>Project One</div>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Basic web application built with React.</div>
        </div>
        <div style={{ padding: "1.5rem", background: "#111822", border: "1px solid #1a2332", borderRadius: "4px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "0.5rem" }}>Project Two</div>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Simple database integration and dashboard.</div>
        </div>
      </div>
    </div>
  );
}

function ModernizedWebsiteSimulation() {
  return (
    <div style={{ padding: "3.5rem 3rem", background: "radial-gradient(ellipse at top, #0f1624 0%, #05070A 100%)", color: "#F5F7FA", minHeight: "600px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
            <IconSparkles size={14} color="#ffffff" />
          </div>
          <span style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>
            NOVA STUDIO
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.85rem", color: "#A5AFBC" }}>
          <span style={{ color: "#F5F7FA", fontWeight: 500 }}>Projects</span>
          <span>Services</span>
          <span>About</span>
          <button style={{ padding: "0.4rem 0.95rem", borderRadius: "9999px", background: "rgba(124, 108, 255, 0.15)", border: "1px solid rgba(124, 108, 255, 0.4)", color: "#A78BFA", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
            Get In Touch &rarr;
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", maxWidth: "620px", margin: "0 auto 4.5rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem", borderRadius: "9999px", background: "rgba(66, 217, 255, 0.1)", border: "1px solid rgba(66, 217, 255, 0.3)", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.72rem", color: "#42D9FF", marginBottom: "1.2rem" }}>
          <IconSparkles size={12} color="#42D9FF" />
          <span>MODERNIZED BY RYVIX AI</span>
        </div>

        <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "1.2rem", background: "linear-gradient(135deg, #ffffff 30%, #A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Building high-impact digital experiences.
        </h2>

        <p style={{ fontSize: "1.05rem", color: "#A5AFBC", lineHeight: 1.6, marginBottom: "2rem" }}>
          Next-generation interface design and engineering for forward-thinking engineering startups and product teams.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.85rem" }}>
          <button style={{ padding: "0.75rem 1.6rem", borderRadius: "10px", background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)", border: "none", color: "#ffffff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 0 25px rgba(124, 108, 255, 0.4)" }}>
            Explore Projects &rarr;
          </button>
          <button style={{ padding: "0.75rem 1.4rem", borderRadius: "10px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>
            Book Consultation
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ padding: "1.8rem", background: "rgba(18, 25, 34, 0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(124, 108, 255, 0.25)", borderRadius: "14px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>Interactive Design Systems</div>
          <div style={{ fontSize: "0.85rem", color: "#A5AFBC", lineHeight: 1.5 }}>Component architecture built with rigorous design tokens and micro-interactions.</div>
        </div>
        <div style={{ padding: "1.8rem", background: "rgba(18, 25, 34, 0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(66, 217, 255, 0.25)", borderRadius: "14px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>High-Performance Web Apps</div>
          <div style={{ fontSize: "0.85rem", color: "#A5AFBC", lineHeight: 1.5 }}>Sub-millisecond render times, responsive layouts, and edge deployment optimized for global traffic.</div>
        </div>
      </div>
    </div>
  );
}
