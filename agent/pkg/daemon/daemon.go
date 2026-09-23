package daemon

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/ryvix/agent/pkg/container"
	"github.com/ryvix/agent/pkg/dispatcher"
	"github.com/ryvix/agent/pkg/firewall"
	"github.com/ryvix/agent/pkg/systemd"
	"github.com/ryvix/agent/pkg/telemetry"
)

type Config struct {
	ServerID        string
	Hostname        string
	Token           string
	ControlPlaneURL string
	Interval        time.Duration
}

type AgentDaemon struct {
	config     Config
	collector  telemetry.Collector
	firewall   *firewall.FirewallManager
	systemd    *systemd.SystemdManager
	docker     *container.DockerManager
	dispatcher *dispatcher.Dispatcher
	seq        int64
}

func NewAgentDaemon(cfg Config) *AgentDaemon {
	if cfg.Hostname == "" {
		h, err := os.Hostname()
		if err == nil {
			cfg.Hostname = h
		} else {
			cfg.Hostname = "app-worker-host"
		}
	}
	if cfg.ServerID == "" {
		cfg.ServerID = "srv_" + cfg.Hostname
	}
	if cfg.Interval == 0 {
		cfg.Interval = 5 * time.Second
	}

	return &AgentDaemon{
		config:     cfg,
		collector:  telemetry.NewCollector(),
		firewall:   firewall.NewFirewallManager(),
		systemd:    systemd.NewSystemdManager(),
		docker:     container.NewDockerManager(),
		dispatcher: dispatcher.NewDispatcher(cfg.ControlPlaneURL, cfg.Token),
	}
}

// GatherSnapshot builds the full telemetry payload.
func (a *AgentDaemon) GatherSnapshot() telemetry.HostTelemetryPayload {
	a.seq++
	metrics, _ := a.collector.CollectMetrics()
	osType, kernelVer := a.collector.GetOSInfo()
	services := a.systemd.ScanMonitoredServices()
	containers := a.docker.ScanContainers()

	return telemetry.HostTelemetryPayload{
		ServerID:      a.config.ServerID,
		Hostname:      a.config.Hostname,
		Timestamp:     telemetry.CurrentISO8601(),
		OSType:        osType,
		KernelVersion: kernelVer,
		HeartbeatSeq:  a.seq,
		Metrics:       metrics,
		Services:      services,
		Containers:    containers,
	}
}

// Run starts the daemon event loop.
func (a *AgentDaemon) Run(ctx context.Context) error {
	log.Printf("[Ryvix Agent] Starting native in-band daemon on host '%s' (ServerID: %s)", a.config.Hostname, a.config.ServerID)
	log.Printf("[Ryvix Agent] Polling interval: %s | Control Plane: %s", a.config.Interval, a.config.ControlPlaneURL)

	ticker := time.NewTicker(a.config.Interval)
	defer ticker.Stop()

	// Initial heartbeat
	a.tick()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Ryvix Agent] Daemon shutting down gracefully...")
			return nil
		case <-ticker.C:
			a.tick()
		}
	}
}

func (a *AgentDaemon) tick() {
	payload := a.GatherSnapshot()
	log.Printf("[Ryvix Agent] Heartbeat #%d: CPU=%.1f%% RAM=%.1f%% Disk=%.1f%% (Cores: %d, Load: %.2f)",
		payload.HeartbeatSeq,
		payload.Metrics.CPUUsagePercent,
		payload.Metrics.MemoryUsagePercent,
		payload.Metrics.DiskUsagePercent,
		payload.Metrics.CPUCores,
		payload.Metrics.LoadAverage[0],
	)

	resp, err := a.dispatcher.SendTelemetry(payload)
	if err != nil {
		log.Printf("[Ryvix Agent] Telemetry dispatch note: %v", err)
		return
	}

	if resp != nil && len(resp.Commands) > 0 {
		for _, cmd := range resp.Commands {
			a.executeCommand(cmd)
		}
	}
}

func (a *AgentDaemon) executeCommand(cmd dispatcher.RemoteCommand) {
	log.Printf("[Ryvix Agent] Received authorized control plane command: %s", cmd.Action)

	switch cmd.Action {
	case "firewall.block_ip":
		ip, _ := cmd.Params["ip"].(string)
		reason, _ := cmd.Params["reason"].(string)
		msg, err := a.firewall.BlockIP(ip, reason)
		if err != nil {
			log.Printf("[Ryvix Agent] Error blocking IP %s: %v", ip, err)
		} else {
			log.Printf("[Ryvix Agent] %s", msg)
		}

	case "systemd.restart_service":
		svc, _ := cmd.Params["service"].(string)
		msg, err := a.systemd.RestartService(svc)
		if err != nil {
			log.Printf("[Ryvix Agent] Error restarting service %s: %v", svc, err)
		} else {
			log.Printf("[Ryvix Agent] %s", msg)
		}

	case "docker.restart_container":
		cid, _ := cmd.Params["containerId"].(string)
		err := a.docker.RestartContainer(cid)
		if err != nil {
			log.Printf("[Ryvix Agent] Error restarting container %s: %v", cid, err)
		} else {
			log.Printf("[Ryvix Agent] Container %s restarted successfully", cid)
		}

	default:
		log.Printf("[Ryvix Agent] Unknown or unapproved action: %s", cmd.Action)
	}
}
