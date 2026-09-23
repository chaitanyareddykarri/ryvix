package dispatcher

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ryvix/agent/pkg/telemetry"
)

type Dispatcher struct {
	controlPlaneURL string
	token           string
	client          *http.Client
}

// RemoteCommand represents an incoming action from Ryvix control plane.
type RemoteCommand struct {
	Action string                 `json:"action"`
	Params map[string]interface{} `json:"params"`
}

// TelemetryResponse represents the reply from the control plane.
type TelemetryResponse struct {
	Success  bool            `json:"success"`
	Commands []RemoteCommand `json:"commands,omitempty"`
}

func NewDispatcher(controlPlaneURL, token string) *Dispatcher {
	return &Dispatcher{
		controlPlaneURL: controlPlaneURL,
		token:           token,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendTelemetry dispatches outbound telemetry JSON to Ryvix control plane.
func (d *Dispatcher) SendTelemetry(payload telemetry.HostTelemetryPayload) (*TelemetryResponse, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal telemetry: %w", err)
	}

	url := fmt.Sprintf("%s/api/connector/telemetry", d.controlPlaneURL)
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, url, bytes.NewBuffer(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if d.token != "" {
		req.Header.Set("X-Ryvix-Agent-Token", d.token)
	}

	resp, err := d.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("telemetry dispatch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("control plane returned HTTP %d", resp.StatusCode)
	}

	var res TelemetryResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return &TelemetryResponse{Success: true}, nil
	}
	return &res, nil
}
