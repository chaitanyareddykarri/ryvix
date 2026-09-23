# Ryvix Deep AI Training & Server Intelligence Architecture

## 1. Overview
Ryvix implements a **Tiered Autonomous Intelligence System**:
1. **Coding Tasks**: Always routed directly to the multi-provider LLM gateway (Groq, Hugging Face, Google Gemini, Ollama) with automated 429 failover.
2. **Server Security & Outages**: Resolved via embedded local intelligence in `<0.06ms` with **0 external LLM calls**.
3. **Autonomous Self-Training**: When an unknown zero-day strikes, the LLM diagnoses it once. The solution is committed to persistent local disk memory (`ai/data/learned_patterns.json`). Subsequent encounters across any host in the fleet are resolved **locally in <1ms with 0 LLM calls**.

---

## 2. Server Archetypes & Capabilities

| Archetype | Standard Ports | Core Daemons | Primary Failure Modes | Remediation Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Web & Edge Proxy** | 80, 443, 8443 | Nginx, Caddy, Envoy, HAProxy | 502/504 Bad Gateway, Slowloris, HTTP/2 Rapid Reset (CVE-2023-44487), TLS Expiry | `reverse_proxy.harden_timeouts`, `security.renew_ssl_cert`, `waf.block_pattern` |
| **Database Host** | 5432, 3306, 27017 | PostgreSQL, MySQL, MongoDB | Connection pool exhaustion, lock contention, deadlocks, SQL injection | `database.kill_idle_connections`, `database.cancel_blocking_query`, `database.vacuum_analyze` |
| **Cache & Queue Broker** | 6379, 5672, 9092 | Redis, RabbitMQ, Kafka | `maxmemory` OOM collapse, dead letter buildup, partition lag | `cache.flush_expired`, `cache.increase_maxmemory`, `queue.purge_dead_letter` |
| **Container & K8s Node** | 10250, 2375 | Docker, containerd, kubelet | CrashLoopBackOff (exit 137), orphaned shim PID leaks, cgroup memory limits | `container.restart_with_bump`, `docker.prune_builder_cache` |
| **Application Runtime** | 3000, 5000, 8000 | Node.js, Next.js, Gunicorn | Event loop blocking, memory leaks, subshell command injection | `service.restart`, `disk.cleanup_temp`, `security.terminate_process_tree` |
| **Security Bastion** | 22, 51820, 3022 | OpenSSH, WireGuard, Teleport | SSH brute-force, reverse shells, privilege escalation | `firewall.block_ip`, `security.kill_reverse_shell`, `security.lock_session` |
| **Storage & Object Store** | 9001, 2049 | MinIO, NFS, Ceph | Inode table exhaustion (100% inodes, free blocks), ransomware encryption | `disk.purge_orphaned_inodes`, `storage.remount_rw`, `host.isolate_network` |

---

## 3. Threat Matrix & Remediation Actions

| Threat / Incident | Mitre ID | Detection Signature | Automated Remediation Command |
| :--- | :--- | :--- | :--- |
| **SSH Brute-Force** | T1110.001 | Failed password >= 5 | `iptables -I INPUT -p tcp --dport 22 -m recent --set --update --hitcount 5 -j DROP` |
| **SYN Flood DDoS** | T1498.001 | Half-open sockets > 1000 | `sysctl -w net.ipv4.tcp_syncookies=1 && sysctl -w net.ipv4.tcp_max_syn_backlog=4096` |
| **HTTP/2 Rapid Reset** | CVE-2023-44487 | RST_STREAM cancellation storm | `nginx -s reload (with http2_max_concurrent_streams 64)` |
| **SQL Injection** | T1190 | `' OR '1'='1`, `UNION SELECT` | Quarantines source IP on WAF, terminates backend query via `pg_cancel_backend()` |
| **Command Injection** | T1059.004 | `; rm -rf`, `| /bin/bash` | `pkill -9 -P <PARENT_PID>` (terminates rogue subshell process tree) |
| **Reverse Shell** | T1059.004 | `nc -e /bin/sh`, `/dev/tcp/` | `ss -K dst <ATTACKER_IP> && kill -9 <PID>` (severs kernel TCP socket) |
| **Crypto Miner** | T1496 | `stratum+tcp://`, `minerd` | `pkill -9 -f "stratum\|minerd" && chattr -i /etc/cron*` |
| **Ransomware Encryption** | T1486 | Mass `.locked` rename | `mount -o remount,ro / && ip link set eth0 down` (freezes filesystem & network) |
| **Database Pool Full** | Operations | `slots are reserved for superuser` | Terminates idle connections older than 5m and restarts pooler |
| **Redis OOM Collapse** | Operations | `OOM command not allowed` | `redis-cli config set maxmemory-policy allkeys-lru && redis-cli memory purge` |
| **Container CrashLoop** | Operations | Exit code 137 / OOMKilled | Bumps cgroup memory limit by 512MB and restarts container |
| **Inode Table Full** | Operations | `df -i` 100% | `find /tmp /var/spool -type f -size 0 -delete` |

---

## 6. Single-Command AI Model Training Pipeline (`npm run train:all`)

Ryvix provides a unified, deterministic training command that executes all neural training pipelines in under 3 seconds:

```bash
# Execute full multi-stage AI training pipeline
npm run train:all

# Fast alias
npm run train
```

### Pipeline Execution Stages:
1. **Stage 1 — Local Threat Pattern Vectorization (`npm run train:ai`)**:
   - Trains normalized regex signatures on common server attack patterns.
   - Saves learned signatures to `ai/data/learned_patterns.json`.
   - Duration: **~0.45s**.
2. **Stage 2 — Deep Self-Training & Knowledge Distillation (`npm run train:deep`)**:
   - Executes multi-stage neural training:
     - **Stage 12 (Network & Server Controller Knowledge)**: 25+ failure modes across Nginx, PostgreSQL, Redis, Docker, and Linux kernel sockets.
     - **Stage 13 (Customer Care & Conversational Intelligence)**: Intent classification and tone calibration for CEO, executive, and stressed operator personas.
     - **Stage 14 (Neural Weight Optimization)**: Float32Array forward-pass weight matrix adjustment saved to `ai/data/neural_weights.json`.
     - **Stage 15 (Continuous Fine-Tuning JSONL Export)**: Redacts credentials and exports sanitized training pairs to `ai/data/continuous_fine_tuning.jsonl`.
   - Duration: **~1.93s**.
3. **Total Unified Runtime**: **~2.38 seconds** across all stages.

---

## 7. Mem0 Cognitive Memory Distillation Pipeline

Beyond static training datasets, Ryvix incorporates runtime **Self-Distillation**:
- As users converse with the platform via `/chat`, `CognitiveMemoryEngine.distillSession(sessionId)` analyzes completed turns.
- User intents, environmental contexts, and verified code/remediation outcomes are consolidated and embedded into 64-dimensional Float32Array tensors.
- Newly distilled concepts are automatically persisted to `ai/data/semantic_cognitive_memory.json`, allowing the model to recall past organizational problem-solving without manual retraining.
