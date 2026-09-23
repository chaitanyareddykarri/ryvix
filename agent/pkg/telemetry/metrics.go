package telemetry

import "time"

// SystemMetrics contains numeric host resource telemetry.
type SystemMetrics struct {
	CPUCores           int       `json:"cpuCores"`
	CPUUsagePercent    float64   `json:"cpuUsagePercent"`
	MemoryTotalMb      float64   `json:"memoryTotalMb"`
	MemoryUsedMb       float64   `json:"memoryUsedMb"`
	MemoryUsagePercent float64   `json:"memoryUsagePercent"`
	DiskTotalGb        float64   `json:"diskTotalGb"`
	DiskUsedGb         float64   `json:"diskUsedGb"`
	DiskUsagePercent   float64   `json:"diskUsagePercent"`
	LoadAverage        [3]float64`json:"loadAverage"`
}

// SystemdServiceState tracks the status of a specific systemd unit.
type SystemdServiceState struct {
	Name     string `json:"name"`
	Status   string `json:"status"`   // active, inactive, failed, restarting
	SubState string `json:"subState"` // running, dead, exited
}

// ContainerState tracks active or failed container instances.
type ContainerState struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Image  string `json:"image"`
	Status string `json:"status"` // running, exited, restarting
}

// HostTelemetryPayload is the full outbound payload sent to Ryvix control plane.
type HostTelemetryPayload struct {
	ServerID      string                `json:"serverId"`
	Hostname      string                `json:"hostname"`
	Timestamp     string                `json:"timestamp"`
	OSType        string                `json:"osType"`
	KernelVersion string                `json:"kernelVersion"`
	HeartbeatSeq  int64                 `json:"heartbeatSeq"`
	Metrics       SystemMetrics         `json:"metrics"`
	Services      []SystemdServiceState `json:"services"`
	Containers    []ContainerState      `json:"containers"`
}

// CapabilityExecutionResult represents the outcome of an authorized command.
type CapabilityExecutionResult struct {
	Command       string `json:"command"`
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	ExecutedAt    string `json:"executedAt"`
	OutputSummary string `json:"outputSummary,omitempty"`
	BytesFreed    int64  `json:"bytesFreed,omitempty"`
}

// Collector is the platform-agnostic interface for gathering host metrics.
type Collector interface {
	CollectMetrics() (SystemMetrics, error)
	GetOSInfo() (string, string)
}

func CurrentISO8601() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}
