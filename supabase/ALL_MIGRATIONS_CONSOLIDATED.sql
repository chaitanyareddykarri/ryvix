-- ==============================================================================
-- RYVIX MASTER CONSOLIDATED DATABASE MIGRATION (PHASES 1, 2, & 3)
-- Run this entire script in Supabase Dashboard -> SQL Editor
-- Target Project: https://supabase.com/dashboard/project/tsoyrpgifovzwqtgpkkb/sql
-- ==============================================================================


-- ==============================================================================
-- START MIGRATION: 20260921000001_phase1_core_schema.sql
-- ==============================================================================

-- ==============================================================================
-- RYVIX PHASE 1 CORE DATABASE SCHEMA
-- Authoritative Source of Truth: Version-controlled PostgreSQL Migration
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Organizations & Profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    full_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')) DEFAULT 'developer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Projects
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('production', 'staging', 'development')) DEFAULT 'development',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

-- ------------------------------------------------------------------------------
-- 3. Tasks & Plans
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp', 'gmail')) DEFAULT 'web',
    task_type TEXT NOT NULL CHECK (task_type IN ('coding', 'investigation', 'operational', 'recovery', 'preview')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'planning', 'awaiting_approval', 'executing', 'verifying', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    user_prompt TEXT NOT NULL,
    active_plan_id UUID,
    summary TEXT,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key back to active_plan_id
ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS fk_active_plan,
    ADD CONSTRAINT fk_active_plan FOREIGN KEY (active_plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 4. Immutable Audit Ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'ai', 'system')),
    action_name TEXT NOT NULL,
    parameters_hash TEXT NOT NULL,
    diff_summary TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'rejected')),
    ip_address INET
);

-- Revoke UPDATE and DELETE on audit_events to guarantee immutability
REVOKE UPDATE, DELETE ON public.audit_events FROM PUBLIC, authenticated, anon;

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Organization policy: members can view their organization
CREATE POLICY "org_members_view" ON public.organizations
    FOR SELECT TO authenticated
    USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_owner_update" ON public.organizations
    FOR UPDATE TO authenticated
    USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Profile policy: users can view profiles in their organization
CREATE POLICY "profile_view_org" ON public.profiles
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "profile_update_self" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- Projects policy: users can view and manage projects in their organization
CREATE POLICY "project_org_isolation" ON public.projects
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Tasks policy: project-scoped access
CREATE POLICY "task_project_isolation" ON public.tasks
    FOR ALL TO authenticated
    USING (project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Plans policy: task-scoped access
CREATE POLICY "plan_project_isolation" ON public.plans
    FOR ALL TO authenticated
    USING (task_id IN (
        SELECT t.id FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Audit Events policy: viewable by organization members; insert allowed for authenticated/backend
CREATE POLICY "audit_view_org" ON public.audit_events
    FOR SELECT TO authenticated
    USING (project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

CREATE POLICY "audit_insert_authorized" ON public.audit_events
    FOR INSERT TO authenticated
    WITH CHECK (project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- ------------------------------------------------------------------------------
-- 6. Performance Indexes (Foreign Keys & Multi-Tenant Lookups)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_plans_task_id ON public.plans(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_project_id ON public.audit_events(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON public.audit_events(timestamp DESC);

-- ------------------------------------------------------------------------------
-- 7. Automatic updated_at Trigger Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_organizations ON public.organizations;
CREATE TRIGGER trigger_set_updated_at_organizations
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_profiles ON public.profiles;
CREATE TRIGGER trigger_set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_projects ON public.projects;
CREATE TRIGGER trigger_set_updated_at_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_tasks ON public.tasks;
CREATE TRIGGER trigger_set_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Automatic Profile & Organization Provisioning for Supabase Auth (Email OTP)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
    clean_name TEXT;
BEGIN
    clean_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    -- 1. Create a default personal organization
    INSERT INTO public.organizations (name, slug)
    VALUES (
        clean_name || '''s Workspace',
        'org-' || SUBSTRING(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;

    -- 2. Create profile with 'owner' role in the new organization
    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (
        NEW.id,
        new_org_id,
        clean_name,
        'owner'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- ==============================================================================
-- START MIGRATION: 20260921000002_complete_platform_schema.sql
-- ==============================================================================

-- ==============================================================================
-- RYVIX COMPLETE PRODUCTION-GRADE DATABASE SCHEMA (PHASE 2 EXTENSION)
-- Authoritative Source of Truth: Complete Distributed Operations & Platform Schema
-- Builds on 20260921000001_phase1_core_schema.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Identity, Team Access & API Keys
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')) DEFAULT 'developer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- e.g. "ryv_live_"
    hashed_secret TEXT NOT NULL UNIQUE, -- SHA-256 hash of secret token
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write'],
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Environments (Dev / Staging / Production)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "production", "staging"
    slug TEXT NOT NULL,
    is_production BOOLEAN NOT NULL DEFAULT false,
    env_variables_encrypted JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, slug)
);

-- ------------------------------------------------------------------------------
-- 3. Repositories & GitHub Integration
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repository_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    installation_id BIGINT NOT NULL UNIQUE,
    account_login TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('User', 'Organization')),
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    installation_id UUID REFERENCES public.repository_installations(id) ON DELETE SET NULL,
    github_repo_id BIGINT NOT NULL,
    full_name TEXT NOT NULL, -- "org/repo"
    default_branch TEXT NOT NULL DEFAULT 'main',
    clone_url TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    detected_stack TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    build_command TEXT,
    test_command TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, github_repo_id)
);

CREATE TABLE IF NOT EXISTS public.pull_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    pr_number INTEGER NOT NULL,
    branch_name TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'merged', 'closed')) DEFAULT 'open',
    html_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repository_id, pr_number)
);

-- ------------------------------------------------------------------------------
-- 4. Connectors & Command Execution Layer
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    connector_type TEXT NOT NULL CHECK (connector_type IN ('server_inband', 'server_cloud', 'whatsapp', 'gmail', 'github')),
    status TEXT NOT NULL CHECK (status IN ('enrolling', 'active', 'offline', 'degraded', 'revoked')) DEFAULT 'enrolling',
    agent_version TEXT,
    public_key_fingerprint TEXT,
    last_heartbeat_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connector_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id UUID NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL CHECK (credential_type IN ('oauth_token', 'ssh_key', 'cloud_secret', 'webhook_secret')),
    vault_secret_ref TEXT NOT NULL, -- Pointer to secure encrypted backend KMS vault
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connector_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id UUID NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
    capability_name TEXT NOT NULL, -- e.g. "service.restart", "firewall.block", "repo.read_tree"
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (connector_id, capability_name)
);

CREATE TABLE IF NOT EXISTS public.connector_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id UUID NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
    command_name TEXT NOT NULL,
    parameters_hash TEXT NOT NULL,
    payload_encrypted TEXT,
    status TEXT NOT NULL CHECK (status IN ('dispatched', 'acknowledged', 'running', 'completed', 'failed', 'timeout')) DEFAULT 'dispatched',
    stdout_summary TEXT,
    exit_code INTEGER,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 5. Customer Servers & Running Services Inventory
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
    connector_id UUID REFERENCES public.connectors(id) ON DELETE SET NULL,
    hostname TEXT NOT NULL,
    ip_address INET,
    os_type TEXT NOT NULL DEFAULT 'linux',
    kernel_version TEXT,
    cpu_cores INTEGER,
    ram_mb INTEGER,
    disk_gb INTEGER,
    cloud_provider TEXT CHECK (cloud_provider IN ('aws', 'gcp', 'digitalocean', 'baremetal', 'other')),
    cloud_instance_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unreachable')) DEFAULT 'healthy',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL, -- e.g. "nginx", "docker", "web-worker.service"
    unit_type TEXT NOT NULL CHECK (unit_type IN ('systemd', 'docker_container', 'process')),
    status TEXT NOT NULL CHECK (status IN ('active', 'failed', 'inactive', 'restarting')) DEFAULT 'active',
    port INTEGER,
    pid INTEGER,
    cpu_percent NUMERIC(5,2),
    memory_mb INTEGER,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (server_id, service_name, unit_type)
);

-- ------------------------------------------------------------------------------
-- 6. Observability, Telemetry Rollups & Health Checks
-- ------------------------------------------------------------------------------

-- Stores aggregated 1-minute metric rollups (raw 10s metrics kept out of OLTP)
CREATE TABLE IF NOT EXISTS public.telemetry_metric_rollups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    bucket_timestamp TIMESTAMPTZ NOT NULL,
    cpu_avg NUMERIC(5,2) NOT NULL,
    cpu_max NUMERIC(5,2) NOT NULL,
    ram_used_mb INTEGER NOT NULL,
    ram_percent NUMERIC(5,2) NOT NULL,
    disk_used_percent NUMERIC(5,2) NOT NULL,
    iops_read INTEGER DEFAULT 0,
    iops_write INTEGER DEFAULT 0,
    net_rx_kb INTEGER DEFAULT 0,
    net_tx_kb INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    check_type TEXT NOT NULL CHECK (check_type IN ('http', 'tcp', 'icmp')),
    target_url_or_ip TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'failing')) DEFAULT 'healthy',
    last_latency_ms INTEGER,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. AI Model Providers & Model Runs
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.model_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g. "Hugging Face Endpoints", "OpenAI", "Anthropic", "Local vLLM"
    provider_type TEXT NOT NULL CHECK (provider_type IN ('huggingface', 'openai', 'anthropic', 'vllm')),
    api_base_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_model_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    model_provider_id UUID REFERENCES public.model_providers(id) ON DELETE SET NULL,
    model_name TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER NOT NULL,
    cost_usd NUMERIC(8,6) DEFAULT 0,
    prompt_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. Normalized Plan Steps & Tool Execution Traces
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_tool TEXT,
    tool_arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plan_id, step_number)
);

CREATE TABLE IF NOT EXISTS public.tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.plan_steps(id) ON DELETE SET NULL,
    tool_name TEXT NOT NULL,
    parameters_hash TEXT NOT NULL,
    parameters_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_summary TEXT,
    exit_code INTEGER DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'rejected')) DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. Coding Workspaces, Builds & Ephemeral Previews
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspace_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- "Node/Next.js", "Python", ".NET", "Rust", "Go", "Flutter"
    stack_type TEXT NOT NULL CHECK (stack_type IN ('node', 'python', 'dotnet', 'rust', 'go', 'flutter')),
    base_image TEXT NOT NULL,
    package_manager TEXT NOT NULL,
    build_command TEXT NOT NULL,
    test_command TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.workspace_profiles(id) ON DELETE SET NULL,
    container_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('provisioning', 'active', 'executing', 'terminating', 'destroyed')) DEFAULT 'provisioning',
    preview_url TEXT,
    preview_port INTEGER,
    allocated_cpu NUMERIC(3,1) NOT NULL DEFAULT 2.0,
    allocated_ram_mb INTEGER NOT NULL DEFAULT 4096,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.build_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_session_id UUID NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
    commit_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')) DEFAULT 'running',
    stdout_summary TEXT,
    stderr_summary TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_session_id UUID NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'running')) DEFAULT 'running',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. Security Events, Incidents & Autonomous Self-Healing
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.detection_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL, -- e.g., 'ssh_brute_force', 'port_scan', 'dns_exfiltration', 'resource_anomaly', or custom rule
    threshold_value NUMERIC(10,2) NOT NULL,
    time_window_seconds INTEGER NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic query criteria, metric expressions, and log patterns
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.detection_rules(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    source_ip INET,
    raw_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('detected', 'investigating', 'contained', 'dismissed')) DEFAULT 'detected',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
    server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('service_crash', 'resource_exhaustion', 'unreachable_host', 'security_attack')),
    severity TEXT NOT NULL CHECK (severity IN ('P1_critical', 'P2_high', 'P3_medium', 'P4_low')),
    status TEXT NOT NULL CHECK (status IN ('open', 'diagnosing', 'recovering', 'resolved', 'escalated')) DEFAULT 'open',
    ai_diagnosis TEXT,
    root_cause TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.recovery_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    action_level INTEGER NOT NULL CHECK (action_level IN (0, 1, 2, 3)), -- Level 0: Obs, 1: Diag, 2: Low-risk, 3: High-impact
    action_name TEXT NOT NULL, -- e.g. "service.restart", "firewall.block_ip", "ec2.reboot"
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_human_approval BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'rejected', 'executing', 'verified', 'failed')) DEFAULT 'proposed',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recovery_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    action_name TEXT NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1 AND attempt_number <= 3), -- HARD CIRCUIT BREAKER
    status TEXT NOT NULL CHECK (status IN ('executing', 'verified', 'failed')) DEFAULT 'executing',
    verification_result TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 11. Approvals & Human-in-the-Loop Gateway
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('plan_step', 'recovery_plan', 'deployment')),
    resource_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 12. Multi-Channel Notifications
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp', 'gmail')),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('approval_required', 'incident_alert', 'task_completed')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed')) DEFAULT 'queued',
    external_message_id TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 13. Comprehensive Performance Indexes
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_environments_project_id ON public.environments(project_id);
CREATE INDEX IF NOT EXISTS idx_repositories_project_id ON public.repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_id ON public.pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_connectors_env_id ON public.connectors(environment_id);
CREATE INDEX IF NOT EXISTS idx_connectors_status ON public.connectors(status);
CREATE INDEX IF NOT EXISTS idx_servers_env_id ON public.servers(environment_id);
CREATE INDEX IF NOT EXISTS idx_servers_status ON public.servers(status);
CREATE INDEX IF NOT EXISTS idx_services_server_id ON public.services_inventory(server_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_rollups_server ON public.telemetry_metric_rollups(server_id, bucket_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_env_id ON public.health_checks(environment_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_runs_task_id ON public.ai_model_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_plan_steps_plan_id ON public.plan_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_task_id ON public.tool_calls(task_id);
CREATE INDEX IF NOT EXISTS idx_workspace_sessions_task_id ON public.workspace_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_security_events_server ON public.security_events(server_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_env_id ON public.incidents(environment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_runs_plan ON public.recovery_runs(recovery_plan_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org ON public.approval_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, status);

-- ------------------------------------------------------------------------------
-- 14. Automated updated_at Triggers for Mutable Extension Tables
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_set_updated_at_org_members ON public.organization_members;
CREATE TRIGGER trigger_set_updated_at_org_members
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_environments ON public.environments;
CREATE TRIGGER trigger_set_updated_at_environments
    BEFORE UPDATE ON public.environments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_repositories ON public.repositories;
CREATE TRIGGER trigger_set_updated_at_repositories
    BEFORE UPDATE ON public.repositories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_connectors ON public.connectors;
CREATE TRIGGER trigger_set_updated_at_connectors
    BEFORE UPDATE ON public.connectors
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_servers ON public.servers;
CREATE TRIGGER trigger_set_updated_at_servers
    BEFORE UPDATE ON public.servers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_health_checks ON public.health_checks;
CREATE TRIGGER trigger_set_updated_at_health_checks
    BEFORE UPDATE ON public.health_checks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_plan_steps ON public.plan_steps;
CREATE TRIGGER trigger_set_updated_at_plan_steps
    BEFORE UPDATE ON public.plan_steps
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 15. Row Level Security (RLS) Configuration for All Extension Tables
-- ------------------------------------------------------------------------------

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_metric_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Membership & API Key Policies
CREATE POLICY "org_members_select" ON public.organization_members
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "api_keys_org_policy" ON public.api_keys
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Environment Policies
CREATE POLICY "environments_project_scoped" ON public.environments
    FOR ALL TO authenticated
    USING (project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Repository Policies
CREATE POLICY "repositories_project_scoped" ON public.repositories
    FOR ALL TO authenticated
    USING (project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

CREATE POLICY "pull_requests_scoped" ON public.pull_requests
    FOR ALL TO authenticated
    USING (repository_id IN (
        SELECT r.id FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Connector Policies
CREATE POLICY "connectors_env_scoped" ON public.connectors
    FOR ALL TO authenticated
    USING (environment_id IN (
        SELECT e.id FROM public.environments e
        JOIN public.projects p ON p.id = e.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Server & Telemetry Policies
CREATE POLICY "servers_env_scoped" ON public.servers
    FOR ALL TO authenticated
    USING (environment_id IN (
        SELECT e.id FROM public.environments e
        JOIN public.projects p ON p.id = e.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

CREATE POLICY "services_server_scoped" ON public.services_inventory
    FOR ALL TO authenticated
    USING (server_id IN (
        SELECT s.id FROM public.servers s
        JOIN public.environments e ON e.id = s.environment_id
        JOIN public.projects p ON p.id = e.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

CREATE POLICY "telemetry_rollups_scoped" ON public.telemetry_metric_rollups
    FOR SELECT TO authenticated
    USING (server_id IN (
        SELECT s.id FROM public.servers s
        JOIN public.environments e ON e.id = s.environment_id
        JOIN public.projects p ON p.id = e.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- AI Runs, Plan Steps & Tool Call Policies
CREATE POLICY "plan_steps_scoped" ON public.plan_steps
    FOR ALL TO authenticated
    USING (plan_id IN (
        SELECT pl.id FROM public.plans pl
        JOIN public.tasks t ON t.id = pl.task_id
        JOIN public.projects p ON p.id = t.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

CREATE POLICY "tool_calls_scoped" ON public.tool_calls
    FOR ALL TO authenticated
    USING (task_id IN (
        SELECT t.id FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Workspace Policies
CREATE POLICY "workspace_sessions_scoped" ON public.workspace_sessions
    FOR ALL TO authenticated
    USING (project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Incident & Recovery Policies
CREATE POLICY "incidents_env_scoped" ON public.incidents
    FOR ALL TO authenticated
    USING (environment_id IN (
        SELECT e.id FROM public.environments e
        JOIN public.projects p ON p.id = e.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

CREATE POLICY "recovery_plans_scoped" ON public.recovery_plans
    FOR ALL TO authenticated
    USING (incident_id IN (
        SELECT i.id FROM public.incidents i
        JOIN public.environments e ON e.id = i.environment_id
        JOIN public.projects p ON p.id = e.project_id
        JOIN public.profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
    ));

-- Approvals & Notifications Policies
CREATE POLICY "approvals_org_scoped" ON public.approval_requests
    FOR ALL TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "notifications_user_scoped" ON public.notifications
    FOR ALL TO authenticated
    USING (recipient_id = auth.uid());


-- ==============================================================================
-- START MIGRATION: 20260921000003_auth_lifecycle_enhancements.sql
-- ==============================================================================

-- ==============================================================================
-- RYVIX AUTHENTICATION & MULTI-TENANT LIFECYCLE ENHANCEMENT MIGRATION (PHASE 3)
-- Enhances user onboarding trigger with idempotency, multi-org membership sync,
-- and defensive error recovery without altering existing data.
-- ==============================================================================

-- Recreate or update handle_new_user with idempotency and organization_members linking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
    clean_name TEXT;
    clean_slug TEXT;
BEGIN
    -- 1. Extract sanitized display name
    clean_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    -- 2. Deterministic, collision-resistant workspace slug
    clean_slug := 'org-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 12);

    -- 3. Idempotently create personal tenant organization
    INSERT INTO public.organizations (name, slug)
    VALUES (clean_name || '''s Workspace', clean_slug)
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO new_org_id;

    -- If org was already present and returned empty, fetch existing id
    IF new_org_id IS NULL THEN
        SELECT id INTO new_org_id FROM public.organizations WHERE slug = clean_slug LIMIT 1;
    END IF;

    -- 4. Idempotently create user profile
    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, new_org_id, clean_name, 'owner')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- 5. Sync into multi-tenant organization_members table (from Phase 2 schema)
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_members'
    ) THEN
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, NEW.id, 'owner')
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Defensive error handling: log warning but never break auth user creation
        RAISE WARNING 'handle_new_user encountered an exception: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

