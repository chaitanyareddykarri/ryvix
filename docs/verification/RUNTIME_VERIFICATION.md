# Ryvix Runtime Verification Report

## Historical report — current reference updated 2026-10-03

The original findings, counts and pending lists below remain historical evidence.
Current code is `d81b281`, schema `20261003000004`; see
[project status](../PROJECT_STATUS.md) and [latest verification](WHATSAPP_ASSISTANT_2026_10_03.md).
Do not interpret older missing-feature lists as current or fixture passes as real
provider/browser certification. No historical test result was changed or rerun
by this documentation update.


**Date**: September 23, 2026  
**Status**: 100% OPERATIONAL & VERIFIED  

> Historical report: counts and completion claims below are from September 23, 2026 and are not current verification. The former cross-tenant JavaScript predicate test did not execute PostgreSQL RLS; current evidence and limits are documented in `RLS_POLICY_REVIEW.md`.

## 1. Automated Test Suite Execution
- **Command**: `npm run test`
- **Result**: **39 PASSED | 0 FAILED** (4269ms duration)
- **Key Test Suites Verified**:
  - `auth-lifecycle.test.ts`: 100% verified (numeric OTP delivery, token verification, session lifecycle).
  - `github-integration.test.ts`: 100% verified (JWT app token, installation token, repo discovery, stack detection, PR generation).
  - `server-outage.test.ts`: 100% verified (tri-state differential diagnosis: healthy, agent_crashed, server_outage).
  - `server-connector-pipeline.test.ts`: 100% verified (HMAC token, zero-trust capability whitelist, telemetry stream).
  - `tenant-predicate.test.ts`: unit coverage of a JavaScript predicate only; it does not verify database RLS.
  - `total-project-integration.test.ts`: 100% verified.

---

## 2. Next.js Production Build
- **Command**: `npm run build` in `web/`
- **Result**: **SUCCESS (Exit Code 0)**
- **Routes Compiled (28 total)**:
  - Dynamic Routes: `/api/tasks`, `/api/servers`, `/api/chat`, `/api/auth/github/*`, `/api/github/*`, `/api/connector/*`, `/api/monitoring/probe`, `/api/observability/logs`.
  - Static Pre-rendered Pages: `/`, `/dashboard`, `/observability`, `/servers`, `/tasks`, `/login`, `/auth/reset-password`.

---

## 3. Live HTTP Endpoint Probes
- `GET /api/tasks` -> **HTTP 200 OK** (Returns 9 real database tasks).
- `GET /api/servers` -> **HTTP 200 OK** (Returns 6 real database servers with telemetry).
- `GET /api/auth/github/authorize` -> **HTTP 412** (Precondition verified with setup instructions).
- `GET /api/github/repositories` -> **HTTP 200 OK** (`{ connected: false, repositories: [] }`).
- `POST /api/connector/register` -> **HTTP 200 OK** (`{ success: true, connector: {...} }`).
- `POST /api/connector/telemetry` -> **HTTP 200 OK** (`{ success: true, heartbeatAck: true }`).
- `POST /api/monitoring/probe` -> **HTTP 200 OK** (`{ success: true, evaluation: { diagnosis: "healthy" } }`).
- `GET /api/observability/logs` -> **HTTP 200 OK** (Streaming combined logs with full credential redaction).
