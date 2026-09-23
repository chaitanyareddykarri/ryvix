#!/usr/bin/env bash
set -euo pipefail

# =========================================================================
# Ryvix Agent One-Line Native Installer
# Usage: curl -sSL https://get.ryvix.dev | bash -s -- --token=<TOKEN>
# =========================================================================

ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  BIN_ARCH="amd64" ;;
  aarch64) BIN_ARCH="arm64" ;;
  arm64)   BIN_ARCH="arm64" ;;
  *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

INSTALL_DIR="/opt/ryvix-agent"
mkdir -p "$INSTALL_DIR"

echo "==> Downloading Ryvix native agent binary (linux/$BIN_ARCH)..."
# In local dev/monorepo, copy binary from dist/
if [ -f "./dist/ryvix-agent-linux-$BIN_ARCH" ]; then
  cp "./dist/ryvix-agent-linux-$BIN_ARCH" "$INSTALL_DIR/ryvix-agent"
elif [ -f "./ryvix-agent-linux-$BIN_ARCH" ]; then
  cp "./ryvix-agent-linux-$BIN_ARCH" "$INSTALL_DIR/ryvix-agent"
else
  # Production download endpoint
  curl -sSL "https://releases.ryvix.dev/agent/latest/ryvix-agent-linux-$BIN_ARCH" -o "$INSTALL_DIR/ryvix-agent"
fi

chmod +x "$INSTALL_DIR/ryvix-agent"

# Install Systemd service
if command -v systemctl >/dev/null 2>&1; then
  echo "==> Installing systemd service..."
  cat <<'EOF' > /etc/systemd/system/ryvix-agent.service
[Unit]
Description=Ryvix Autonomous Host Telemetry & Capability Daemon
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/ryvix-agent/ryvix-agent -interval=5s
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable ryvix-agent
  systemctl restart ryvix-agent
  echo "==> ryvix-agent service started successfully!"
else
  echo "==> Agent binary installed at $INSTALL_DIR/ryvix-agent"
fi
