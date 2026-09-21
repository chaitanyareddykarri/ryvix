# Ryvix Local Development & Engineering Guide

## 1. Prerequisites
- **Node.js**: v20.x or later (LTS recommended)
- **pnpm**: v9.x or later
- **Python**: v3.11+ (for AI services & telemetry analyzers)
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and Supabase emulation
- **Supabase CLI**: For local database migrations and edge function development

---

## 2. Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate required local development keys (Supabase URL, Anon Key, Redis URL).
3. Start local dependencies using Docker Compose:
   ```bash
   docker compose -f infrastructure/docker-compose.dev.yml up -d
   ```

---

## 3. Database Management & Migrations

- All database schema changes are managed via Supabase CLI in `supabase/migrations/`.
- Apply migrations locally:
  ```bash
  supabase db reset
  ```
- Generate a new migration file:
  ```bash
  supabase migration new <migration_name>
  ```
- Generate TypeScript types from Supabase:
  ```bash
  supabase gen types typescript --local > packages/types/src/database.types.ts
  ```

---

## 4. Workspace & Service Directory Layout

- `ai/`: Contains AI orchestration logic, system prompt catalogs, and Hugging Face client adapters.
- `backend/`: Core Node.js/TypeScript API orchestrator.
- `web/`: Next.js web console and Web Chat frontend.
- `services/`:
  - `services/worker/`: Background task processor (BullMQ / Redis).
  - `services/workspace/`: Ephemeral coding workspace manager.
  - `services/telemetry/`: Stream ingestion engine for metrics and logs.
  - `services/connector/`: Gateway server terminating internal connector connections.
- `packages/`:
  - `packages/types/`: Shared TypeScript interface definitions.
  - `packages/sdk/`: Ryvix SDK for connectors and client bindings.

---

## 5. Coding Workspace Development

- Coding workspaces run ephemeral isolated sandboxes (Docker / rootless containers / firecracker).
- Workspaces must dynamically detect project stacks (Node, Python, Go, Rust, Ruby, PHP) using the Project Analyzer.
- Workspaces mount only authorized repositories and run non-root build/test commands with strict CPU/memory limits and timeout limits.

---

## 6. Connector Development

- The internal connector is written to be minimal, resilient, and low-overhead (<1% CPU, <50MB RAM).
- Local connector testing can be simulated via mock telemetry emitters located in `scripts/simulate_connector.py`.

---

## 7. Testing Standards

- **Unit Tests**: Run across all packages using Vitest/Pytest:
  ```bash
  pnpm test:unit
  ```
- **Integration Tests**: Tests database operations, tool dispatch, and permission matrices:
  ```bash
  pnpm test:integration
  ```
- **Linting & Formatting**:
  ```bash
  pnpm lint
  pnpm typecheck
  ```
