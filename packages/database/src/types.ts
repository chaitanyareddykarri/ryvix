// ==============================================================================
// RYVIX COMPLETE PRODUCTION DATABASE TYPE DEFINITIONS
// Canonical source of truth synchronized with:
// - 20260921000001_phase1_core_schema.sql
// - 20260921000002_complete_platform_schema.sql
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ------------------------------------------------------------------------------
// Enums & Lifecycle State Machines
// ------------------------------------------------------------------------------

export type Role = 'owner' | 'admin' | 'developer' | 'viewer';

export type TaskChannel = 'web' | 'whatsapp' | 'gmail';

export type TaskType =
  | 'coding'
  | 'investigation'
  | 'operational'
  | 'recovery'
  | 'preview';

export type TaskStatus =
  | 'queued'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PlanStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ConnectorType =
  | 'server_inband'
  | 'server_cloud'
  | 'whatsapp'
  | 'gmail'
  | 'github';

export type ConnectorStatus =
  | 'enrolling'
  | 'active'
  | 'offline'
  | 'degraded'
  | 'revoked';

export type ServerStatus =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'unreachable';

export type ServiceUnitType = 'systemd' | 'docker_container' | 'process';

export type HealthCheckType = 'http' | 'tcp' | 'icmp';

export type HealthCheckStatus = 'healthy' | 'degraded' | 'failing';

export type ModelProviderType = 'huggingface' | 'openai' | 'anthropic' | 'vllm';

export type StackProfileType =
  | 'node'
  | 'python'
  | 'dotnet'
  | 'rust'
  | 'go'
  | 'flutter';

export type WorkspaceSessionStatus =
  | 'provisioning'
  | 'active'
  | 'executing'
  | 'terminating'
  | 'destroyed';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type IncidentSeverity = 'P1_critical' | 'P2_high' | 'P3_medium' | 'P4_low';

export type IncidentStatus =
  | 'open'
  | 'diagnosing'
  | 'recovering'
  | 'resolved'
  | 'escalated';

export type RecoveryPlanStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'verified'
  | 'failed';

export type ActorType = 'user' | 'ai' | 'system';

export type ApprovalResourceType = 'plan_step' | 'recovery_plan' | 'deployment';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type NotificationType =
  | 'approval_required'
  | 'incident_alert'
  | 'task_completed';

// ------------------------------------------------------------------------------
// Domain Entity Interfaces
// ------------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string; // references auth.users
  organization_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null; // for WhatsApp alerts
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  hashed_secret: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  environment?: string; // Phase 1 compatibility
  metadata?: Record<string, unknown>; // Phase 1 compatibility
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  is_production: boolean;
  env_variables_encrypted: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface RepositoryInstallation {
  id: string;
  organization_id: string;
  installation_id: number;
  account_login: string;
  account_type: 'User' | 'Organization';
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  project_id: string;
  installation_id: string | null;
  github_repo_id: number;
  full_name: string;
  default_branch: string;
  clone_url: string;
  is_private: boolean;
  detected_stack: string[];
  build_command: string | null;
  test_command: string | null;
  created_at: string;
  updated_at: string;
}

export interface PullRequest {
  id: string;
  repository_id: string;
  task_id: string | null;
  pr_number: number;
  branch_name: string;
  title: string;
  status: 'open' | 'merged' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface Connector {
  id: string;
  environment_id: string;
  name: string;
  connector_type: ConnectorType;
  status: ConnectorStatus;
  agent_version: string | null;
  public_key_fingerprint: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorCredential {
  id: string;
  connector_id: string;
  credential_type: 'oauth_token' | 'ssh_key' | 'cloud_secret' | 'webhook_secret';
  vault_secret_ref: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorCapability {
  id: string;
  connector_id: string;
  capability_name: string;
  is_enabled: boolean;
  rate_limit_per_minute: number;
  created_at: string;
}

export interface ConnectorCommand {
  id: string;
  connector_id: string;
  command_name: string;
  parameters_hash: string;
  payload_encrypted: string | null;
  status: 'dispatched' | 'acknowledged' | 'running' | 'completed' | 'failed' | 'timeout';
  stdout_summary: string | null;
  exit_code: number | null;
  dispatched_at: string;
  completed_at: string | null;
}

export interface Server {
  id: string;
  environment_id: string;
  connector_id: string | null;
  hostname: string;
  ip_address: string | null;
  os_type: string;
  kernel_version: string | null;
  cpu_cores: number | null;
  ram_mb: number | null;
  disk_gb: number | null;
  cloud_provider: 'aws' | 'gcp' | 'digitalocean' | 'baremetal' | 'other' | null;
  cloud_instance_id: string | null;
  status: ServerStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceInventory {
  id: string;
  server_id: string;
  service_name: string;
  unit_type: ServiceUnitType;
  status: 'active' | 'failed' | 'inactive' | 'restarting';
  port: number | null;
  pid: number | null;
  cpu_percent: number | null;
  memory_mb: number | null;
  last_seen_at: string;
}

export interface TelemetryMetricRollup {
  id: string;
  server_id: string;
  bucket_timestamp: string;
  cpu_avg: number;
  cpu_max: number;
  ram_used_mb: number;
  ram_percent: number;
  disk_used_percent: number;
  iops_read: number;
  iops_write: number;
  net_rx_kb: number;
  net_tx_kb: number;
}

export interface HealthCheck {
  id: string;
  environment_id: string;
  name: string;
  check_type: HealthCheckType;
  target_url_or_ip: string;
  interval_seconds: number;
  status: HealthCheckStatus;
  last_latency_ms: number | null;
  consecutive_failures: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  provider_type: ModelProviderType;
  api_base_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiModelRun {
  id: string;
  task_id: string;
  model_provider_id: string | null;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  cost_usd: number;
  prompt_hash: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  created_by: string;
  channel: TaskChannel;
  task_type: TaskType;
  status: TaskStatus;
  user_prompt: string;
  active_plan_id: string | null;
  summary: string | null;
  error_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanStep {
  id?: string;
  plan_id?: string;
  step_number: number;
  title: string;
  description: string;
  suggested_tool?: string;
  tool_arguments?: Record<string, unknown>;
  requires_approval: boolean;
  status: PlanStepStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Plan {
  id: string;
  task_id: string;
  version: number;
  title?: string;
  steps?: PlanStep[]; // Phase 1 compatibility JSONB
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  status?: string;
  created_at: string;
}

export interface ToolCall {
  id: string;
  task_id: string;
  step_id: string | null;
  tool_name: string;
  parameters_hash: string;
  parameters_sanitized: Record<string, unknown>;
  result_summary: string | null;
  exit_code: number;
  duration_ms: number;
  status: 'success' | 'failure' | 'rejected';
  created_at: string;
}

export interface WorkspaceProfile {
  id: string;
  name: string;
  stack_type: StackProfileType;
  base_image: string;
  package_manager: string;
  build_command: string;
  test_command: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSession {
  id: string;
  task_id: string;
  project_id: string;
  profile_id: string | null;
  container_id: string;
  status: WorkspaceSessionStatus;
  preview_url: string | null;
  preview_port: number | null;
  allocated_cpu: number;
  allocated_ram_mb: number;
  workspace_path?: string;
  created_at: string;
  expires_at: string;
}

export interface BuildRun {
  id: string;
  workspace_session_id: string;
  commit_hash: string | null;
  status: 'running' | 'success' | 'failed';
  stdout_summary: string | null;
  stderr_summary: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface TestRun {
  id: string;
  workspace_session_id: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  status: 'passed' | 'failed' | 'running';
  created_at: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  rule_type: string;
  threshold_value: number;
  time_window_seconds: number;
  conditions?: Record<string, unknown>;
  severity: SeverityLevel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecurityEvent {
  id: string;
  server_id: string;
  rule_id: string | null;
  event_type: string;
  severity: SeverityLevel;
  source_ip: string | null;
  raw_evidence: Record<string, unknown>;
  status: 'detected' | 'investigating' | 'contained' | 'dismissed';
  detected_at: string;
}

export interface Incident {
  id: string;
  environment_id: string;
  server_id: string | null;
  title: string;
  incident_type: 'service_crash' | 'resource_exhaustion' | 'unreachable_host' | 'security_attack';
  severity: IncidentSeverity;
  status: IncidentStatus;
  ai_diagnosis: string | null;
  root_cause: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface RecoveryPlan {
  id: string;
  incident_id: string;
  action_level: 0 | 1 | 2 | 3;
  action_name: string;
  parameters: Record<string, unknown>;
  requires_human_approval: boolean;
  status: RecoveryPlanStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface RecoveryRun {
  id: string;
  recovery_plan_id: string;
  server_id: string;
  action_name: string;
  attempt_number: number; // 1 to 3
  status: 'executing' | 'verified' | 'failed';
  verification_result: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  resource_type: ApprovalResourceType;
  resource_id: string;
  title: string;
  description: string;
  risk_level: SeverityLevel;
  status: ApprovalStatus;
  decided_by: string | null;
  rejection_reason: string | null;
  expires_at: string;
  created_at: string;
  decided_at: string | null;
}

export interface Notification {
  id: string;
  organization_id: string;
  recipient_id: string;
  channel: TaskChannel;
  notification_type: NotificationType;
  title: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  external_message_id: string | null;
  idempotency_key?: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  organization_id?: string;
  project_id: string;
  actor_id: string;
  actor_type: ActorType;
  action_name: string;
  target_entity?: string;
  target_id?: string;
  parameters_hash: string;
  diff_summary: string | null;
  status: 'success' | 'failure' | 'rejected';
  ip_address: string | null;
  correlation_id?: string;
}
