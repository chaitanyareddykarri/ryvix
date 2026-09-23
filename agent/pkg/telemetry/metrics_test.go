package telemetry

import (
	"testing"
)

func TestCollectorMetrics(t *testing.T) {
	c := NewCollector()
	metrics, err := c.CollectMetrics()
	if err != nil {
		t.Fatalf("CollectMetrics returned error: %v", err)
	}

	if metrics.CPUCores <= 0 {
		t.Errorf("Expected positive CPUCores, got %d", metrics.CPUCores)
	}
	if metrics.MemoryTotalMb <= 0 {
		t.Errorf("Expected positive MemoryTotalMb, got %f", metrics.MemoryTotalMb)
	}
	if metrics.DiskTotalGb <= 0 {
		t.Errorf("Expected positive DiskTotalGb, got %f", metrics.DiskTotalGb)
	}

	osType, kernelVer := c.GetOSInfo()
	if osType == "" || kernelVer == "" {
		t.Errorf("Expected valid OS info, got osType='%s', kernelVer='%s'", osType, kernelVer)
	}
}
