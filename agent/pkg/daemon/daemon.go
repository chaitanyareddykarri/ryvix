package daemon

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ryvix/agent/pkg/commands"
	"github.com/ryvix/agent/pkg/container"
	"github.com/ryvix/agent/pkg/dispatcher"
	"github.com/ryvix/agent/pkg/systemd"
	"github.com/ryvix/agent/pkg/telemetry"
)

type Config struct {
	ServerID         string
	Hostname         string
	Token            string
	ControlPlaneURL  string
	Interval         time.Duration
	CommandPublicKey string
	CommandServices  []string
	CommandJournal   string
}

type AgentDaemon struct {
	config     Config
	collector  telemetry.Collector
	systemd    *systemd.SystemdManager
	docker     *container.DockerManager
	dispatcher *dispatcher.Dispatcher
	seq        int64
	commands   *commands.Client
}

func NewAgentDaemon(cfg Config) *AgentDaemon {
	if cfg.Hostname == "" {
		h, err := os.Hostname()
		if err == nil {
			cfg.Hostname = h
		}
	}
	if cfg.Interval == 0 {
		cfg.Interval = 5 * time.Second
	}

	return &AgentDaemon{
		commands:   &commands.Client{Origin: cfg.ControlPlaneURL, ServerID: cfg.ServerID, PrivateSeed: cfg.Token, PublicKey: cfg.CommandPublicKey, Services: cfg.CommandServices, Journal: cfg.CommandJournal},
		config:     cfg,
		collector:  telemetry.NewCollector(),
		systemd:    systemd.NewSystemdManager(),
		docker:     container.NewDockerManager(),
		dispatcher: dispatcher.NewDispatcher(cfg.ControlPlaneURL, cfg.Token),
	}
}

// GatherSnapshot builds the full telemetry payload.
func (a *AgentDaemon) GatherSnapshot() (telemetry.HostTelemetryPayload, error) {
	a.seq++
	metrics, err := a.collector.CollectMetrics()
	if err != nil {
		return telemetry.HostTelemetryPayload{}, fmt.Errorf("host metrics unavailable: %w", err)
	}
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
	}, nil
}

// Run starts the daemon event loop.
func (a *AgentDaemon) Run(ctx context.Context) error {
	if a.config.ServerID == "" || a.config.Token == "" || a.config.ControlPlaneURL == "" {
		return fmt.Errorf("enrolled server identity, credential and control plane URL are required")
	}
	if a.config.Interval < time.Second {
		return fmt.Errorf("telemetry interval must be at least one second")
	}
	log.Printf("[Ryvix Agent] Starting native in-band daemon on host '%s' (ServerID: %s)", a.config.Hostname, a.config.ServerID)
	log.Printf("[Ryvix Agent] Polling interval: %s | Control Plane: %s", a.config.Interval, a.config.ControlPlaneURL)

	delay := a.config.Interval
	for {
		if a.tick() {
			delay = a.config.Interval
		} else {
			delay *= 2
			if delay > time.Minute {
				delay = time.Minute
			}
		}
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			log.Println("[Ryvix Agent] Daemon shutting down gracefully...")
			return nil
		case <-timer.C:
		}
	}
}

func (a *AgentDaemon) tick() bool {
	payload, collectErr := a.GatherSnapshot()
	if collectErr != nil {
		log.Printf("[Ryvix Agent] %v", collectErr)
		return false
	}
	log.Printf("[Ryvix Agent] Heartbeat #%d: CPU=%.1f%% RAM=%.1f%% Disk=%.1f%% (Cores: %d, Load: %.2f)",
		payload.HeartbeatSeq,
		payload.Metrics.CPUUsagePercent,
		payload.Metrics.MemoryUsagePercent,
		payload.Metrics.DiskUsagePercent,
		payload.Metrics.CPUCores,
		payload.Metrics.LoadAverage[0],
	)

	_, err := a.dispatcher.SendTelemetry(payload)
	if err != nil {
		log.Printf("[Ryvix Agent] Telemetry dispatch note: %v", err)
		return false
	}
	if a.config.CommandPublicKey != "" {
		if err := a.commands.Cycle(context.Background()); err != nil {
			log.Print("[Ryvix Agent] Approved command channel unavailable; inspect configuration and pending outcomes")
		}
	}

	return true
}
