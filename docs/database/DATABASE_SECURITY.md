# Ryvix Database Security & Row Level Security (RLS) Specification

## 1. Multi-Tenant Segregation via RLS

Ryvix strictly enforces tenant data isolation at the PostgreSQL database level using **Row Level Security (RLS)**. No tenant query can accidentally access another organization's repositories, servers, tasks, or audit logs.

---

## 2. Phase 1 Policy Enforcement (Active in `supabase/migrations/`)

Every table in the `public` schema has RLS explicitly enabled:

```sql
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
```

### Policy Rules:
1. **`organizations`**: Authenticated users can view only the organization they are assigned to via `profiles.organization_id`.
2. **`profiles`**: Authenticated users can view team member profiles in their organization and update only their own profile (`id = auth.uid()`).
3. **`projects`**: Authenticated users can query and manage projects matching their organization ID.
4. **`tasks` & `plans`**: Scoped via inner joins to `projects` and `profiles` ensuring strict multi-tenancy.
5. **`audit_events`**: Viewable by organization members; append-only (`INSERT`) authorized for backend logging; `UPDATE` and `DELETE` permanently revoked.

---

## 3. Database Role & Credential Boundaries

| Database Role / Secret | Where it is used | Where it is FORBIDDEN |
| :--- | :--- | :--- |
| **`anon` / Publishable Key** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Next.js browser client, auth login redirects, public assets. | Internal administrative operations. |
| **`authenticated` (JWT)** | Next.js Server Components, API routes with user session. | AI Model context or unauthenticated scripts. |
| **`service_role`** (`SUPABASE_SERVICE_ROLE_KEY`) | **Server-side only**: Ryvix Backend Orchestrator and background workers. Bypasses RLS. | **STRICTLY PROHIBITED** in browser code, client JavaScript, `NEXT_PUBLIC_*` variables, or AI Model context. |

---

## 4. AI Credential Air-Gap

The AI Model is strictly quarantined from database access:
- **No Direct Connection**: The AI does not hold PostgreSQL connection strings, Supabase URLs, or service-role keys.
- **Controlled Tool Mediation**: All database operations requested by the AI are executed by the Backend Tool Execution Layer, which performs deterministic authorization checks prior to dispatching queries to PostgreSQL.
