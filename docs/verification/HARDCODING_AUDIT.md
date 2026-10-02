# Ryvix Hardcoding & Demo Data Audit

## Historical checkpoint — 2026-10-02

This report is retained as evidence of its original inspection or test run.
The latest implementation checkpoint is `45b130b`: cloud recovery, WhatsApp P1
dispatch, security email and approved releases are implemented in that checkpoint.
The latest recorded schema is `20261002000003`; provider acceptance is still pending.

See the [current project status](../PROJECT_STATUS.md) for the
implemented scope, migration checkpoint, verification evidence and remaining work.
Results and pending lists below describe the original checkpoint; later changes
are recorded in the status index. Historical counts are intentionally preserved.


**Date**: September 23, 2026  
**Status**: AUDITED & REMEDIATED  

## 1. Executive Summary
An exhaustive audit was conducted across the Ryvix Web Console (`web/`), Backend (`backend/`), AI Engine (`ai/`), and Services (`services/`) to detect and eliminate hardcoded mock infrastructure, synthetic health metrics, fake repositories, and customer credentials.

---

## 2. Identified Hardcoded Data & Remediation

| Component | Identified Pattern | Audit Finding | Remediation Taken |
| :--- | :--- | :--- | :--- |
| `web/app/dashboard/page.tsx` | `staging-api-box`, `db-replica-01`, `app-prod-worker-01` | Static fallback array rendered when database returned 0 servers. | Removed static fallback array. Dashboard now reads live servers from Supabase via `GET /api/servers`. |
| `web/app/dashboard/page.tsx` | `novastudio.agency`, `Nova Studio` | Hardcoded default organization and website domain. | Dynamically derived from Supabase `user.user_metadata.full_name` or email prefix, linked to `public.profiles.organization_id`. |
| `web/app/servers/page.tsx` | Fixed status values | Early prototypes had hardcoded health percentages. | Replaced with live database metrics from `public.servers` and `public.telemetry_metric_rollups`. |
| `web/app/api/tasks/route.ts` | Static task list | API had fallback mock task array upon PGRST201 error. | Fixed root cause PostgREST join ambiguity (`plans:plans!plans_task_id_fkey(*)`). Now serves 100% real database records. |
| Customer GitHub Selection | Auto-assigned demo repo | UI lacked real repo discovery picker. | Built real GitHub OAuth flow and `ConnectRepositoryModal` querying `/api/github/repositories` live. |

---

## 3. Invariants Enforced
- **Zero Synthetic Health**: Health states (`healthy`, `degraded`, `unreachable`) are derived strictly from internal heartbeat freshness and external HTTP probe latency.
- **Zero Hardcoded Secrets**: Service-role keys and database passwords reside exclusively in server-side environment variables and are never transmitted to client browsers or AI model prompts.
- **Empty State Integrity**: When a customer organization has 0 enrolled servers or repositories, the console renders clean onboarding enrollment modals rather than fake populated cards.
