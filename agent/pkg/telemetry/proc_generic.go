//go:build !linux

package telemetry

import (
	"fmt"
	"runtime"
)

type GenericCollector struct{}

func NewCollector() Collector { return &GenericCollector{} }

func (c *GenericCollector) CollectMetrics() (SystemMetrics, error) {
	return SystemMetrics{}, fmt.Errorf("host telemetry collection is not supported on %s", runtime.GOOS)
}

func (c *GenericCollector) GetOSInfo() (string, string) {
	return runtime.GOOS, ""
}
