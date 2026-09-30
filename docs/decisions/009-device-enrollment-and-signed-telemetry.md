# ADR-009: Enrolled device signatures and existing telemetry rollups

Status: implementation; live deployment not verified.

Reuse connectors, servers and telemetry_metric_rollups. An authorized operator
reserves one server and receives a ten-minute random enrollment token. Only its
hash is stored. Registration consumes it transactionally and binds an Ed25519
public key; the private key never leaves the device. Revocation of the connector
immediately denies subsequent ingestion.

The native agent continues bounded HTTPS POST batches. Each request signs its
method, canonical path, timestamp, nonce and SHA-256 body digest. Server identity
comes from the enrolled key and server relation, never a browser tenant claim.
Database receipts enforce replay protection and a per-device 200/minute limit
under a connector row lock. Receipts expire after ten minutes; signatures expire
after two minutes. Acknowledgement follows the committed rollup transaction.

Authenticated samples aggregate into one-minute buckets in the existing table.
Legacy samples are not certified by migration. Browser SSE reads these same
tenant-scoped rollups; it is not a second ingestion pipeline. Command dispatch
remains separate and must not treat telemetry authentication as action approval.

New tables enable RLS and deny browser grants; backend operations independently
check membership. Enrollment and registration emit existing immutable audit events.
Enrollment issuance is limited to ten outstanding invitations per environment.
