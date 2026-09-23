package container

import (
	"bufio"
	"bytes"
	"fmt"
	"os/exec"
	"strings"

	"github.com/ryvix/agent/pkg/telemetry"
)

type DockerManager struct{}

func NewDockerManager() *DockerManager {
	return &DockerManager{}
}

// ScanContainers lists running or stopped docker containers via docker ps.
func (dm *DockerManager) ScanContainers() []telemetry.ContainerState {
	cmd := exec.Command("docker", "ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}")
	out, err := cmd.Output()
	if err != nil {
		// Fallback empty list if docker daemon is unreachable
		return []telemetry.ContainerState{}
	}

	var containers []telemetry.ContainerState
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Split(line, "|")
		if len(parts) >= 4 {
			statusStr := strings.ToLower(parts[3])
			normalizedStatus := "exited"
			if strings.Contains(statusStr, "up") {
				normalizedStatus = "running"
			} else if strings.Contains(statusStr, "restart") {
				normalizedStatus = "restarting"
			}

			containers = append(containers, telemetry.ContainerState{
				ID:     parts[0],
				Name:   parts[1],
				Image:  parts[2],
				Status: normalizedStatus,
			})
		}
	}
	return containers
}

// RestartContainer executes docker restart.
func (dm *DockerManager) RestartContainer(nameOrID string) error {
	if strings.ContainsAny(nameOrID, " ;&|><$\"") {
		return fmt.Errorf("invalid container identifier: %s", nameOrID)
	}
	cmd := exec.Command("docker", "restart", nameOrID)
	_, err := cmd.CombinedOutput()
	return err
}
