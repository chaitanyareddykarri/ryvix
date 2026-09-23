package systemd

import (
	"fmt"
	"os/exec"
	"strings"
	"sync"

	"github.com/ryvix/agent/pkg/telemetry"
)

type SystemdManager struct {
	mu        sync.RWMutex
	whitelist map[string]bool
}

func NewSystemdManager() *SystemdManager {
	sm := &SystemdManager{
		whitelist: make(map[string]bool),
	}
	// Strict Capability Whitelist
	for _, svc := range []string{
		"nginx",
		"caddy",
		"postgresql",
		"redis",
		"docker",
		"node-app",
		"python-api",
		"ryvix-agent",
	} {
		sm.whitelist[svc] = true
	}
	return sm
}

// IsWhitelisted checks if the service name is allowed.
func (sm *SystemdManager) IsWhitelisted(service string) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.whitelist[service]
}

// RestartService executes systemctl restart on whitelisted unit.
func (sm *SystemdManager) RestartService(service string) (string, error) {
	if !sm.IsWhitelisted(service) {
		return "", fmt.Errorf("security violation: unit '%s' is not in Ryvix capability whitelist", service)
	}

	cmd := exec.Command("systemctl", "restart", service)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("systemctl restart %s failed: %w", service, err)
	}
	return fmt.Sprintf("Unit %s successfully restarted via systemd", service), nil
}

// GetStatus checks service active status.
func (sm *SystemdManager) GetStatus(service string) telemetry.SystemdServiceState {
	cmd := exec.Command("systemctl", "is-active", service)
	out, err := cmd.Output()
	status := strings.TrimSpace(string(out))

	if err != nil {
		if status == "" {
			status = "inactive"
		}
	}

	subState := "running"
	if status != "active" {
		subState = status
	}

	return telemetry.SystemdServiceState{
		Name:     service,
		Status:   status,
		SubState: subState,
	}
}

// ScanMonitoredServices scans the default fleet services.
func (sm *SystemdManager) ScanMonitoredServices() []telemetry.SystemdServiceState {
	services := []string{"nginx", "postgresql", "docker", "node-app", "redis"}
	results := make([]telemetry.SystemdServiceState, 0, len(services))

	for _, svc := range services {
		results = append(results, sm.GetStatus(svc))
	}
	return results
}
