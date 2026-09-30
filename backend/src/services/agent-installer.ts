type ReleaseAsset = { url: string; sha256: string };
type AgentRelease = { version: string; linux: { amd64: ReleaseAsset; arm64: ReleaseAsset } };
function httpsUrl(value: unknown) {
  if (typeof value !== 'string') throw new Error('HTTPS URL required');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || /[\r\n]/.test(value)) throw new Error('Invalid release URL');
  return url;
}
const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
export function agentReleaseConfiguration(env = process.env) {
  const origin = httpsUrl(env.RYVIX_PUBLIC_URL);
  if (origin.pathname !== '/' || origin.search || !/^[a-z\d.-]+$/i.test(origin.hostname)) throw new Error('Public origin required');
  const release = JSON.parse(env.RYVIX_AGENT_RELEASE_MANIFEST || '') as AgentRelease;
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(release.version)) throw new Error('Pinned agent version required');
  for (const architecture of ['amd64', 'arm64'] as const) {
    const asset = release.linux?.[architecture];
    if (!asset || !/^[a-f\d]{64}$/.test(asset.sha256)) throw new Error('Release SHA-256 required');
    const url = httpsUrl(asset.url);
    if (url.search || !url.pathname.split('/').includes(release.version)) throw new Error('Versioned release URL required');
  }
  return { origin: origin.origin, release };
}
export function agentInstallScript(env = process.env) {
  const { origin, release } = agentReleaseConfiguration(env);
  return `#!/usr/bin/env bash
set -euo pipefail
umask 077
[ "$(id -u)" -eq 0 ] || { echo 'Run this installer with sudo.' >&2; exit 1; }
[ "$(uname -s)" = Linux ] || { echo 'Only Linux is supported.' >&2; exit 1; }
for tool in curl sha256sum systemctl useradd install; do command -v "$tool" >/dev/null || { echo "Required tool unavailable: $tool" >&2; exit 1; }; done
[ ! -e /var/lib/ryvix-agent/device.json ] || { echo 'Device already enrolled. Revoke before re-enrollment.' >&2; exit 1; }
case "$(uname -m)" in
  x86_64) asset=${quote(release.linux.amd64.url)}; checksum=${quote(release.linux.amd64.sha256)} ;;
  aarch64|arm64) asset=${quote(release.linux.arm64.url)}; checksum=${quote(release.linux.arm64.sha256)} ;;
  *) echo 'Unsupported CPU architecture.' >&2; exit 1 ;;
esac
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"; unset enrollment_token' EXIT
curl --proto '=https' --proto-redir '=https' --tlsv1.2 --fail --silent --show-error --location --max-time 120 "$asset" -o "$scratch/agent"
printf '%s  %s\n' "$checksum" "$scratch/agent" | sha256sum --check --status || { echo 'Agent integrity verification failed.' >&2; exit 1; }
chmod 0700 "$scratch/agent"
"$scratch/agent" --version | grep -F ${quote(`ryvix-agent v${release.version} `)} >/dev/null || { echo 'Agent version mismatch.' >&2; exit 1; }
id ryvix-agent >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin ryvix-agent
install -d -m 0700 -o ryvix-agent -g ryvix-agent /var/lib/ryvix-agent
printf 'Paste the short-lived enrollment token: ' >/dev/tty
IFS= read -r -s enrollment_token </dev/tty
printf '\n' >/dev/tty
printf '%s' "$enrollment_token" | "$scratch/agent" --enroll --control-plane ${quote(origin)} --config /var/lib/ryvix-agent/device.json
unset enrollment_token
chown ryvix-agent:ryvix-agent /var/lib/ryvix-agent/device.json
install -m 0755 -o root -g root "$scratch/agent" /usr/local/bin/ryvix-agent
cat > /etc/systemd/system/ryvix-agent.service <<'UNIT'
[Unit]
Description=Ryvix enrolled telemetry agent
After=network-online.target
Wants=network-online.target
[Service]
User=ryvix-agent
Group=ryvix-agent
ExecStart=/usr/local/bin/ryvix-agent --config /var/lib/ryvix-agent/device.json --interval=5s
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/ryvix-agent
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now ryvix-agent
echo 'Agent service started. Verify fresh authenticated telemetry in Ryvix.'
`;
}
