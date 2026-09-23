package systemd

import (
	"testing"
)

func TestSystemdWhitelist(t *testing.T) {
	sm := NewSystemdManager()

	// Whitelisted units
	for _, unit := range []string{"nginx", "postgresql", "docker", "redis", "node-app", "ryvix-agent"} {
		if !sm.IsWhitelisted(unit) {
			t.Fatalf("Expected %s to be whitelisted", unit)
		}
	}

	// Malicious / Unapproved units
	for _, unit := range []string{"rm -rf /", "malware", "sshd", "telnet"} {
		if sm.IsWhitelisted(unit) {
			t.Fatalf("Expected %s to be rejected", unit)
		}
	}

	// Execution rejection test
	_, err := sm.RestartService("unapproved-crypto-miner")
	if err == nil {
		t.Fatalf("Expected unapproved unit restart to fail with security violation")
	}
}
