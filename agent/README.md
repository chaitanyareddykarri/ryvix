# Ryvix Native Agent Daemon (`ryvix-agent`)

Ultra-lightweight (~5MB), zero-dependency, statically-linked in-band telemetry collector and remote capability execution daemon written in Go.

## Key Features
- **Pure Linux /proc Telemetry**: Harvests CPU, RAM, Disk, Systemd services, Docker containers, and load averages in <1ms without third-party dependencies.
- **Outbound-Only Push**: 0 open inbound ports required. Communicates over HTTPS to the Ryvix Control Plane.
- **Strict Capability Whitelist**: Protects against arbitrary code execution. Restarts whitelisted services and containers only.
- **Sub-50μs Netfilter IP Blocking**: Direct iptables / nftables integration to block malicious IPs cluster-wide during DDoS or SSH brute-force attacks.
- **HMAC-SHA256 Cryptographic Authentication**: Validates signed enrollment tokens before executing any operational action.
- **Static Compilation**: Single static ELF/PE binary (<5.2MB) compatible with any Linux distribution (Alpine, Ubuntu, Debian, RHEL, Arch) and Windows.

## Quick CLI Usage
```bash
# Print version and architecture
./ryvix-agent -version

# Collect single telemetry snapshot as JSON
./ryvix-agent -once

# Run as persistent daemon
./ryvix-agent -server-id=srv_prod_web_01 -control-plane=https://app.ryvix.dev -interval=5s
```
