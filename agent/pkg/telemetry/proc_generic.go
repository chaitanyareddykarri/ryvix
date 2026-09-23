//go:build !linux

package telemetry

import (
	"math"
	"math/rand"
	"runtime"
	"time"
)

type GenericCollector struct {
	startTime time.Time
}

func NewCollector() Collector {
	return &GenericCollector{startTime: time.Now()}
}

func (c *GenericCollector) CollectMetrics() (SystemMetrics, error) {
	cores := runtime.NumCPU()
	// Deterministic simulation for local dev on non-Linux
	randVal := rand.Float64()
	cpuPercent := math.Round((18.0 + randVal*15.0)*10) / 10
	memTotal := 16384.0
	memPercent := math.Round((42.0 + randVal*10.0)*10) / 10
	memUsed := math.Round((memTotal * memPercent) / 100.0)

	return SystemMetrics{
		CPUCores:           cores,
		CPUUsagePercent:    cpuPercent,
		MemoryTotalMb:      memTotal,
		MemoryUsedMb:       memUsed,
		MemoryUsagePercent: memPercent,
		DiskTotalGb:        512.0,
		DiskUsedGb:         168.0,
		DiskUsagePercent:   32.8,
		LoadAverage:        [3]float64{0.32, 0.45, 0.41},
	}, nil
}

func (c *GenericCollector) GetOSInfo() (string, string) {
	return runtime.GOOS + " (" + runtime.GOARCH + ")", "Host-Runtime"
}
