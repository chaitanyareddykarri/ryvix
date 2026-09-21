# Ryvix Telemetry Architecture & Ingestion Pipeline Specification

## 1. System Objectives

The Ryvix Telemetry subsystem is engineered to:
1. Ingest continuous high-frequency metrics, system events, and log streams from connected customer servers and containers.
2. Enforce strict ingestion boundaries to prevent runaway resource consumption, denial of service, and storage exhaustion.
3. Guarantee full auditability and trace correlation across all events using distributed identifiers.

---

## 2. Canonical Telemetry Event Schema

All events flowing through the Ryvix telemetry pipeline adhere to a strict canonical envelope:

```typescript
interface CanonicalTelemetryEvent {
  event_id: string;              // UUIDv4
  timestamp: string;             // ISO-8601 UTC with microsecond precision
  project_id: string;            // UUID of target customer project
  server_id: string;             // UUID of enrolled host/server
  environment: 'production' | 'staging' | 'development';
  source: 'internal_agent' | 'external_probe' | 'cloud_api' | 'ci_cd';
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  event_type: 'metric' | 'log' | 'process_snapshot' | 'security_signal' | 'deploy_event';
  
  // Distributed tracing & task correlation
  trace_id?: string;
  task_id?: string;
  request_id?: string;

  // Payload payload container
  data: Record<string, unknown>;
  
  // Integrity verification
  signature: string;             // ed25519 signature of the payload
}
```

---

## 3. Ingestion Boundaries & Rate Limiting

To prevent unbounded ingestion and protect both customer networks and Ryvix infrastructure:
- **Token Bucket Rate Limiting**: Maximum 200 metric events/minute and 5,000 log lines/minute per server (configurable per tier).
- **Spike Throttling**: Bursts exceeding rate limits are buffered in local agent ring buffers; non-critical DEBUG logs are discarded first.
- **Payload Size Caps**: Maximum 256KB per compressed telemetry batch. Single log messages exceeding 64KB are automatically truncated.

---

## 4. Tiered Storage & Retention Strategy

```
[ Ingested Stream ]
         │
         ├──> Hot Tier (0 - 7 Days)
         │    - PostgreSQL partitioned tables (daily partitions)
         │    - Immediate query availability for Web Chat & Dashboards
         │
         ├──> Warm Tier (8 - 30 Days)
         │    - Downsampled metrics (1-minute averages)
         │    - Compressed parquet files stored in Supabase / S3 Storage
         │
         └──> Cold Tier / Audit Archive (31 - 365+ Days)
              - Cryptographically hashed daily tarballs for enterprise compliance
              - Retained in immutable Glacier / S3 object locks
```
