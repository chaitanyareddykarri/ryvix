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

