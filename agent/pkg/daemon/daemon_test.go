package daemon

import (
	"context"
	"errors"
	"testing"

	"github.com/ryvix/agent/pkg/telemetry"
)

type failingCollector struct{}

func (failingCollector) CollectMetrics() (telemetry.SystemMetrics, error) {
	return telemetry.SystemMetrics{}, errors.New("measurement unavailable")
}
func (failingCollector) GetOSInfo() (string, string) { return "", "" }

func TestCollectionFailureDoesNotProduceSnapshot(t *testing.T) {
	daemon := NewAgentDaemon(Config{})
	daemon.collector = failingCollector{}
	payload, err := daemon.GatherSnapshot()
	if err == nil || payload.Timestamp != "" || payload.HeartbeatSeq != 0 {
		t.Fatal("Failed collection must not emit an apparently valid snapshot")
	}
}

func TestMissingEnrollmentFailsBeforeDispatch(t *testing.T) {
	daemon := NewAgentDaemon(Config{})
	if daemon.config.ServerID != "" {
		t.Fatal("Missing server identity must not be fabricated")
	}
	if err := daemon.Run(context.Background()); err == nil {
		t.Fatal("Daemon must require persisted enrollment credentials")
	}
}
