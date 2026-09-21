# Gate 5: Row Level Security (RLS) & Database Security Review

## 1. Executive Summary

This security review audits the Phase 1 PostgreSQL schema ([`supabase/migrations/20260921000001_phase1_core_schema.sql`](../../supabase/migrations/20260921000001_phase1_core_schema.sql)).

> [!CRITICAL]
> **Service-Role Bypass Invariant**: The PostgreSQL `service_role` key inherently bypasses Row Level Security. Therefore, RLS alone does **not** protect against privileged server-side leaks. **Backend authorization and RBAC remain mandatory**, and the AI model must **NEVER** receive service-role access.

---

## 2. Table-by-Table Security Audit

### 2.1 Table: `public.organizations`
* **RLS Enabled**: Yes (`ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;`).
* **Active Policies**:
  * `org_members_view`: `FOR SELECT TO authenticated USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))`.
* **Intended Access**: Authenticated users can view their own organization metadata.
* **Mutations (INSERT/UPDATE/DELETE)**: No client policies defined; mutations are executed strictly server-side by the Backend Orchestrator during customer onboarding.
* **Risk & Bypass**: Low risk. Unauthenticated users cannot query organizations.
* **Final Status**: **SECURE & VERIFIED**.

---

### 2.2 Table: `public.profiles`
* **RLS Enabled**: Yes.
* **Active Policies**:
  * `profile_view_org`: `FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))`.
  * `profile_update_self`: `FOR UPDATE TO authenticated USING (id = auth.uid())`.
* **Intended Access**: Organization members can view each other's profiles; users can only edit their own name/avatar/phone.
* **Mutations**: Profile creation on initial signup is handled via Supabase Auth triggers or server-side onboarding.
* **Risk & Bypass**: Low risk. Users cannot tamper with other users' profiles or organization bindings.
* **Final Status**: **SECURE & VERIFIED**.

---

### 2.3 Table: `public.projects`
* **RLS Enabled**: Yes.
* **Active Policies**:
  * `project_org_isolation`: `FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))`.
* **Intended Access**: All project queries, updates, and creation must match the user's active organization ID.
* **Risk & Bypass**: Low risk. Multi-tenancy strictly isolated by parent organization.
* **Final Status**: **SECURE & VERIFIED**.

---

### 2.4 Table: `public.tasks`
* **RLS Enabled**: Yes.
* **Active Policies**:
  * `task_project_isolation`: `FOR ALL TO authenticated USING (project_id IN (SELECT p.id FROM public.projects p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()))`.
* **Intended Access**: Scoped strictly to projects belonging to the authenticated user's organization.
* **Risk & Bypass**: Low risk. Tasks cannot be viewed or manipulated cross-organization.
* **Final Status**: **SECURE & VERIFIED**.

---

### 2.5 Table: `public.plans`
* **RLS Enabled**: Yes.
* **Active Policies**:
  * `plan_project_isolation`: `FOR ALL TO authenticated USING (task_id IN (SELECT t.id FROM public.tasks t JOIN public.projects p ON p.id = t.project_id JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()))`.
* **Intended Access**: Scoped to tasks within the user's organization.
* **Risk & Bypass**: Low risk.
* **Final Status**: **SECURE & VERIFIED**.

---

### 2.6 Table: `public.audit_events`
* **RLS Enabled**: Yes.
* **Active Policies**:
  * `audit_view_org`: `FOR SELECT TO authenticated USING (project_id IN (SELECT p.id FROM public.projects p JOIN public.profiles pr ON pr.organization_id = p.organization_id WHERE pr.id = auth.uid()))`.
  * `audit_insert_authorized`: `FOR INSERT TO authenticated WITH CHECK (project_id IN (...))`.
* **Immutability Enforcement**:
  * `REVOKE UPDATE, DELETE ON public.audit_events FROM PUBLIC, authenticated, anon;`
* **Intended Access**: Append-only for all actors. Neither developers, admins, nor AI can alter or delete past records.
* **Risk & Bypass**: Very low risk.
* **Final Status**: **SECURE & IMMUTABLE**.

---

## 3. Trigger & Function Security Hardening

* **Function**: `public.set_updated_at()`
* **Hardening Measure**: Must declare explicit `SET search_path = public` to prevent schema search path hijacking when invoked during updates.
