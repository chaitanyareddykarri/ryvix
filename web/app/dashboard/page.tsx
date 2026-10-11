"use client";
import TaskCheckTimeline from '@/components/TaskCheckTimeline';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import MovingBlocks3D from "@/components/MovingBlocks3D";
import ConnectRepositoryModal from "@/components/ConnectRepositoryModal";
import ConnectServerModal from "@/components/ConnectServerModal";
import ConnectionsPanel from "@/components/ConnectionsPanel";
import PhoneOnboarding from "@/components/PhoneOnboarding";
import WorkspaceNavigation from "@/components/WorkspaceNavigation";
import DeploymentOverview from "@/components/DeploymentOverview";

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

function IconGitCommit({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="1.05" y1="12" x2="7" y2="12" />
      <line x1="17.01" y1="12" x2="22.96" y2="12" />
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

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  project: string;
  repository: string;
  timestamp: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  taskId?: string;
  status: "Completed" | "In Progress" | "Awaiting Approval" | "Failed";
  deploymentStatus?: string;
  commitSha: string;
  filesCount: number;
}

export interface CodeChangeFile {
  filename: string;
  additions: number;
  deletions: number;
  oldCode?: string;
  newCode?: string;
  diff?: string;
}

export interface CodeChangeItem {
  id: string;
  taskId?: string;
  commitSha: string;
  message: string;
  author: string;
  timestamp: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  branch: string;
  repository: string;
  filesChanged: CodeChangeFile[];
  additions: number;
  deletions: number;
  previewUrl?: string;
  liveUrl?: string;
}

interface ChangeHistoryItem {
  id: string;
  time: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  title: string;
  request: string;
  aiSummary: string;
  status: "Live" | "Approved" | "Deploying" | "Review Needed" | "Pending" | "Rejected";
  filesCount: number;
  branch: string;
  commit: string;
  previewUrl: string;
  liveUrl: string;
}

// =========================================================================
// SAFE PROJECT LIVE URL EXTRACTOR (Reads existing backend/local data only)
// =========================================================================
function getProjectLiveUrl(repo: any): string | null {
  if (!repo) return null;
  const repoKey = repo.full_name || repo.name || "";

  // 1. Inspect existing repository object fields
  if (repo.live_url && typeof repo.live_url === "string" && repo.live_url.trim()) {
    return repo.live_url.trim();
  }
  if (repo.liveUrl && typeof repo.liveUrl === "string" && repo.liveUrl.trim()) {
    return repo.liveUrl.trim();
  }
  if (repo.deployed_url && typeof repo.deployed_url === "string" && repo.deployed_url.trim()) {
    return repo.deployed_url.trim();
  }
  if (repo.url && typeof repo.url === "string" && !repo.url.includes("github.com") && repo.url.trim()) {
    return repo.url.trim();
  }

  // 2. Inspect metadata if available
  if (repo.metadata?.live_url && typeof repo.metadata.live_url === "string") {
    return repo.metadata.live_url.trim();
  }
  if (repo.metadata?.url && typeof repo.metadata.url === "string" && !repo.metadata.url.includes("github.com")) {
    return repo.metadata.url.trim();
  }

  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavSection>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // User & Workspace Identity
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [websiteDomain, setWebsiteDomain] = useState<string>("");
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [activeRepo, setActiveRepo] = useState<any | null>(null);

  // Real Database Data
  const [servers, setServers] = useState<ConnectedServer[]>([]);
  const [tasks, setTasks] = useState<DatabaseTask[]>([]);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [taskSteps, setTaskSteps] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Entrance Overlay
  const [showEntrance, setShowEntrance] = useState<boolean>(true);

  // Connection & Modals
  const [githubConnected, setGithubConnected] = useState<boolean>(false);
  const [connectedRepos, setConnectedRepos] = useState<any[]>([]);
  const [showRepoModal, setShowRepoModal] = useState<boolean>(false);
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState<boolean>(false);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [customLiveUrl, setCustomLiveUrl] = useState<string | null>(null);
  const [showLiveUrlModal, setShowLiveUrlModal] = useState<boolean>(false);
  const [liveUrlInput, setLiveUrlInput] = useState<string>("");
  const [activePreviewUrlState, setActivePreviewUrlState] = useState<string>("");

  // Project Selection URL Toast Notification (Section 9, 10, 17)
  const [projectToast, setProjectToast] = useState<{
    visible: boolean;
    projectName: string;
    repoFullName: string;
    liveUrl: string | null;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Separate History & Changes Sessions
  const [historyTab, setHistoryTab] = useState<"prompts" | "changes">("prompts");
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [codeChanges, setCodeChanges] = useState<CodeChangeItem[]>([]);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  // AI Prompt & Workspace State
  const [promptText, setPromptText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Awaiting request");
  const [previewState, setPreviewState] = useState<"none" | "analyzing" | "preview_ready">("none");
  const [analyzingStep, setAnalyzingStep] = useState<number>(0);
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

  // Dynamic AI Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; thoughtTrace?: string }>>([
    {
      role: "assistant",
      content: "Ask about your connected repository or infrastructure.",

    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatStreaming, setIsChatStreaming] = useState<boolean>(false);
  const chatConversationRef = useRef<string | undefined>(undefined);
  const [chatHistoryLoading,setChatHistoryLoading]=useState(true);
  const [chatHistoryError,setChatHistoryError]=useState<string|null>(null);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{try{
      const list=await fetch("/api/chat/conversations",{cache:"no-store"});const data=await list.json();
      if(!list.ok)throw new Error(data.error || "Conversation history unavailable.");
      const id=data.conversations?.[0]?.id;
      if(id){const response=await fetch(`/api/chat/conversations?id=${encodeURIComponent(id)}`,{cache:"no-store"});const history=await response.json();
        if(!response.ok)throw new Error(history.error || "Conversation history unavailable.");
        if(!cancelled){chatConversationRef.current=id;setChatMessages(history.turns.flatMap((turn:any)=>[{role:"user" as const,content:turn.question},{role:"assistant" as const,content:turn.answer || "No saved answer available."}]));}}
    }catch(error){if(!cancelled)setChatHistoryError(error instanceof Error?error.message:"Conversation history unavailable.");}
    finally{if(!cancelled)setChatHistoryLoading(false);}})();
    return()=>{cancelled=true;};
  },[]);
  const chatAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => chatAbortRef.current?.abort(), []);

  // Dynamic Observability, Security & Telemetry State
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<any[]>([]);
  const [healthList, setHealthList] = useState<any[]>([]);
  const [securityList, setSecurityList] = useState<any[]>([]);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  // Dynamic Workspace & Sandbox State
  const [workspaceSessions, setWorkspaceSessions] = useState<any[]>([]);
  const [isLaunchingSandbox, setIsLaunchingSandbox] = useState<boolean>(false);

  // Dynamic Connections & Settings State
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);
  const [newKeyGenerated, setNewKeyGenerated] = useState<string | null>(null);

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

  // Change History Records (Section 17 & 18)
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);

  // Entrance Timer
  useEffect(() => {
    const timer = setTimeout(() => setShowEntrance(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Database & Server Data
  useEffect(() => {
    async function loadWorkspaceData() {
      setLoadingData(true);
      setDeployError(null);

      try {
        // 1. Authenticated User Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          const namePart = user.user_metadata?.full_name || user.email.split("@")[0];
          setUserName(namePart);
          setUserAvatar(user.user_metadata?.avatar_url || null);
          setOrgName(`${namePart}'s Workspace`);
          const domain = "";
          setWebsiteDomain(domain);
        }

        // Try reading extended profile if exists
        if (user?.id) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();
            if (profile?.full_name) {
              setUserName(profile.full_name);
            }
            if (profile?.avatar_url) {
              setUserAvatar(profile.avatar_url);
            }
          } catch {
            // ignore
          }
        }

        // 2. Connected Repositories (Only projects selected/created by user)
        try {
          const enrolledResp = await fetch("/api/github/repositories/connect");
          let enrolledList: any[] = [];
          if (enrolledResp.ok) {
            const enrolledData = await enrolledResp.json();
            if (Array.isArray(enrolledData.repositories)) {
              enrolledList = enrolledData.repositories;
            }
          }

          if (enrolledList.length > 0) {
            setConnectedRepos(enrolledList);
            setGithubConnected(true);

            const savedRepoName = typeof window !== "undefined" ? localStorage.getItem("ryvix_active_repo") : null;
            const match = savedRepoName
              ? enrolledList.find((r: any) => (r.full_name || r.name) === savedRepoName)
              : null;
            const selected = match || enrolledList[0];
            setActiveRepo(selected);

            const repoTitle = selected.full_name || selected.name;
            setSelectedWebsite(repoTitle);
            const savedLive = getProjectLiveUrl(selected);
            setCustomLiveUrl(savedLive);
            setLiveUrlInput(savedLive || "");

          }

          // Verify GitHub connection status without merging raw unselected repos
          const repoResp = await fetch("/api/github/repositories");
          if (repoResp.ok) {
            const repoData = await repoResp.json();
            if (repoData.connected) {
              setGithubConnected(true);
            }
          }
        } catch {
          // ignore
        }

        // 3. Servers & Fleet
        try {
          const serverResp = await fetch("/api/servers");
          if (serverResp.ok) {
            const serverData = await serverResp.json();
            if (Array.isArray(serverData.servers) && serverData.servers.length > 0) {
              setServers(serverData.servers);
            }
          }
        } catch {
          // ignore
        }

        // 4. Workspace Sessions
        try {
          const wsResp = await fetch("/api/workspace");
          if (wsResp.ok) {
            const wsData = await wsResp.json();
            if (Array.isArray(wsData.sessions)) {
              setWorkspaceSessions(wsData.sessions);
              if (wsData.sessions[0]?.preview_url) {
                setActivePreviewUrlState(wsData.sessions[0].preview_url);
              }
            }
          }
        } catch {
          // ignore
        }

        // 5. Configured Connections
        try {
          const connResp = await fetch("/api/connections");
          if (connResp.ok) {
            const connData = await connResp.json();
            if (Array.isArray(connData.connections)) {
              setConnectionsList(connData.connections);
            }
          }
        } catch {
          // ignore
        }

        // 6. Settings Data
        try {
          const setResp = await fetch("/api/settings");
          if (setResp.ok) {
            const setData = await setResp.json();
            setSettingsData(setData);
            if (setData.organization?.name) {
              setOrgName(setData.organization.name);
            }
          }
        } catch {
          // ignore
        }

        // Monitoring records are scoped and authorized by the backend.
        const monitoringResponse = await fetch("/api/dashboard", { cache: "no-store" });
        const monitoring = await monitoringResponse.json();
        if (!monitoringResponse.ok) throw new Error(monitoring.error || "Monitoring unavailable.");
        setIncidentsList(monitoring.incidents);
        setSecurityList(monitoring.securityEvents);
        setHealthList(monitoring.healthChecks.map((check: any) => ({
          id: check.id, source: check.name, message: check.status,
          details: { latency: check.last_latency_ms },
        })));
        setLiveLogs(monitoring.auditEvents.map((event: any) => ({
          id: event.id, type: "AUDIT", source: event.actor_type,
          message: event.diff_summary || event.action_name, timestamp: event.timestamp,
          details: { action: event.action_name, hash: event.parameters_hash },
        })));

        // 10. Real Tasks from PostgreSQL
        const taskResp = await fetch("/api/tasks");
        if (taskResp.ok) {
          const taskData = await taskResp.json();
          if (Array.isArray(taskData.tasks)) {
            setTasks(taskData.tasks);
            const firstTask = taskData.tasks[0];
            setActiveTask(firstTask || null);

            const mappedChanges: CodeChangeItem[] = taskData.tasks.map((task: any) => {
              const created = new Date(task.created_at);
              const hours = (Date.now() - created.getTime()) / 3600000;
              const files: CodeChangeFile[] = task.result?.files || [];
              return {
                id: task.id, taskId: task.id,
                commitSha: task.pullRequest?.commitSha || "",
                message: task.summary || task.user_prompt || task.title,
                author: task.created_by || "",
                timestamp: Number.isFinite(created.getTime()) ? created.toLocaleString() : "Not available",
                dateGroup: hours < 24 ? "Today" : hours < 48 ? "Yesterday" : "Earlier",
                branch: task.pullRequest?.branch || task.result?.branch || "",
                repository: task.repository?.full_name || "",
                filesChanged: files,
                additions: files.reduce((sum, file) => sum + file.additions, 0),
                deletions: files.reduce((sum, file) => sum + file.deletions, 0),
                previewUrl: task.workspace?.previewUrl || "",
              };
            });
            setCodeChanges(mappedChanges);
            setSelectedChangeId((current) => mappedChanges.some(c => c.id === current) ? current : mappedChanges[0]?.id || null);
            setPromptHistory(taskData.tasks.map((task: any, index: number) => ({
              id: task.id, taskId: task.id,
              prompt: task.user_prompt || task.title,
              project: task.project_id, repository: mappedChanges[index].repository,
              timestamp: mappedChanges[index].timestamp, dateGroup: mappedChanges[index].dateGroup,
              status: task.status === "completed" ? "Completed" : task.status === "failed" ? "Failed" :
                task.status === "awaiting_approval" ? "Awaiting Approval" : "In Progress",
              commitSha: mappedChanges[index].commitSha, filesCount: mappedChanges[index].filesChanged.length,
            })));
            // Task completion/PR creation is not evidence of a deployment.
            setChangeHistory([]);

          }
        }
      } catch (err) {
        setDeployError(err instanceof Error ? err.message : "Workspace data unavailable.");
      } finally {
        setLoadingData(false);
      }
    }

    loadWorkspaceData();

    // 11. SUPABASE REALTIME SUBSCRIPTION FOR TASKS, REPOSITORIES & AUDIT EVENTS
    const realtimeChannel = supabase
      .channel("ryvix-dashboard-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => { void loadWorkspaceData(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "repositories" },
        () => {
          fetch("/api/github/repositories/connect")
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data.repositories)) {
                setConnectedRepos(data.repositories);
              }
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [supabase]);
  // Helper to show project-specific URL toast notification (Section 9, 10, 17)
  function showProjectSelectedToast(repo: any) {
    if (!repo) return;
    const projName = repo.full_name ? (repo.full_name.split("/")[1] || repo.full_name) : (repo.name || "Project");
    const repoFull = repo.full_name || repo.name || "";
    const url = getProjectLiveUrl(repo);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setProjectToast({
      visible: true,
      projectName: projName,
      repoFullName: repoFull,
      liveUrl: url,
    });

    toastTimerRef.current = setTimeout(() => {
      setProjectToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 4000);
  }

  // Handle Repository Selection (Project Identity, Context, URL & Toast Flow)
  function handleSelectRepository(repo: any, options?: { showToast?: boolean }) {
    if (!repo) return;
    setActiveRepo(repo);
    const repoTitle = repo.full_name || repo.name;
    setSelectedWebsite(repoTitle);
    if (typeof window !== "undefined") {
      localStorage.setItem("ryvix_active_repo", repoTitle);
    }

    const resolvedLive = getProjectLiveUrl(repo);
    setCustomLiveUrl(resolvedLive);
    setLiveUrlInput(resolvedLive || "");
    setShowWebsiteModal(false);

    // Sync tasks and change records for the selected project

    // Match workspace sandbox session if project matches
    if (repo.project_id && workspaceSessions.length > 0) {
      const matchWs = workspaceSessions.find((ws: any) => ws.project_id === repo.project_id && ws.preview_url);
      if (matchWs) {
        setActivePreviewUrlState(matchWs.preview_url);
      }
    }

    // Trigger URL notification toast for this selected project (Section 9 & 10)
    if (options?.showToast !== false) {
      showProjectSelectedToast(repo);
    }
  }

  const [liveUrlError, setLiveUrlError] = useState<string | null>(null);
  const [liveUrlSaving, setLiveUrlSaving] = useState(false);
  const liveUrlRequest = useRef(0);
  useEffect(() => {
    const requestId=++liveUrlRequest.current;
    let cancelled = false;
    setCustomLiveUrl(null); setLiveUrlInput(""); setLiveUrlError(null);
    if (activeRepo?.id) fetch(`/api/github/repositories/live-url?repositoryId=${encodeURIComponent(activeRepo.id)}`, {cache:"no-store"})
      .then(async response => {const data=await response.json(); if(!response.ok) throw new Error(data.error || "Website URL unavailable."); return data;})
      .then(data => {if(!cancelled && requestId===liveUrlRequest.current){setCustomLiveUrl(data.liveUrl);setLiveUrlInput(data.liveUrl || "");}})
      .catch(error => {if(!cancelled && requestId===liveUrlRequest.current)setLiveUrlError(error.message);});
    return () => {cancelled=true;};
  }, [activeRepo?.id]);

  async function handleSaveLiveUrl(urlToSave?: string) {
    if(liveUrlSaving)return;
    const requestId=++liveUrlRequest.current;
    const raw=(urlToSave ?? liveUrlInput).trim();
    const formatted=raw ? (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) : null;
    setLiveUrlSaving(true);setLiveUrlError(null);
    try {
      const response=await fetch("/api/github/repositories/live-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({repositoryId:activeRepo?.id,liveUrl:formatted})});
      const data=await response.json();if(!response.ok)throw new Error(data.error || "Website URL could not be saved.");
      if(requestId===liveUrlRequest.current){setCustomLiveUrl(data.liveUrl);setLiveUrlInput(data.liveUrl || "");setShowLiveUrlModal(false);}
    }catch(error){if(requestId===liveUrlRequest.current)setLiveUrlError(error instanceof Error?error.message:"Website URL could not be saved.");}
    finally{setLiveUrlSaving(false);}
  }

  function handleSkipLiveUrl() { setShowLiveUrlModal(false); }

  function handleOpenLiveUrlModal() {
    setLiveUrlInput(customLiveUrl || "");
    setShowLiveUrlModal(true);
  }

  // Live Interactive AI Chat Streaming with Real SSE
  async function handleSendChatMessage(textToSend?: string) {
    if(chatHistoryLoading || chatHistoryError)return;
    const message = textToSend || chatInput;
    if (!message.trim() || isChatStreaming) return;

    const userMsg = { role: "user" as const, content: message };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatStreaming(true);

    const isCodeChange = /make|build|add|change|update|fix|redesign|dark|navbar|button|homepage|style|page|color|create|delete|remove|implement/i.test(message);
    if (activeRepo?.id && isCodeChange && !isProcessing) {
      void handlePromptSubmit(undefined, message, true);
    }

    const assistantMsg = {
      role: "assistant" as const,
      content: "",
      thoughtTrace: isCodeChange ? "Queuing sandbox build & analyzing codebase..." : "Retrieving authorized project context...",
    };
    setChatMessages((prev) => [...prev, assistantMsg]);
    const chatAbort = new AbortController();
    chatAbortRef.current = chatAbort;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: chatAbort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          conversationId: chatConversationRef.current,
          projectId: activeRepo?.project_id || undefined,
          repositoryId: activeRepo?.id || undefined,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat response failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let lastThought = "";
      let eventBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        eventBuffer += chunk;
        const lines = eventBuffer.split("\n");
        eventBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let data;
            try { data = JSON.parse(line.slice(6)); } catch { continue; }
            if (data.error) throw new Error('Response interrupted.');
            if (data.conversationId) chatConversationRef.current = data.conversationId;
            if (data.chunk && typeof data.chunk === "string") {
              accumulated += data.chunk;
            } else if (data.content && typeof data.content === "string") {
              lastThought = data.content;
            }
          }
        }

        setChatMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: accumulated || updated[lastIdx].content,
              thoughtTrace: lastThought || undefined,
            };
          }
          return updated;
        });
      }
    } catch {
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: "Chat request failed. Please retry.",
            thoughtTrace: undefined,
          };
        }
        return updated;
      });
    } finally {
      chatAbort.abort();
      chatAbortRef.current = null;
      setIsChatStreaming(false);
    }
  }

  // Live Task Approval & Actions in Database
  async function handleApproveTask(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/ship`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Shipping failed.");
      setTasks(previous => previous.map(task => task.id === taskId ? { ...task, status: data.task.status } : task));
    } catch (error) { setDeployError(error instanceof Error ? error.message : "Shipping failed."); }
  }

  async function handleRejectTask(taskId: string) {
    try {
      const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "cancelled" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cancellation failed.");
      setTasks(previous => previous.map(task => task.id === taskId ? { ...task, status: data.status } : task));
    } catch (error) { setDeployError(error instanceof Error ? error.message : "Cancellation failed."); }
  }

  async function handleDeleteTask(taskId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      const resp = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setChangeHistory((prev) => prev.filter((h) => h.id !== taskId));
        setPromptHistory((prev) => prev.filter((h) => h.id !== taskId));
        setCodeChanges((prev) => prev.filter((h) => h.id !== taskId));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  // Synthetic Probe Runner
  async function handleRunProbe() {
    setIsProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/monitoring/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: customLiveUrl }),
      });
      const data = await res.json();
      if (data.success && data.probe) {
        setProbeResult(`Probe verified: ${data.probe.status.toUpperCase()} in ${data.probe.latencyMs}ms (HTTP ${data.probe.statusCode ?? "unavailable"})`);
      } else {
        setProbeResult(data.error || "Probe failed: no measurement was returned.");
      }
    } catch {
      setProbeResult("Probe unavailable: request failed.");
    } finally {
      setIsProbing(false);
    }
  }

  // Launch Ephemeral Docker Sandbox
  async function handleLaunchSandbox() {
    window.location.assign('/tasks');
  }

  // Settings Actions
  async function handleSaveOrgSettings(name: string) {
    setIsSavingSettings(true);
    setSettingsSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_org", orgName: name, orgId: settingsData?.organization?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setOrgName(name);
        setSettingsSaveMsg("Organization profile saved successfully!");
      }
    } catch {
      setSettingsSaveMsg("Failed to save organization settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleGenerateApiKey() {
    setIsSavingSettings(true);setSettingsSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_key", keyName: "Developer Key" }),
      });
      const data = await res.json();
      if(!res.ok||!data.success)throw new Error(data.error||'Key generation unavailable.');
      if (data.rawKey) {
        setNewKeyGenerated(data.rawKey);
        if (data.key) {
          setSettingsData((prev: any) => ({
            ...prev,
            apiKeys: [data.key, ...(prev?.apiKeys || [])],
          }));
        }
      }
    } catch (e) {
      setSettingsSaveMsg(e instanceof Error?e.message:'Key generation unavailable.');
    } finally {setIsSavingSettings(false);}
  }

  async function handleRevokeApiKey(keyId:string,name:string){
    if(isSavingSettings||!window.confirm(`Revoke ${name}? This cannot be undone.`))return;
    setIsSavingSettings(true);setSettingsSaveMsg(null);
    try{
      const response=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'revoke_key',keyId})});
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Key revocation unavailable.');
      setSettingsData((previous:any)=>({...previous,apiKeys:previous.apiKeys.filter((key:any)=>key.id!==keyId)}));
      setNewKeyGenerated(null);setSettingsSaveMsg('API key revoked.');
    }catch(error){setSettingsSaveMsg(error instanceof Error?error.message:'Key revocation unavailable.');}
    finally{setIsSavingSettings(false);}
  }

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

  // Submit Prompt to AI & Orchestrate Workflow with Real API and Database
  async function handlePromptSubmit(e?: React.FormEvent, customPrompt?: string, keepCurrentTab = false) {
    if (e) e.preventDefault();
    const finalPrompt = customPrompt || promptText.trim();
    if (!finalPrompt || isProcessing) return;

    if (!customPrompt) setPromptText(finalPrompt);

    setIsProcessing(true);
    setPreviewState("analyzing");
    setAnalyzingStep(1);
    setStatusMessage("AI ANALYZING");
    setDeployError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          projectId: activeRepo?.project_id || undefined,
          repositoryId: activeRepo?.id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate AI task");
      }

      if (data.task) {
        setActiveTask(data.task);
        setTasks((prev) => [data.task, ...prev.filter((t) => t.id !== data.task.id)]);

        if (Array.isArray(data.steps)) {
          setTaskSteps(data.steps);
        }

        if (data.workspace?.previewUrl) {
          setActivePreviewUrlState(data.workspace.previewUrl);
        }

        setAnalyzingStep(data.task.status === 'queued' ? 1 : 4);
        setPreviewState(data.task.status === 'queued' ? 'analyzing' : data.workspace?.previewUrl ? "preview_ready" : "none");
        setStatusMessage(data.task.status === 'queued' ? 'QUEUED FOR ANALYSIS' : data.workspace?.previewUrl ? "PREVIEW READY" : "Preview unavailable.");
        if (!keepCurrentTab) setActiveTab("previews");
      }
    } catch (err: any) {
      console.error("[Prompt Submit Error]:", err);
      setDeployError(err.message || "Failed to initiate AI task");
      setStatusMessage("ERROR");
      setPreviewState("none");
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    if (!activeTask?.id || !['queued','planning','executing','verifying'].includes(activeTask.status)) return;
    const taskId = activeTask.id;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const response = await fetch('/api/tasks', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Task status unavailable.');
        const task = data.tasks?.find((item: any) => item.id === taskId);
        if (task) {
          setTasks(data.tasks);
          setActiveTask(task);
          setTaskSteps(task.plans?.find((plan: any) => plan.id === task.active_plan_id)?.steps || []);
          setActivePreviewUrlState(task.workspace?.previewUrl || null);
          const running = ['queued','planning','executing','verifying'].includes(task.status);
          setPreviewState(running ? 'analyzing' : task.workspace?.previewUrl ? 'preview_ready' : 'none');
          setStatusMessage(running ? task.status.toUpperCase() : task.status === 'failed' ? 'TASK FAILED' : task.workspace?.previewUrl ? 'PREVIEW READY' : 'TASK READY FOR REVIEW');
          if (task.status === 'failed') setDeployError(task.error_details || 'Task failed.');
          if (task.result?.files) {
            const files: CodeChangeFile[] = task.result.files;
            const change: CodeChangeItem = { id:task.id,taskId:task.id,commitSha:task.pullRequest?.commitSha || '',
              message:task.summary || task.user_prompt,author:task.created_by || '',timestamp:new Date(task.created_at).toLocaleString(),
              dateGroup:'Today',branch:task.result.branch,repository:task.repository?.full_name || '',filesChanged:files,
              additions:files.reduce((sum,file) => sum+file.additions,0),deletions:files.reduce((sum,file) => sum+file.deletions,0),
              previewUrl:task.workspace?.previewUrl || '' };
            setCodeChanges(previous => [change,...previous.filter(item => item.id !== task.id)]);
          }
        }
      } catch (error) { if (!controller.signal.aborted) setDeployError(error instanceof Error ? error.message : 'Task status unavailable.'); }
      finally { if (!controller.signal.aborted) timer=setTimeout(refresh,3000); }
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [activeTask?.id,activeTask?.status]);

  // Approval requests a real PR; the customer's pipeline controls deployment.
  async function handleApproveDeployment() {
    setShowApprovalModal(false);
    setDeployError(null);
    const taskId = activeTask?.id;
    if (!taskId) { setDeployError("Select a task to approve."); return; }
    setStatusMessage("CREATING PULL REQUEST");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/ship`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.pullRequest?.url) throw new Error(result.error || "Pull request creation failed.");
      setActiveTask((task: any) => ({ ...task, status: result.task.status, pullRequest: result.pullRequest }));
      setStatusMessage(`PULL REQUEST #${result.pullRequest.number} CREATED`);
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : "Pull request creation failed.");
      setStatusMessage("SHIP FAILED");
    }
  }

  function handleChipClick(chipText: string) {
    setPromptText(chipText);
    handlePromptSubmit(undefined, chipText);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const activePreviewUrl = activePreviewUrlState;
  const activeLiveUrl = customLiveUrl || "";

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
      <header className="dashboard-topbar"
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
        <div className="dashboard-topbar-inner" style={{ maxWidth: "1680px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
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
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F5F7FA" }}>
                  {activeRepo?.full_name ? (activeRepo.full_name.split("/")[1] || activeRepo.full_name) : selectedWebsite}
                </span>
                <span style={{ fontSize: "0.68rem", color: "#66717F" }}>▾</span>
              </button>

              {showWebsiteModal && (
                <div
                  style={{
                    position: "absolute",
                    top: "115%",
                    left: 0,
                    width: "280px",
                    background: "#0D1218",
                    border: "1px solid #2A3542",
                    borderRadius: "10px",
                    padding: "0.5rem",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.85)",
                    zIndex: 60,
                  }}
                >
                  <div style={{ fontSize: "0.66rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", fontWeight: 700, padding: "0.4rem 0.6rem", textTransform: "uppercase" }}>
                    Select Target Project / Repository
                  </div>
                  {connectedRepos.map((repo: any) => {
                    const repoName = repo.full_name || repo.name;
                    const isCurrent = activeRepo && (activeRepo.full_name === repo.full_name || activeRepo.name === repo.name);
                    return (
                      <div
                        key={repo.id || repoName}
                        onClick={() => handleSelectRepository(repo)}
                        style={{
                          padding: "0.5rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          color: isCurrent ? "#42D9FF" : "#F5F7FA",
                          background: isCurrent ? "rgba(66, 217, 255, 0.08)" : "transparent",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                          ✦ {repoName}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: isCurrent ? "#45D483" : "#66717F" }}>
                          {isCurrent ? "Active" : "Select"}
                        </span>
                      </div>
                    );
                  })}
                  {servers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedWebsite(s.hostname);
                        setWebsiteDomain(s.ip);
                        setCustomLiveUrl(`http://${s.ip}`);
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
                        alignItems: "center",
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
            {activeLiveUrl ? (
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
                <span>{activeLiveUrl.replace(/^https?:\/\//, "")}</span>
                <IconExternalLink size={11} color="#66717F" />
              </a>
            ) : (
              <button
                onClick={handleOpenLiveUrlModal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.28rem 0.65rem",
                  borderRadius: "6px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#F59E0B",
                  fontSize: "0.74rem",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  cursor: "pointer",
                }}
              >
                <IconGlobe size={13} color="#F59E0B" />
                <span>+ Add deployed URL</span>
              </button>
            )}
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
            <WorkspaceNavigation primary />
            <PhoneOnboarding />
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
      <div className="dashboard-shell" style={{ display: "flex", flex: 1, maxWidth: "1680px", width: "100%", margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* COLLAPSIBLE PREMIUM SIDEBAR */}
        <aside
          className="dashboard-sidebar"
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
          <div className="dashboard-sidebar-collapse-btn" style={{ display: "flex", justifyContent: isSidebarCollapsed ? "center" : "flex-end", padding: "0 0.4rem 0.75rem" }}>
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
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F7FA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeRepo?.full_name || selectedWebsite}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeLiveUrl.replace("https://", "").replace("http://", "")}
              </div>
            </div>
          )}
        </aside>

        {/* ========================================================================= */}
        {/* WORKSPACE CONTENT AREA (Responsive to All Navigation Tabs)                */}
        {/* ========================================================================= */}
        <main className="dashboard-main-content" style={{ flex: 1, padding: "2rem", overflowY: "auto", minHeight: "calc(100vh - 60px)" }}>
          {/* 1. OVERVIEW (DEFAULT USER-FIRST FLAGSHIP PAGE) */}
          {liveUrlError && <div role="alert" style={{color:"#EF4444",padding:"1rem"}}>{liveUrlError}</div>}
          {deployError && <div role="alert" style={{ color: "#EF4444", padding: "1rem" }}>{deployError}</div>}
          {activeTab === "overview" && (
            <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1rem" }}>
              {/* Overview Top Repository Heading (Requirement 7) */}
              <div style={{ textAlign: "center", marginBottom: "1.1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.22rem 0.75rem", borderRadius: "9999px", background: "rgba(124, 108, 255, 0.1)", border: "1px solid rgba(124, 108, 255, 0.25)", fontSize: "0.72rem", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", marginBottom: "0.35rem" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#45D483", boxShadow: "0 0 6px #45D483" }} />
                  <span>Selected Project</span>
                </div>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "2rem", fontWeight: 700, color: "#F5F7FA", margin: "0 0 0.2rem 0", letterSpacing: "-0.02em" }}>
                  {activeRepo?.full_name ? (activeRepo.full_name.split("/")[1] || activeRepo.full_name) : (selectedWebsite || "No Project Selected")}
                </h2>
                <div style={{ fontSize: "0.8rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {activeRepo?.full_name || selectedWebsite || "Select a project from Websites"}
                </div>
              </div>

              {/* Gyroscopic AI Core */}
              <div style={{ position: "relative", width: "68px", height: "68px", marginBottom: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(124, 108, 255, 0.4)", borderTopColor: "#42D9FF", borderBottomColor: "#A78BFA", animation: isProcessing ? "spin 1s linear infinite" : "spin 12s linear infinite" }} />
                <div style={{ position: "absolute", inset: "8px", borderRadius: "50%", border: "1.5px dashed rgba(66, 217, 255, 0.4)", animation: isProcessing ? "spinReverse 1.5s linear infinite" : "spinReverse 8s linear infinite" }} />
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)", boxShadow: "0 0 25px rgba(124, 108, 255, 0.7)", animation: "pulse 2s infinite ease-in-out" }} />
              </div>

              {/* Status Pill */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", padding: "0.32rem 0.95rem", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "9999px", fontSize: "0.76rem", color: "#A5AFBC", marginBottom: "1.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: customLiveUrl ? "#45D483" : "#F59E0B", boxShadow: customLiveUrl ? "0 0 6px #45D483" : "0 0 6px #F59E0B" }} />
                <span>Live Website:</span>
                <span style={{ color: customLiveUrl ? "#42D9FF" : "#F59E0B", fontWeight: 600, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {customLiveUrl || "URL not configured"}
                </span>
                <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.35rem", borderRadius: "4px", background: "rgba(124, 108, 255, 0.15)", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {githubConnected ? 'GitHub connected' : 'GitHub not connected'}
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
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#F5F7FA", marginTop: "0.2rem" }}>
                      {activeRepo?.full_name || selectedWebsite}
                    </h3>
                  </div>
                  <span style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", border: `1px solid ${"rgba(69, 212, 131, 0.3)"}`, color: "#45D483", fontSize: "0.72rem", fontWeight: 600 }}>
                    ● Health not verified
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", background: "#121922", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.7rem", color: "#66717F" }}>GitHub</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: githubConnected ? "#45D483" : "#F59E0B", marginTop: "2px" }}>
                      {githubConnected ? "✓ Connected" : "Not connected"}
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "#121922", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.7rem", color: "#66717F" }}>AI</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#45D483", marginTop: "2px" }}>✓ Ready</div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "#121922", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.7rem", color: "#66717F" }}>Website</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: customLiveUrl ? "#45D483" : "#F59E0B", marginTop: "2px" }}>
                      {customLiveUrl ? "✓ Online" : "Not configured"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {customLiveUrl ? (
                      <>
                        <a
                          href={customLiveUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "0.78rem", color: "#42D9FF", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", textDecoration: "none" }}
                        >
                          {customLiveUrl} ↗
                        </a>
                        <button
                          onClick={handleOpenLiveUrlModal}
                          style={{ background: "none", border: "none", color: "#66717F", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                        >
                          Edit URL
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "#F59E0B", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                          Live Website: Not configured
                        </span>
                        <button
                          onClick={handleOpenLiveUrlModal}
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            background: "rgba(124, 108, 255, 0.15)",
                            border: "1px solid rgba(124, 108, 255, 0.35)",
                            color: "#7C6CFF",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          + Add deployed URL
                        </button>
                      </div>
                    )}
                  </div>
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
                      {isProcessing ? "AI is processing your modification request..." : activeTask ? `Active Task: ${activeTask.summary || activeTask.user_prompt || activeTask.prompt}` : "No task started"}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: isProcessing ? "rgba(66, 217, 255, 0.12)" : previewState === "preview_ready" ? "rgba(245, 158, 11, 0.12)" : "rgba(69, 212, 131, 0.12)", border: `1px solid ${isProcessing ? "rgba(66, 217, 255, 0.3)" : previewState === "preview_ready" ? "rgba(245, 158, 11, 0.3)" : "rgba(69, 212, 131, 0.3)"}`, color: isProcessing ? "#42D9FF" : previewState === "preview_ready" ? "#F59E0B" : "#45D483", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                    {isProcessing ? "In Progress" : previewState === "preview_ready" ? "Preview Ready" : activeTask ? activeTask.status : "Not started"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "0.5rem 0" }}>
                  {["Analyzing", "Planning", "Coding", "Testing", "Preview", "Review", "Deploy"].map((step, idx) => {
                    const stepStage = isProcessing ? analyzingStep : previewState === "preview_ready" ? 4 : activeTask?.status === "awaiting_approval" ? 4 : -1;
                    const isDone = idx <= stepStage;
                    const isCurrent = idx === stepStage;
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
            <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 460px) 1fr", gap: "1.5rem", height: "calc(100vh - 120px)", minHeight: "680px" }}>
              {/* Left Column: Interactive Streaming AI Conversation */}
              <div style={{ display: "flex", flexDirection: "column", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px", overflow: "hidden" }}>
                {/* Project-Aware Context Bar */}
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #1D2732", background: "#080C11", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #7C6CFF, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                        <IconSparkles size={14} color="#ffffff" />
                      </div>
                      <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#F5F7FA" }}>RYVIX AGI STREAM</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.7rem", color: "#45D483" }}>● Epistemic OODA Cycle</span>
                  </div>

                  {/* Context Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem", padding: "0.45rem", background: "#0D1218", borderRadius: "8px", border: "1px solid #1D2732" }}>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>PROJECT</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#F5F7FA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedWebsite}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>GITHUB</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: githubConnected ? "#45D483" : "#F59E0B" }}>{githubConnected ? "Connected" : "Enroll"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>WEBSITE</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#45D483" }}>Live</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>SANDBOX</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#42D9FF" }}>:3100</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>STATUS</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isChatStreaming ? "#42D9FF" : "#A78BFA" }}>{isChatStreaming ? "Synthesizing" : "Ready"}</div>
                    </div>
                  </div>
                </div>

                {/* AI Workspace Chat Stream */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: msg.role === "user" ? "85%" : "95%",
                        padding: "0.85rem 1.15rem",
                        borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        background: msg.role === "user" ? "linear-gradient(135deg, #7C6CFF 0%, #6366f1 100%)" : "#121922",
                        border: msg.role === "user" ? "none" : "1px solid #1D2732",
                        color: "#F5F7FA",
                        fontSize: "0.86rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: msg.role === "user" ? "#ffffff" : "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", textTransform: "uppercase" }}>
                          {msg.role === "user" ? "Operator" : "Ryvix AGI Core"}
                        </span>
                        {msg.role === "assistant" && (
                          <span style={{ fontSize: "0.65rem", color: "#45D483", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            ● Active
                          </span>
                        )}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content || (isChatStreaming && idx === chatMessages.length - 1 ? "Preparing an answer from available evidence..." : "")}</div>
                      {msg.thoughtTrace && (
                        <div style={{ marginTop: "0.55rem", padding: "0.45rem 0.65rem", borderRadius: "6px", background: "#080C11", border: "1px solid #1D2732", fontSize: "0.72rem", color: "#42D9FF", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                          ⚡ {msg.thoughtTrace}
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatStreaming && (
                    <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.85rem", borderRadius: "9999px", background: "rgba(66, 217, 255, 0.1)", border: "1px solid rgba(66, 217, 255, 0.25)", fontSize: "0.74rem", color: "#42D9FF" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#42D9FF", animation: "pulse 1s infinite" }} />
                      Streaming real-time OODA deliberation tokens...
                    </div>
                  )}
                </div>

                {/* Quick Prompts Bar */}
                <div style={{ padding: "0.4rem 0.85rem", background: "#080C11", borderTop: "1px solid #1D2732", display: "flex", gap: "0.4rem", overflowX: "auto" }}>
                  {suggestedChanges.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleSendChatMessage(chip.text)}
                      disabled={isChatStreaming || chatHistoryLoading || !!chatHistoryError}
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "9999px",
                        background: "#121922",
                        border: "1px solid #1D2732",
                        color: "#A5AFBC",
                        fontSize: "0.72rem",
                        whiteSpace: "nowrap",
                        cursor: isChatStreaming ? "default" : "pointer",
                      }}
                    >
                      + {chip.text}
                    </button>
                  ))}
                </div>

                <a href="/chat">View and switch saved conversations</a>
                {chatHistoryLoading && <p role="status">Loading saved conversation?</p>}
                {chatHistoryError && <p role="alert">{chatHistoryError} <a href="/chat">Open chat to retry</a></p>}
                {/* Interactive Chat Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  style={{ padding: "0.75rem 1rem", borderTop: "1px solid #1D2732", background: "#080C11", display: "flex", gap: "0.5rem" }}
                >
                  <input
                    type="text"
                    placeholder="Ask Ryvix AGI to modify code, analyze logs, or optimize latency..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatStreaming || chatHistoryLoading || !!chatHistoryError}
                    style={{ flex: 1, padding: "0.65rem 0.85rem", borderRadius: "8px", background: "#0D1218", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.85rem", outline: "none" }}
                  />
                  <button
                    type="submit"
                    disabled={isChatStreaming || chatHistoryLoading || !!chatHistoryError || !chatInput.trim()}
                    style={{
                      padding: "0.65rem 1.25rem",
                      borderRadius: "8px",
                      border: "none",
                      background: chatInput.trim() ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : "#121922",
                      color: chatInput.trim() ? "#ffffff" : "#66717F",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "0.04em",
                      cursor: chatInput.trim() ? "pointer" : "default",
                    }}
                  >
                    {isChatStreaming ? "..." : "SEND"}
                  </button>
                </form>
              </div>

              {/* Right Column: Preview studio */}
              <div style={{ display: "flex", flexDirection: "column", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px", overflow: "hidden" }}>
                <PreviewStudioFrame
                  orgName={orgName}
                  repoName={activeRepo?.full_name || selectedWebsite || "Production Website"}
                  branch={activeRepo?.default_branch || "main"}
                  commitSha={activeTask?.pullRequest?.commitSha || "Not recorded"}
                  activeLiveUrl={customLiveUrl || activeLiveUrl || ""}
                  activePreviewUrl={activePreviewUrlState || activePreviewUrl || ""}
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
                  previewState={previewState}
                  onConnectRepo={() => setShowRepoModal(true)}
                  onAddWebsite={() => setShowWebsiteModal(true)}
                  onApprove={() => setShowApprovalModal(true)}
                  onReject={() => {
                    setPreviewState("none");
                    setPromptText("");
                  }}
                  onConfigureUrl={handleOpenLiveUrlModal}
                  taskSteps={taskSteps}
                  activeTask={activeTask}
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
                    Selected GitHub Projects
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    WEBSITES
                  </h2>
                </div>
                <button onClick={() => setShowRepoModal(true)} style={{ padding: "0.55rem 1.15rem", borderRadius: "8px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer" }}>
                  + Connect Website
                </button>
              </div>

              {connectedRepos.length === 0 ? (
                <div style={{ padding: "3.5rem 2rem", textAlign: "center", background: "#0D1218", borderRadius: "14px", border: "1px dashed #2A3542", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "rgba(124, 108, 255, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconGlobe size={28} color="#7C6CFF" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#F5F7FA" }}>No Website Projects Selected</h3>
                    <p style={{ fontSize: "0.86rem", color: "#A5AFBC", marginTop: "0.35rem", maxWidth: "440px" }}>
                      Select a repository from your GitHub repositories to add it as a RYVIX website project.
                    </p>
                  </div>
                  <button onClick={() => setShowRepoModal(true)} style={{ marginTop: "0.5rem", padding: "0.6rem 1.4rem", borderRadius: "8px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                    + Select GitHub Repository
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  {/* Dynamic Connected Websites & Repositories */}
                  {connectedRepos.map((repo: any) => {
                    const repoTitle = repo.full_name ? (repo.full_name.split("/")[1] || repo.full_name) : (repo.name || "Project");
                    const repoFullName = repo.full_name || repo.name || "user/repo";
                    const repoDisplayUrl = repo.clone_url ? repo.clone_url.replace(".git", "").replace("https://github.com/", "github.com/") : `github.com/${repoFullName}`;
                    const framework = repo.detected_stack?.[0] || repo.language || "Next.js 15";
                    const timeAgo = repo.updated_at ? new Date(repo.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active";
                    const isSelected = activeRepo && ((activeRepo.full_name && activeRepo.full_name === repo.full_name) || (activeRepo.name && activeRepo.name === repo.name));
                    const projectUrl = getProjectLiveUrl(repo);

                    return (
                      <div
                        key={repo.id || repoFullName}
                        onClick={() => handleSelectRepository(repo)}
                        style={{
                          background: isSelected ? "linear-gradient(180deg, #101620 0%, #0D1218 100%)" : "#0D1218",
                          border: isSelected ? "2px solid #7C6CFF" : "1px solid #1D2732",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 0 20px rgba(124, 108, 255, 0.2)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: isSelected ? "rgba(124, 108, 255, 0.25)" : "rgba(124, 108, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <IconGlobe size={20} color="#7C6CFF" />
                            </div>
                            <div>
                              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA" }}>{repoTitle}</div>
                              <div style={{ fontSize: "0.74rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>{repoFullName}</div>
                            </div>
                          </div>
                          <span style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "9999px",
                            background: isSelected ? "rgba(69, 212, 131, 0.15)" : "rgba(255, 255, 255, 0.05)",
                            color: isSelected ? "#45D483" : "#66717F",
                            border: `1px solid ${isSelected ? "rgba(69, 212, 131, 0.4)" : "#1D2732"}`,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}>
                            {isSelected ? "● CURRENTLY SELECTED" : "○ CLICK TO SELECT"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem" }}>
                          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922" }}>
                            <div style={{ fontSize: "0.65rem", color: "#66717F", textTransform: "uppercase" }}>Framework</div>
                            <div style={{ fontWeight: 600, color: "#42D9FF", marginTop: "2px" }}>{framework}</div>
                          </div>
                          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922" }}>
                            <div style={{ fontSize: "0.65rem", color: "#66717F", textTransform: "uppercase" }}>Last updated</div>
                            <div style={{ fontWeight: 600, color: "#A5AFBC", marginTop: "2px" }}>{timeAgo}</div>
                          </div>
                        </div>

                        <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#121922", fontSize: "0.78rem", color: "#A5AFBC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", overflow: "hidden" }}>
                            <span style={{ fontSize: "0.65rem", color: "#66717F", textTransform: "uppercase" }}>Live URL:</span>
                            <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: projectUrl ? "#42D9FF" : "#F59E0B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {projectUrl || "URL not configured"}
                            </span>
                          </div>
                          {projectUrl && (
                            <a
                              href={projectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: "#42D9FF", textDecoration: "none", marginLeft: "0.5rem" }}
                            >
                              ↗
                            </a>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #1D2732" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRepository(repo);
                              setActiveTab("overview");
                            }}
                            style={{
                              flex: 1,
                              padding: "0.55rem",
                              borderRadius: "6px",
                              background: isSelected ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : "#121922",
                              border: isSelected ? "none" : "1px solid #1D2732",
                              color: "#ffffff",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {isSelected ? "Open Overview" : "Select Project"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRepository(repo);
                              setActiveTab("ai");
                            }}
                            style={{
                              padding: "0.55rem 1rem",
                              borderRadius: "6px",
                              background: "#121922",
                              border: "1px solid #1D2732",
                              color: "#F5F7FA",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Ask AI
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                {connectedRepos.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", background: "#0D1218", borderRadius: "12px", border: "1px solid #1D2732", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <IconFolderGit size={32} color="#7C6CFF" />
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>No GitHub Repositories Connected Yet</h4>
                      <p style={{ fontSize: "0.85rem", color: "#A5AFBC", marginTop: "0.25rem", maxWidth: "420px" }}>
                        Enroll your repository using the button above to enable automatic stack detection and AI-guided code modifications.
                      </p>
                    </div>
                    <button onClick={() => setShowRepoModal(true)} style={{ padding: "0.6rem 1.35rem", borderRadius: "8px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                      + Connect GitHub Repository
                    </button>
                  </div>
                ) : (
                  connectedRepos
                    .map((r: any) => ({
                      name: r.full_name || r.name,
                      stack: r.language ? `${r.language} • Production Git` : (r.detected_stack?.[0] ? `${r.detected_stack[0]} • Git` : "Fullstack • Git"),
                      status: "Connected",
                      branch: r.default_branch || "main",
                      stars: r.stargazers_count ?? 0,
                      isReal: true,
                    }))
                    .filter((r) => r.name.toLowerCase().includes(repoSearch.toLowerCase()) || r.stack.toLowerCase().includes(repoSearch.toLowerCase()))
                    .map((repo) => (
                    <div
                      key={repo.name}
                      onClick={() => {
                        const target = connectedRepos.find((r: any) => (r.full_name || r.name) === repo.name) || { full_name: repo.name, name: repo.name };
                        handleSelectRepository(target);
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
                    ))
                )}
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
                  Total Real Tasks: <span style={{ color: "#42D9FF", fontWeight: 700 }}>{tasks.length}</span>
                </div>
              </div>

              {/* Lifecycle Stage Pills */}
              <div style={{ padding: "0.75rem 1rem", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "10px", marginBottom: "1.5rem", overflowX: "auto" }}>
                <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.45rem" }}>
                  Complete Operation Lifecycle Statuses:
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                  {["Planning", "Awaiting Approval", "Coding", "Testing", "Preview Ready", "Awaiting Review", "Creating PR", "Deploying", "Succeeded", "Failed"].map((st) => (
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

              {/* Live Database Tasks List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {tasks.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", background: "#0D1218", borderRadius: "12px", border: "1px solid #1D2732", color: "#66717F" }}>
                    No tasks found. Submit a prompt above to dispatch an autonomous operation.
                  </div>
                ) : (
                  tasks.map((task: any) => {
                    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                      awaiting_approval: { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" },
                      completed: { bg: "rgba(69, 212, 131, 0.12)", text: "#45D483", border: "rgba(69, 212, 131, 0.3)" },
                      running: { bg: "rgba(66, 217, 255, 0.12)", text: "#42D9FF", border: "rgba(66, 217, 255, 0.3)" },
                      failed: { bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444", border: "rgba(239, 68, 68, 0.3)" },
                      approved: { bg: "rgba(124, 108, 255, 0.15)", text: "#A78BFA", border: "rgba(124, 108, 255, 0.3)" },
                    };
                    const colorScheme = statusColors[task.status] || { bg: "#121922", text: "#A5AFBC", border: "#1D2732" };
                    const timeAgo = task.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

                    return (
                      <div
                        key={task.id}
                        style={{
                          padding: "1.25rem 1.5rem",
                          borderRadius: "12px",
                          background: "#0D1218",
                          border: "1px solid #1D2732",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700 }}>
                                #{task.id.slice(0, 8)}
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "#66717F" }}>•</span>
                              <span style={{ fontSize: "0.72rem", color: "#66717F" }}>{timeAgo}</span>
                            </div>
                            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA", marginTop: "0.25rem" }}>
                              {task.user_prompt || "Autonomous Coding Operation"}
                            </h4>
                            <p style={{ fontSize: "0.82rem", color: "#A5AFBC", marginTop: "0.2rem" }}>
                              {task.summary || "Synthesizing AST modifications and verifying sandbox tests."}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: "0.22rem 0.65rem",
                              borderRadius: "9999px",
                              background: colorScheme.bg,
                              border: `1px solid ${colorScheme.border}`,
                              color: colorScheme.text,
                              fontSize: "0.72rem",
                              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        {/* Interactive Task Approval Actions */}
                        {task.status === "awaiting_approval" && (
                          <div style={{ display: "flex", gap: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid #1D2732" }}>
                            <button
                              onClick={() => handleApproveTask(task.id)}
                              style={{
                                padding: "0.45rem 1rem",
                                borderRadius: "6px",
                                background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                                border: "none",
                                color: "#ffffff",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✔ Approve &amp; Execute
                            </button>
                            <button
                              onClick={() => handleRejectTask(task.id)}
                              style={{
                                padding: "0.45rem 0.85rem",
                                borderRadius: "6px",
                                background: "#121922",
                                border: "1px solid #1D2732",
                                color: "#EF4444",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              ✕ Reject Plan
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "workspaces" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Isolated Synthesis Environment
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    AI WORKSPACES &amp; SANDBOXES
                  </h2>
                </div>

                <button
                  onClick={handleLaunchSandbox}
                  disabled={isLaunchingSandbox}
                  style={{
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: isLaunchingSandbox ? "default" : "pointer",
                  }}
                >
                  {isLaunchingSandbox ? "Spinning Container..." : "+ Provision Ephemeral Sandbox"}
                </button>
              </div>

              {/* Active Sandbox Sessions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                {workspaceSessions.length === 0 ? (
                  <div style={{ padding: "3.5rem 2rem", textAlign: "center", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px" }}>
                    <div style={{ width: "54px", height: "54px", borderRadius: "14px", background: "rgba(124, 108, 255, 0.1)", border: "1px solid rgba(124, 108, 255, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "#7C6CFF" }}>
                      <IconLayers size={26} />
                    </div>
                    <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.2rem", fontWeight: 700, color: "#F5F7FA", marginBottom: "0.4rem" }}>
                      No Active Workspace Sandboxes
                    </h3>
                    <p style={{ maxWidth: "460px", margin: "0 auto 1.5rem", fontSize: "0.85rem", color: "#A5AFBC", lineHeight: 1.5 }}>
                      Ephemeral Docker containers are provisioned automatically when Ryvix AI modifies code or runs regression suites. You can also provision a sandbox on-demand.
                    </p>
                    <button
                      onClick={handleLaunchSandbox}
                      disabled={isLaunchingSandbox}
                      style={{
                        padding: "0.6rem 1.35rem",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: isLaunchingSandbox ? "default" : "pointer",
                      }}
                    >
                      {isLaunchingSandbox ? "Spinning Container..." : "Provision Ephemeral Sandbox"}
                    </button>
                  </div>
                ) : (
                  workspaceSessions.map((ws: any, idx: number) => (
                    <div key={ws.id || idx} style={{ padding: "1.75rem", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", textTransform: "uppercase" }}>
                            Docker Sandbox Container
                          </div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F5F7FA", marginTop: "2px", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            {ws.container_id}
                          </div>
                        </div>
                        <span style={{ padding: "0.22rem 0.65rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.12)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontSize: "0.74rem", fontWeight: 700 }}>
                          ● {ws.status?.toUpperCase() || "ACTIVE"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem" }}>
                        <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                          <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Preview Port</div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#42D9FF", marginTop: "2px", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            {ws.preview_port ? `:${ws.preview_port}` : "—"}
                          </div>
                        </div>
                        <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                          <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Allocated CPU</div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#F5F7FA", marginTop: "2px" }}>
                            {ws.allocated_cpu || "1.0"} vCPUs
                          </div>
                        </div>
                        <div style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                          <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase" }}>Cgroup Memory</div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#45D483", marginTop: "2px" }}>
                            {ws.allocated_ram_mb || 2048} MB
                          </div>
                        </div>
                      </div>

                      {ws.preview_url && (
                        <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "#080C11", border: "1px solid #1D2732", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            URL: {ws.preview_url}
                          </span>
                          <a
                            href={ws.preview_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.78rem", color: "#7C6CFF", fontWeight: 700, textDecoration: "none" }}
                          >
                            Open Sandboxed Preview &rarr;
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "previews" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Live URL Testing Suite
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    BEFORE &amp; AFTER PREVIEW
                  </h2>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {(["desktop", "tablet", "mobile"] as const).map((vp) => (
                    <button
                      key={vp}
                      onClick={() => setViewport(vp)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        borderRadius: "6px",
                        background: viewport === vp ? "#7C6CFF" : "#121922",
                        border: "1px solid #1D2732",
                        color: viewport === vp ? "#ffffff" : "#A5AFBC",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                        cursor: "pointer",
                      }}
                    >
                      {vp}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Switcher Input Bar */}
              <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.76rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", textTransform: "uppercase" }}>Target Live URL:</span>
                <input
                  type="text"
                  placeholder="e.g. https://myecommerce.com"
                  value={liveUrlInput}
                  onChange={(e) => setLiveUrlInput(e.target.value)}
                  style={{ flex: 1, padding: "0.45rem 0.75rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.82rem", outline: "none", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
                />
                <button disabled={liveUrlSaving} onClick={() => handleSaveLiveUrl()}>Save URL</button>
                <button
                  onClick={() => setIsShowingAfter(!isShowingAfter)}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "6px",
                    background: isShowingAfter ? "rgba(69, 212, 131, 0.15)" : "rgba(124, 108, 255, 0.15)",
                    border: `1px solid ${isShowingAfter ? "#45D483" : "#7C6CFF"}`,
                    color: isShowingAfter ? "#45D483" : "#A78BFA",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isShowingAfter ? "Viewing: AI Sandbox Preview (After)" : "Viewing: Live Production Site (Before)"}
                </button>
              </div>

              {/* Interactive Frame */}
              <div style={{ background: "#0D1218", border: "1px solid #1D2732", borderRadius: "14px", overflow: "hidden", minHeight: "680px" }}>
                <PreviewStudioFrame
                  orgName={orgName}
                  repoName={activeRepo?.full_name || selectedWebsite || "Production Website"}
                  branch={activeRepo?.default_branch || "main"}
                  commitSha={activeTask?.pullRequest?.commitSha || "Not recorded"}
                  activeLiveUrl={customLiveUrl || ""}
                  activePreviewUrl={activePreviewUrlState || ""}
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
                  previewState={previewState}
                  onConnectRepo={() => setShowRepoModal(true)}
                  onAddWebsite={() => setShowWebsiteModal(true)}
                  onApprove={() => setShowApprovalModal(true)}
                  onReject={() => {}}
                  onConfigureUrl={handleOpenLiveUrlModal}
                  taskSteps={taskSteps}
                  activeTask={activeTask}
                />
              </div>
            </div>
          )}

          {activeTab === "changes" && (
            <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Audit &amp; Revision Log
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    HISTORY &amp; REVISIONS
                  </h2>
                </div>

                {/* Session Switcher: Prompt History vs Code Changes */}
                <div style={{ display: "flex", background: "#080C11", border: "1px solid #1D2732", borderRadius: "8px", padding: "3px" }}>
                  <button
                    onClick={() => setHistoryTab("prompts")}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: "6px",
                      border: "none",
                      background: historyTab === "prompts" ? "#121922" : "transparent",
                      color: historyTab === "prompts" ? "#42D9FF" : "#A5AFBC",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <span>💬 Prompt History</span>
                    <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", background: historyTab === "prompts" ? "rgba(66, 217, 255, 0.15)" : "#0D1218", color: historyTab === "prompts" ? "#42D9FF" : "#66717F" }}>
                      {promptHistory.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setHistoryTab("changes")}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: "6px",
                      border: "none",
                      background: historyTab === "changes" ? "#121922" : "transparent",
                      color: historyTab === "changes" ? "#7C6CFF" : "#A5AFBC",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <span>⚡ Code Changes &amp; Commits</span>
                    <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", background: historyTab === "changes" ? "rgba(124, 108, 255, 0.15)" : "#0D1218", color: historyTab === "changes" ? "#A78BFA" : "#66717F" }}>
                      {codeChanges.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* SESSION 1: PROMPT HISTORY */}
              {historyTab === "prompts" && (
                <div>
                  <div style={{ padding: "0.85rem 1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.82rem", color: "#A5AFBC" }}>
                      Showing what users requested RYVIX AI to execute across repositories.
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                      Repository: <span style={{ color: "#F5F7FA" }}>{activeRepo?.full_name || selectedWebsite}</span>
                    </div>
                  </div>

                  {promptHistory.length === 0 ? (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💬</div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>No AI requests yet.</h4>
                      <p style={{ fontSize: "0.84rem", color: "#66717F", marginTop: "0.3rem" }}>
                        Submit your first prompt in the Overview tab to initiate autonomous changes.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {promptHistory.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: "1.25rem 1.5rem",
                            borderRadius: "12px",
                            background: "#0D1218",
                            border: "1px solid #1D2732",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.85rem",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                                <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(124, 108, 255, 0.15)", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontWeight: 700 }}>
                                  {item.taskId}
                                </span>
                                <span style={{ fontSize: "0.78rem", color: "#66717F" }}>
                                  {item.dateGroup} • {item.timestamp}
                                </span>
                                <span style={{ fontSize: "0.74rem", color: "#42D9FF", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                                  ✦ {item.repository}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.98rem", fontWeight: 600, color: "#F5F7FA", lineHeight: 1.4 }}>
                                &ldquo;{item.prompt}&rdquo;
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <button onClick={(e) => handleDeleteTask(item.id, e)} aria-label="Delete task from history" style={{ background: "none", border: "none", color: "#A5AFBC", cursor: "pointer" }}>Delete</button>
                              <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: item.status === "Completed" ? "rgba(69, 212, 131, 0.12)" : "rgba(245, 158, 11, 0.12)", color: item.status === "Completed" ? "#45D483" : "#F59E0B", border: `1px solid ${item.status === "Completed" ? "rgba(69, 212, 131, 0.3)" : "rgba(245, 158, 11, 0.3)"}`, fontWeight: 600 }}>
                                {item.status}
                              </span>
                              <button
                                onClick={() => {
                                  setHistoryTab("changes");
                                  setSelectedChangeId(item.id);
                                }}
                                style={{
                                  padding: "0.4rem 0.85rem",
                                  borderRadius: "6px",
                                  background: "rgba(124, 108, 255, 0.12)",
                                  border: "1px solid rgba(124, 108, 255, 0.3)",
                                  color: "#A78BFA",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
                                <span>View Changes</span>
                                <span>&rarr;</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SESSION 2: CODE CHANGES & COMMIT HISTORY */}
              {historyTab === "changes" && (
                <div>
                  <div style={{ padding: "0.85rem 1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.82rem", color: "#A5AFBC" }}>
                      GitHub-style commit audit &amp; code modifications with file-level diff highlights.
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                      Repository: <span style={{ color: "#F5F7FA" }}>{activeRepo?.full_name || selectedWebsite}</span>
                    </div>
                  </div>

                  {codeChanges.length === 0 ? (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚡</div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>No code changes yet.</h4>
                      <p style={{ fontSize: "0.84rem", color: "#66717F", marginTop: "0.3rem" }}>
                        Code commits and before/after diffs will populate here once AI tasks complete.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {codeChanges.map((change) => {
                        const isSelected = selectedChangeId === change.id;
                        const activeFile = change.filesChanged[selectedFileIndex] || change.filesChanged[0];

                        return (
                          <div
                            key={change.id}
                            style={{
                              borderRadius: "12px",
                              background: "#0D1218",
                              border: `1px solid ${isSelected ? "#7C6CFF" : "#1D2732"}`,
                              overflow: "hidden",
                              transition: "border-color 0.2s ease",
                            }}
                          >
                            {/* Commit Header Row */}
                            <div
                              onClick={() => setSelectedChangeId(isSelected ? null : change.id)}
                              style={{
                                padding: "1.15rem 1.35rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                background: isSelected ? "#121922" : "transparent",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                                <div style={{ marginTop: "2px", width: "28px", height: "28px", borderRadius: "6px", background: "rgba(124, 108, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C6CFF" }}>
                                  <IconGitCommit size={16} />
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                                    <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#42D9FF", fontWeight: 700 }}>
                                      {change.commitSha}
                                    </span>
                                    <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.45rem", borderRadius: "4px", background: "#080C11", border: "1px solid #1D2732", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                                      {change.branch}
                                    </span>
                                    <span style={{ fontSize: "0.78rem", color: "#66717F" }}>
                                      • {change.author} • {change.timestamp}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#F5F7FA", marginTop: "0.25rem" }}>
                                    {change.message}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", display: "flex", gap: "0.45rem" }}>
                                  <span style={{ color: "#A5AFBC" }}>{change.filesChanged.length} files</span>
                                  <span style={{ color: "#45D483" }}>+{change.additions}</span>
                                  <span style={{ color: "#F06A6A" }}>-{change.deletions}</span>
                                </div>
                                <span style={{ color: "#66717F", fontSize: "0.85rem" }}>
                                  {isSelected ? "▲" : "▼"}
                                </span>
                              </div>
                            </div>

                            {/* Detailed File Diff View */}
                            {isSelected && (
                              <div style={{ padding: "1.25rem", background: "#080C11", borderTop: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {/* Files Changed Navigation */}
                                <div>
                                  <div style={{ fontSize: "0.72rem", color: "#66717F", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                                    Changed Files ({change.filesChanged.length}):
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                    {change.filesChanged.map((file, idx) => (
                                      <button
                                        key={file.filename}
                                        onClick={() => setSelectedFileIndex(idx)}
                                        style={{
                                          padding: "0.4rem 0.75rem",
                                          borderRadius: "6px",
                                          border: `1px solid ${selectedFileIndex === idx ? "#7C6CFF" : "#1D2732"}`,
                                          background: selectedFileIndex === idx ? "rgba(124, 108, 255, 0.15)" : "#121922",
                                          color: selectedFileIndex === idx ? "#ffffff" : "#A5AFBC",
                                          fontSize: "0.78rem",
                                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.45rem",
                                        }}
                                      >
                                        <span>{file.filename}</span>
                                        <span style={{ fontSize: "0.68rem", color: "#45D483" }}>+{file.additions}</span>
                                        <span style={{ fontSize: "0.68rem", color: "#F06A6A" }}>-{file.deletions}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {!activeFile && <p>Diff not available.</p>}
                                {/* Active File Diff Box */}
                                {activeFile && (
                                  <div style={{ borderRadius: "8px", border: "1px solid #1D2732", overflow: "hidden", background: "#0D1218" }}>
                                    <div style={{ padding: "0.55rem 0.85rem", background: "#121922", borderBottom: "1px solid #1D2732", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#F5F7FA", fontWeight: 600 }}>
                                        {activeFile.filename}
                                      </span>
                                      <span style={{ fontSize: "0.72rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                                        Line-by-line Diff
                                      </span>
                                    </div>

                                    <pre style={{ padding: "1rem", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                                      {activeFile.diff || "Diff not available."}
                                    </pre>
                                  </div>
                                )}

                                {/* Bottom Quick Actions */}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" }}>
                                  <button
                                    onClick={() => setActiveTab("previews")}
                                    style={{
                                      padding: "0.5rem 1.1rem",
                                      borderRadius: "6px",
                                      background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                                      border: "none",
                                      color: "#ffffff",
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Open Preview Studio &rarr;
                                  </button>
                                  {customLiveUrl && (
                                    <a
                                      href={customLiveUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        padding: "0.5rem 1rem",
                                        borderRadius: "6px",
                                        background: "#121922",
                                        border: "1px solid #1D2732",
                                        color: "#A5AFBC",
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                      }}
                                    >
                                      <span>View Live Site</span>
                                      <span>↗</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

                    {/* Section 30: DEPLOYMENTS */}
          {activeTab === "deployments" && (
            <DeploymentOverview />
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
                    WEBSITE HEALTH &amp; TELEMETRY
                  </h2>
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button
                    onClick={handleRunProbe}
                    disabled={isProbing}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: "6px",
                      background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: isProbing ? "default" : "pointer",
                    }}
                  >
                    {isProbing ? "Probing..." : "⚡ Run Synthetic Probe"}
                  </button>
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
                    }}
                  >
                    {monitoringAdvanced ? "Hide Telemetry" : "Show Telemetry"}
                  </button>
                </div>
              </div>

              {probeResult && (
                <div style={{ padding: "0.85rem 1.15rem", borderRadius: "10px", background: "rgba(69, 212, 131, 0.1)", border: "1px solid rgba(69, 212, 131, 0.3)", color: "#45D483", fontSize: "0.84rem", fontWeight: 600, marginBottom: "1.25rem" }}>
                  {probeResult}
                </div>
              )}

              {/* Health Checks Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {healthList.map((h: any, idx: number) => (
                  <div key={h.id || idx} style={{ padding: "1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732" }}>
                    <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                      {h.source || "Target Probe"}
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#45D483", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#45D483" }} />
                      <span>{h.details?.latency != null ? `${h.details.latency}ms` : "Not available"}</span>
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#A5AFBC", marginTop: "0.2rem" }}>
                      {h.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Telemetry Metric Rollups */}
              <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ fontSize: "0.76rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase" }}>
                  Recent Cluster Rollup Telemetry
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
                  {liveMetrics.slice(0, 4).map((m: any, idx: number) => (
                    <div key={m.id || idx} style={{ padding: "0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732" }}>
                      <div style={{ fontSize: "0.65rem", color: "#66717F", textTransform: "uppercase" }}>CPU / RAM</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#42D9FF", marginTop: "2px" }}>
                        {m.cpu_avg}% / {m.ram_percent}%
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#66717F", marginTop: "2px" }}>
                        {m.ram_used_mb} MB RAM
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "incidents" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#45D483", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Resilience &amp; Autonomous Remediation
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    SYSTEM INCIDENTS
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.12)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {incidentsList.filter(i => !["resolved", "closed"].includes(i.status)).length} active incidents
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div style={{ padding: "2rem", borderRadius: "14px", background: "#0D1218", border: "1px solid #1D2732", textAlign: "center", marginBottom: "2rem" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                  <IconCheck size={26} color="#45D483" />
                </div>
                <h3 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.45rem", fontWeight: 700, color: "#F5F7FA", marginBottom: "0.4rem" }}>
                  {deployError ? "Incident status unavailable" : incidentsList.some((i) => !["resolved", "closed"].includes(i.status)) ? "Active incidents" : "Cluster Healthy"}
                </h3>
                <p style={{ color: "#A5AFBC", fontSize: "0.88rem", maxWidth: "480px", margin: "0 auto" }}>
                  {deployError ? "Monitoring data could not be loaded." : incidentsList.length === 0 ? "No incidents detected." : "Review the recorded incidents below."}
                </p>
              </div>

              {/* Incident History Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase" }}>
                    Incident History &amp; Evidence ({incidentsList.length} Records)
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#66717F" }}>Persisted incident records</span>
                </div>

                {incidentsList.length === 0 ? (
                  <div style={{ padding: "2rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732", textAlign: "center", color: "#66717F", fontSize: "0.85rem" }}>
                    {deployError ? "Incident data unavailable." : "No incidents detected."}
                  </div>
                ) : (
                  incidentsList.map((inc: any) => (
                    <div
                      key={inc.id}
                      style={{
                        padding: "1.25rem 1.4rem",
                        borderRadius: "12px",
                        background: "#0D1218",
                        border: "1px solid #1D2732",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "4px", background: inc.severity?.includes("P1") || inc.severity?.includes("P2") ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)", color: inc.severity?.includes("P1") || inc.severity?.includes("P2") ? "#EF4444" : "#F59E0B", fontWeight: 700, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                              {inc.severity || "P3_medium"}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                              {inc.incident_type || "service_anomaly"}
                            </span>
                          </div>
                          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F5F7FA", marginTop: "0.4rem" }}>
                            {inc.title}
                          </div>
                        </div>
                        <span style={{ padding: "0.2rem 0.65rem", borderRadius: "9999px", background: inc.status === "resolved" ? "rgba(69, 212, 131, 0.12)" : "rgba(245, 158, 11, 0.12)", color: inc.status === "resolved" ? "#45D483" : "#F59E0B", border: `1px solid ${inc.status === "resolved" ? "rgba(69, 212, 131, 0.3)" : "rgba(245, 158, 11, 0.3)"}`, fontSize: "0.74rem", fontWeight: 700 }}>
                          ● {inc.status?.toUpperCase() || "RESOLVED"}
                        </span>
                      </div>

                      {inc.ai_diagnosis && (
                        <div style={{ padding: "0.7rem 0.95rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", fontSize: "0.8rem", color: "#A5AFBC" }}>
                          <span style={{ color: "#42D9FF", fontWeight: 600, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>Autonomous Evidence: </span>
                          <span>{inc.ai_diagnosis}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#66717F", borderTop: "1px solid #141C25", paddingTop: "0.6rem" }}>
                        <div>
                          Logged: {new Date(inc.created_at).toLocaleString()}
                        </div>
                        {inc.resolved_at && (
                          <div style={{ color: "#45D483" }}>
                            Resolved in {Math.max(1, Math.round((new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime()) / 60000))} min
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Section 34: SECURITY */}
          {activeTab === "security" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#45D483", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Security &amp; Threat Defense
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                    RECORDED SECURITY EVENTS
                  </h2>
                </div>

                <button
                  onClick={() => router.push("/chat")}
                  style={{
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Inspect evidence in chat
                </button>
              </div>

              {/* Security Events List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {securityList.length === 0 ? (
                  <div style={{ padding: "3rem 2rem", textAlign: "center", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.12)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
                      <IconShield size={24} color="#45D483" />
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>{deployError ? "Security data unavailable." : "No security events detected."}</div>
                    <div style={{ fontSize: "0.84rem", color: "#A5AFBC", marginTop: "0.35rem", maxWidth: "440px", margin: "0.35rem auto 0 auto" }}>
                      Only recorded security events are shown here.
                    </div>
                  </div>
                ) : (
                  securityList.map((sec: any, idx: number) => (
                  <div key={sec.id || idx} style={{ padding: "1.25rem 1.5rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5F7FA" }}>{sec.message || sec.event_type}</span>
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: sec.severity === "critical" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)", color: sec.severity === "critical" ? "#EF4444" : "#F59E0B", fontWeight: 700, textTransform: "uppercase" }}>
                          {sec.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#66717F", marginTop: "3px", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                        Attacker IP: {sec.source_ip || "Not available"} • Time: {new Date(sec.detected_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.74rem", padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483", border: "1px solid rgba(69, 212, 131, 0.3)", fontWeight: 600 }}>
                      {sec.status}
                    </span>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Verifiable Activity Trail
                </div>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                  IMMUTABLE AUDIT PIPELINE
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#A5AFBC", marginTop: "0.25rem" }}>
                  Cryptographically verifiable execution chain from initial user prompt to production health check.
                </p>
              </div>

              {/* Real Audit Events Feed */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {liveLogs.filter((l) => l.type === "AUDIT").length === 0 ? (
                  <div style={{ padding: "3rem 2rem", textAlign: "center", background: "#0D1218", border: "1px solid #1D2732", borderRadius: "12px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(124, 108, 255, 0.12)", color: "#7C6CFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
                      <IconTerminal size={24} color="#7C6CFF" />
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>{deployError ? "Audit data unavailable." : "No audit activity yet."}</div>
                    <div style={{ fontSize: "0.84rem", color: "#A5AFBC", marginTop: "0.35rem", maxWidth: "440px", margin: "0.35rem auto 0 auto" }}>
                      Verifiable cryptographic activity trails will appear here automatically as you connect repositories and trigger autonomous workflows.
                    </div>
                  </div>
                ) : (
                  liveLogs.filter((l) => l.type === "AUDIT").map((item: any, idx: number) => (
                  <div key={item.id || idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderRadius: "10px", background: "#0D1218", border: "1px solid #1D2732" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700 }}>
                        ✓
                      </span>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F5F7FA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                          {item.details?.action || item.message}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "#A5AFBC", marginTop: "2px" }}>
                          {item.message}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", marginTop: "2px" }}>
                          Hash: {item.details?.hash || "Not available"} • Actor: {item.source}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "4px", background: "rgba(124, 108, 255, 0.12)", color: "#A78BFA", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontWeight: 600 }}>
                      RECORDED
                    </span>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "connections" && <ConnectionsPanel />}

          {activeTab === "settings" && (
            <div style={{ maxWidth: "960px", margin: "0 auto" }}>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Workspace Administration
                </div>
                <h2 style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", fontSize: "1.9rem", fontWeight: 700, color: "#F5F7FA" }}>
                  SETTINGS &amp; ACCESS KEYS
                </h2>
              </div>

              {settingsSaveMsg && (
                <div style={{ padding: "0.85rem 1.15rem", borderRadius: "10px", background: "rgba(69, 212, 131, 0.12)", border: "1px solid rgba(69, 212, 131, 0.3)", color: "#45D483", fontSize: "0.82rem", fontWeight: 600, marginBottom: "1.25rem" }}>
                  {settingsSaveMsg}
                </div>
              )}

              {newKeyGenerated && (
                <div style={{ padding: "1.25rem", borderRadius: "10px", background: "rgba(124, 108, 255, 0.15)", border: "1px solid #7C6CFF", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.4rem" }}>
                    ⚡ New Secret API Key Generated (Copy now, will not be shown again):
                  </div>
                  <div style={{ padding: "0.6rem 0.85rem", borderRadius: "6px", background: "#080C11", color: "#42D9FF", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.82rem", wordBreak: "break-all" }}>
                    {newKeyGenerated}
                  </div>
                </div>
              )}

              {/* Organization Profile Card */}
              <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>Organization Profile</h4>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    style={{ flex: 1, padding: "0.6rem 0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", color: "#F5F7FA", fontSize: "0.85rem", outline: "none" }}
                  />
                  <button
                    onClick={() => handleSaveOrgSettings(orgName)}
                    disabled={isSavingSettings}
                    style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", background: "linear-gradient(135deg, #7C6CFF, #42D9FF)", border: "none", color: "#ffffff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    {isSavingSettings ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              {/* Multi-Tenant Cryptographic API Keys */}
              <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>Active API Access Keys</h4>
                  <p>Read server inventory with <code>GET /api/v1/servers</code> and <code>Authorization: Bearer YOUR_KEY</code>. New keys have read scope; team, release and server mutations require signed-in approval workflows.</p>
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={isSavingSettings||!['owner','admin'].includes(settingsData?.currentRole)}
                    style={{ padding: "0.45rem 0.95rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", color: "#42D9FF", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    + Generate New Key
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {(settingsData?.apiKeys || []).map((k: any) => (
                    <div key={k.id} style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#F5F7FA" }}>{k.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", marginTop: "2px" }}>
                          Prefix: {k.key_prefix}... • Scopes: {Array.isArray(k.scopes) ? k.scopes.join(", ") : "all"}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", borderRadius: "9999px", background: "rgba(69, 212, 131, 0.1)", color: "#45D483" }}>
                        ACTIVE
                      </span>
                      {['owner','admin'].includes(settingsData?.currentRole)&&<button disabled={isSavingSettings} onClick={()=>void handleRevokeApiKey(k.id,k.name)}>Revoke {k.name}</button>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Organization Team Members */}
              <div style={{ padding: "1.5rem", borderRadius: "12px", background: "#0D1218", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#F5F7FA" }}>Team Members</h4>
                <Link href="/team">Invite members, manage roles and organizations</Link>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(settingsData?.members || []).map((m: any) => (
                    <div key={m.id} style={{ padding: "0.65rem 0.85rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#F5F7FA" }}>{m.full_name || "Team Member"}</div>
                        <div style={{ fontSize: "0.74rem", color: "#A5AFBC" }}>{m.email}</div>
                      </div>
                      <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", borderRadius: "4px", background: "rgba(124, 108, 255, 0.12)", color: "#A78BFA", fontWeight: 600, textTransform: "capitalize" }}>
                        {m.role || "Member"}
                      </span>
                    </div>
                  ))}
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
                Create a pull request?
              </h3>
            </div>
            <p style={{ fontSize: "0.86rem", color: "#A5AFBC", lineHeight: 1.5 }}>
              The reviewed task changes will be submitted as a GitHub pull request. Merge approval, customer CI/CD and runtime verification are separate steps.
            </p>
            <div style={{ padding: "1rem", borderRadius: "8px", background: "#121922", border: "1px solid #1D2732", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem", color: "#F5F7FA" }}>
              <div>Submit the selected task&apos;s recorded changes for review.</div>
              <div>Build and regression checks depend on the repository&apos;s configured CI.</div>
              <div>Deployment and runtime verification follow the repository&apos;s release workflow.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button onClick={() => setShowApprovalModal(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", background: "transparent", border: "1px solid #1D2732", color: "#A5AFBC", fontSize: "0.85rem", cursor: "pointer" }}>
                Go Back
              </button>
              <button onClick={handleApproveDeployment} style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)", border: "none", color: "#05070A", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
                Create Pull Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Selected URL Toast Notification (Section 9, 10, 17) */}
      {projectToast?.visible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 9999,
            minWidth: "320px",
            maxWidth: "420px",
            background: "#0D1218",
            border: "1px solid rgba(124, 108, 255, 0.45)",
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.85), 0 0 25px rgba(124, 108, 255, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#45D483", fontSize: "0.95rem", fontWeight: 800 }}>✓</span>
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#45D483", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Project Selected
              </span>
            </div>
            <button
              onClick={() => setProjectToast(null)}
              style={{ background: "none", border: "none", color: "#66717F", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>
            {projectToast.projectName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#66717F", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
            {projectToast.repoFullName}
          </div>
          <div style={{ marginTop: "0.35rem", padding: "0.55rem 0.8rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#A5AFBC" }}>Live Website:</span>
            {projectToast.liveUrl ? (
              <span style={{ color: "#42D9FF", fontWeight: 600, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {projectToast.liveUrl}
              </span>
            ) : (
              <span style={{ color: "#F59E0B", fontWeight: 600, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                Not configured
              </span>
            )}
          </div>
        </div>
      )}

      {/* Connect Repository Modal */}
      <ConnectRepositoryModal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        onConnected={(repo) => {
          setConnectedRepos((prev) => {
            const exists = prev.some((r) => (r.full_name || r.name) === (repo.full_name || repo.name));
            const updated = exists ? prev : [repo, ...prev];
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("ryvix_connected_repos", JSON.stringify(updated));
              } catch {}
            }
            return updated;
          });
          setGithubConnected(true);
          handleSelectRepository(repo);
          setShowRepoModal(false);
        }}
        onOpenServerConnect={() => {
          setShowRepoModal(false);
          setShowServerModal(true);
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

      {/* Setup Live URL Modal (Prompt 3 & 4) */}
      <SetupLiveUrlModal
        error={liveUrlError}
        saving={liveUrlSaving}
        isOpen={showLiveUrlModal}
        onClose={() => setShowLiveUrlModal(false)}
        repoName={activeRepo?.full_name || selectedWebsite || "Selected Repository"}
        initialUrl={liveUrlInput || customLiveUrl || ""}
        onSave={(url) => handleSaveLiveUrl(url)}
        onSkip={handleSkipLiveUrl}
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
        <div className="desktop-only" style={{ fontSize: "0.62rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#66717F", fontWeight: 700, padding: "0.2rem 0.65rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
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
              {!collapsed && <span className="dashboard-sidebar-label">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="dashboard-sidebar-badge" style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: "#121922", color: "#66717F" }}>
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
  orgName = "Workspace",
  repoName = "Production Website",
  branch = "main",
  commitSha = "Not recorded",
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
  previewState = "none",
  onConnectRepo,
  onAddWebsite,
  onConfigureUrl,
  taskSteps,
  activeTask,
}: {
  orgName?: string;
  repoName?: string;
  branch?: string;
  commitSha?: string;
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
  previewState?: string;
  onConnectRepo?: () => void;
  onAddWebsite?: () => void;
  onConfigureUrl?: () => void;
  taskSteps?: any[];
  activeTask?: any;
}) {
  const hasPreview = Boolean(activePreviewUrl || activeLiveUrl);
  const hasPendingChanges = previewState === "preview_ready";
  return (
    <>
      {activeTask && <TaskCheckTimeline events={activeTask.pipeline} status={activeTask.status} unavailable={activeTask.pipelineUnavailable} truncated={activeTask.pipelineTruncated}/>}
      <div style={{ padding: "0.65rem 1rem", background: "#080C11", borderBottom: "1px solid #1D2732", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F06A6A" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E8B85C" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#45D483" }} />
        </div>

        <div style={{ flex: 1, maxWidth: "580px", display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.32rem 0.85rem", borderRadius: "6px", background: "#121922", border: "1px solid #1D2732", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: "0.74rem" }}>
          <IconLock size={12} color="#45D483" />
          <span style={{ padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(124, 108, 255, 0.2)", color: "#A78BFA", fontSize: "0.65rem", fontWeight: 700 }}>
            PREVIEW
          </span>
          <span style={{ color: "#42D9FF", fontSize: "0.72rem", fontWeight: 600 }}>
            {repoName}
          </span>
          <span style={{ color: "#66717F" }}>|</span>
          <span style={{ color: "#A5AFBC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activePreviewUrl || activeLiveUrl || "No preview URL active"}
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
              Before (Live)
            </button>
            <button onClick={() => { setComparisonMode("toggle"); setIsShowingAfter(true); }} style={{ padding: "0.25rem 0.75rem", borderRadius: "4px", border: "none", background: comparisonMode === "toggle" && isShowingAfter ? "linear-gradient(135deg, #7C6CFF, #42D9FF)" : "transparent", color: comparisonMode === "toggle" && isShowingAfter ? "#ffffff" : "#66717F", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
              After (AI Preview)
            </button>
          </div>
          <button onClick={() => setComparisonMode(comparisonMode === "slider" ? "toggle" : "slider")} style={{ padding: "0.25rem 0.65rem", borderRadius: "6px", background: comparisonMode === "slider" ? "rgba(124, 108, 255, 0.15)" : "transparent", border: `1px solid ${comparisonMode === "slider" ? "#7C6CFF" : "#1D2732"}`, color: comparisonMode === "slider" ? "#A78BFA" : "#A5AFBC", fontSize: "0.74rem", cursor: "pointer" }}>
            {comparisonMode === "slider" ? "Disable Split Slider" : "Interactive Split Slider"}
          </button>
        </div>

        <div style={{ fontSize: "0.74rem", color: "#A5AFBC", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ color: "#E8B85C" }}>●</span>
          <span style={{ color: "#F5F7FA", fontWeight: 500 }}>Live website will not update until you approve.</span>
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
                <RealLiveWebsiteFrame liveUrl={activeLiveUrl} repoName={repoName} onConfigureUrl={onConfigureUrl} />
              </div>
              <div style={{ position: "absolute", inset: 0, width: `${sliderPos}%`, overflow: "hidden", borderRight: "2px solid #7C6CFF", boxShadow: "2px 0 15px rgba(124, 108, 255, 0.5)", background: "#080C11" }}>
                <div style={{ width: sliderRef.current?.clientWidth || "100%", minHeight: "580px" }}>
                  <RealPreviewWebsiteFrame key={`${activeTask?.id || ""}:${activeTask?.status || ""}:${activeTask?.updated_at || ""}:${commitSha}`} previewUrl={activePreviewUrl} repoName={repoName} branch={branch} commitSha={commitSha} />
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
            <div>
              {isShowingAfter ? (
                <RealPreviewWebsiteFrame key={`${activeTask?.id || ""}:${activeTask?.status || ""}:${activeTask?.updated_at || ""}:${commitSha}`} previewUrl={activePreviewUrl} repoName={repoName} branch={branch} commitSha={commitSha} />
              ) : (
                <RealLiveWebsiteFrame liveUrl={activeLiveUrl} repoName={repoName} onConfigureUrl={onConfigureUrl} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 28 & 29: CHANGE DETAILS & CLEAR APPROVAL */}
      <div style={{ padding: "0.95rem 1.25rem", background: "#080C11", borderTop: "1px solid #1D2732", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", color: "#7C6CFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            WHAT RYVIX CHANGED
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.85rem", marginTop: "0.25rem", fontSize: "0.78rem", color: "#F5F7FA" }}>
            {taskSteps && taskSteps.length > 0 ? (
              taskSteps.slice(0, 4).map((s: any, idx: number) => (
                <span key={s.id || idx}>{s.title} ({s.status || "Status not recorded"})</span>
              ))
            ) : (
              <span>Task verification details have not been recorded.</span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#A5AFBC", marginTop: "0.2rem" }}>
            <span style={{ color: "#42D9FF", fontWeight: 600 }}>
              {Array.isArray(activeTask?.result?.files) ? `${activeTask.result.files.length} files recorded` : "Changed file count not recorded"}
            </span> · <span>Branch: {branch}</span> · <span style={{ color: "#A78BFA" }}>Commit: {commitSha}</span> · <span style={{ color: "#66717F" }}>A pull request does not deploy the live site.</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button onClick={onReject} style={{ padding: "0.6rem 1rem", borderRadius: "8px", background: "transparent", border: "1px solid #1D2732", color: "#A5AFBC", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer" }}>
            Reject Changes
          </button>
          <button onClick={onApprove} style={{ padding: "0.6rem 1.35rem", borderRadius: "8px", background: "linear-gradient(135deg, #45D483 0%, #10b981 100%)", border: "none", color: "#05070A", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 18px rgba(69, 212, 131, 0.4)" }}>
            Create Pull Request &rarr;
          </button>
        </div>
      </div>
    </>
  );
}

function RealLiveWebsiteFrame({
  liveUrl,
  repoName,
  onConfigureUrl,
}: {
  liveUrl?: string | null;
  repoName: string;
  onConfigureUrl?: () => void;
}) {
  const [iframeError, setIframeError] = useState(false);

  if (!liveUrl) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "580px",
          height: "100%",
          padding: "3rem 2rem",
          textAlign: "center",
          background: "#080C11",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.2rem",
          }}
        >
          <IconGlobe size={28} color="#F59E0B" />
        </div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FA" }}>
          Live Website Not Configured
        </h3>
        <p style={{ fontSize: "0.86rem", color: "#A5AFBC", maxWidth: "420px", marginTop: "0.4rem", lineHeight: 1.5 }}>
          Add the deployed URL for repository <span style={{ color: "#42D9FF" }}>{repoName}</span> to preview your current live production website side-by-side with AI changes.
        </p>
        {onConfigureUrl && (
          <button
            onClick={onConfigureUrl}
            style={{
              marginTop: "1.25rem",
              padding: "0.65rem 1.4rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7C6CFF, #42D9FF)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Add Deployed URL
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "580px", background: "#080C11", display: "flex", flexDirection: "column" }}>
      {/* Top Banner identifying Live Production URL */}
      <div
        style={{
          padding: "0.45rem 1rem",
          background: "rgba(18, 25, 34, 0.95)",
          borderBottom: "1px solid #1D2732",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.74rem",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(69, 212, 131, 0.15)", color: "#45D483", fontWeight: 700 }}>
            BEFORE
          </span>
          <span style={{ color: "#A5AFBC" }}>Current Production:</span>
          <span style={{ color: "#F5F7FA", fontWeight: 600 }}>{liveUrl}</span>
        </div>
        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#42D9FF", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
        >
          <span>Open Live Site</span>
          <IconExternalLink size={12} color="#42D9FF" />
        </a>
      </div>

      {/* Embedded Live Site Frame */}
      <div style={{ flex: 1, position: "relative", background: "#ffffff" }}>
        <iframe
          src={liveUrl || undefined}
          title={`Live Website - ${repoName}`}
          onError={() => setIframeError(true)}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "540px",
            border: "none",
            display: "block",
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
        {iframeError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#0D1218",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F5F7FA" }}>
              Unable to embed live website
            </div>
            <p style={{ fontSize: "0.82rem", color: "#A5AFBC", maxWidth: "380px", marginTop: "0.4rem" }}>
              The site at {liveUrl} restricts iframe embedding via CSP or X-Frame-Options headers.
            </p>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                marginTop: "1rem",
                padding: "0.55rem 1.2rem",
                borderRadius: "6px",
                background: "#121922",
                border: "1px solid #1D2732",
                color: "#42D9FF",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open in New Window ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function RealPreviewWebsiteFrame({
  previewUrl,
  repoName,
  branch,
  commitSha,
  isBuilding,
}: {
  previewUrl: string;
  repoName: string;
  branch: string;
  commitSha: string;
  isBuilding?: boolean;
}) {
  const [reload, setReload] = useState(0);
  if (isBuilding) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "580px",
          height: "100%",
          padding: "3rem 2rem",
          textAlign: "center",
          background: "#080C11",
        }}
      >
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #1D2732", borderTopColor: "#42D9FF", animation: "spin 1s linear infinite", marginBottom: "1.2rem" }} />
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FA" }}>
          Building your actual project...
        </h3>
        <p style={{ fontSize: "0.86rem", color: "#A5AFBC", maxWidth: "420px", marginTop: "0.4rem", lineHeight: 1.5 }}>
          Compiling modified source code for <span style={{ color: "#42D9FF" }}>{repoName}</span> on branch <span style={{ color: "#A78BFA" }}>{branch}</span>. The preview will appear when the build completes.
        </p>
      </div>
    );
  }

  if (!previewUrl.trim()) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "580px",
          height: "100%",
          padding: "3rem 2rem",
          textAlign: "center",
          background: "#080C11",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(124, 108, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.2rem",
          }}
        >
          <IconSparkles size={28} color="#A78BFA" />
        </div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FA" }}>
          No AI Preview Available
        </h3>
        <p style={{ fontSize: "0.86rem", color: "#A5AFBC", maxWidth: "420px", marginTop: "0.4rem", lineHeight: 1.5 }}>
          No active sandbox preview is available for <span style={{ color: "#42D9FF" }}>{repoName}</span>. Run a coding task and check its build status. A preview appears only when the preview server starts successfully; completed code changes alone do not guarantee a preview.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "580px", background: "#080C11", display: "flex", flexDirection: "column" }}>
      {/* Top Banner identifying Preview URL and Repository Metadata */}
      <div
        style={{
          padding: "0.45rem 1rem",
          background: "rgba(18, 25, 34, 0.95)",
          borderBottom: "1px solid #1D2732",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.74rem",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(124, 108, 255, 0.2)", color: "#A78BFA", fontWeight: 700 }}>
            AFTER (AI PREVIEW)
          </span>
          <span style={{ color: "#A5AFBC" }}>Repo:</span>
          <span style={{ color: "#42D9FF", fontWeight: 600 }}>{repoName}</span>
          <span style={{ color: "#66717F" }}>•</span>
          <span style={{ color: "#A78BFA" }}>branch: {branch}</span>
          <span style={{ color: "#66717F" }}>•</span>
          <span style={{ color: "#66717F" }}>commit: {commitSha}</span>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#45D483", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
        >
          <span>Open Preview</span>
          <IconExternalLink size={12} color="#45D483" />
        </a>
      </div>

      <button type="button" onClick={() => setReload(value => value + 1)} className="btn-secondary">Reload preview</button>

      {/* Embedded Real Preview Frame */}
      <div style={{ flex: 1, position: "relative", background: "#ffffff" }}>
        <iframe
          key={`${previewUrl}:${commitSha}:${reload}`}
          src={previewUrl || undefined}
          title={`Sandboxed Preview - ${repoName}`}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "540px",
            border: "none",
            display: "block",
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

function SetupLiveUrlModal({
  error,
  saving,
  isOpen,
  onClose,
  repoName,
  initialUrl,
  onSave,
  onSkip,
}: {
  error: string | null;
  saving: boolean;
  isOpen: boolean;
  onClose: () => void;
  repoName: string;
  initialUrl: string;
  onSave: (url: string) => void;
  onSkip: () => void;
}) {
  const [val, setVal] = useState(initialUrl);

  useEffect(() => {
    setVal(initialUrl);
  }, [initialUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 7, 10, 0.88)",
        backdropFilter: "blur(14px)",
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
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
            <h3
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#F5F7FA",
              }}
            >
              What&apos;s the deployed website URL?
            </h3>
            <p style={{ fontSize: "0.76rem", color: "#A5AFBC", marginTop: "2px" }}>
              Configure your live production domain for this repository.
            </p>
          </div>
        </div>

        {/* Selected Repo Card */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            background: "#121922",
            border: "1px solid #1D2732",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div style={{ fontSize: "0.68rem", color: "#66717F", textTransform: "uppercase", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
            GitHub Repository
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#42D9FF" }}>
            {repoName}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#A5AFBC", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
            github.com/{repoName}
          </div>
        </div>

        {error && <p role="alert" style={{color:"#EF4444"}}>{error}</p>}
        {saving && <p role="status">Saving website URL…</p>}
        {/* Input Field */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "#F5F7FA",
              marginBottom: "0.4rem",
            }}
          >
            Your deployed website
          </label>
          <input
            type="url"
            placeholder="https://myecommerce.com"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSave(val);
              }
            }}
            autoFocus
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "#121922",
              border: "1px solid #1D2732",
              color: "#F5F7FA",
              fontSize: "0.88rem",
              outline: "none",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          />
          <div style={{ fontSize: "0.7rem", color: "#66717F", marginTop: "0.35rem" }}>
            This URL belongs specifically to this project. We will never invent or replace it.
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              padding: "0.7rem",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid #1D2732",
              color: "#A5AFBC",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(val)}
            style={{
              flex: 1.4,
              padding: "0.7rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7C6CFF 0%, #42D9FF 100%)",
              border: "none",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(124, 108, 255, 0.4)",
            }}
          >
            Save &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
