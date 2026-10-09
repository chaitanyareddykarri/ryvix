package dispatcher

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
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
			Timeout:       10 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
		},
	}
}

// SendTelemetry dispatches outbound telemetry JSON to Ryvix control plane.
func (d *Dispatcher) SendTelemetry(payload telemetry.HostTelemetryPayload) (*TelemetryResponse, error) {
	return d.send(payload, "/api/connector/telemetry", 256*1024)
}

// SendSecurityEvents forwards measured detector events under the enrolled identity.
// Event IDs must be stable across retries; the backend deduplicates them.
func (d *Dispatcher) SendLogs(serverID string, entries interface{}) (*TelemetryResponse, error) {
	return d.send(struct {
		ServerID string      `json:"serverId"`
		Entries  interface{} `json:"entries"`
	}{serverID, entries}, "/api/connector/logs", 131072)
}

func (d *Dispatcher) SendSecurityEvents(serverID string, events json.RawMessage) (*TelemetryResponse, error) {
	var entries []json.RawMessage
	if serverID == "" || json.Unmarshal(events, &entries) != nil || len(entries) == 0 || len(entries) > 20 {
		return nil, fmt.Errorf("one to twenty measured security events are required")
	}
	return d.send(struct {
		ServerID string          `json:"serverId"`
		Events   json.RawMessage `json:"events"`
	}{serverID, events}, "/api/connector/security", 32768)
}

func (d *Dispatcher) send(payload interface{}, requestPath string, maximum int) (*TelemetryResponse, error) {
	endpoint, parseErr := url.Parse(d.controlPlaneURL)
	if parseErr != nil || endpoint.Scheme != "https" || endpoint.Hostname() == "" || endpoint.User != nil ||
		endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
		return nil, fmt.Errorf("control plane must be an HTTPS origin without credentials, query or path")
	}
	seed, seedErr := base64.StdEncoding.DecodeString(d.token)
	if seedErr != nil || len(seed) != ed25519.SeedSize || strings.ContainsAny(d.token, "\r\n") {
		return nil, fmt.Errorf("enrolled device private seed is required")
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal telemetry: %w", err)
	}

	if len(data) > maximum {
		return nil, fmt.Errorf("report payload exceeds limit")
	}
	endpoint.Path = requestPath
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, endpoint.String(), bytes.NewBuffer(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return nil, fmt.Errorf("nonce generation failed")
	}
	nonceBytes[6] = (nonceBytes[6] & 0x0f) | 0x40
	nonceBytes[8] = (nonceBytes[8] & 0x3f) | 0x80
	nonce := fmt.Sprintf("%x-%x-%x-%x-%x", nonceBytes[0:4], nonceBytes[4:6], nonceBytes[6:8], nonceBytes[8:10], nonceBytes[10:16])
	timestamp := fmt.Sprintf("%d", time.Now().UnixMilli())
	message := fmt.Sprintf("POST\n%s\n%s\n%s\n%x", requestPath, timestamp, nonce, sha256.Sum256(data))
	req.Header.Set("X-Ryvix-Timestamp", timestamp)
	req.Header.Set("X-Ryvix-Nonce", nonce)
	req.Header.Set("X-Ryvix-Signature", base64.StdEncoding.EncodeToString(ed25519.Sign(ed25519.NewKeyFromSeed(seed), []byte(message))))

	resp, err := d.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("telemetry dispatch failed; check TLS and connectivity")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("control plane returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 65537))
	if err != nil || len(body) > 65536 {
		return nil, fmt.Errorf("invalid or oversized telemetry acknowledgement")
	}
	var res TelemetryResponse
	if err := json.Unmarshal(body, &res); err != nil || !res.Success {
		return nil, fmt.Errorf("control plane did not acknowledge telemetry")
	}
	// Telemetry authentication does not authorize operational commands. Until a
	// separate signed, expiring, replay-protected approval protocol exists, no
	// acknowledgement may carry commands into the daemon.
	if len(res.Commands) != 0 {
		return nil, fmt.Errorf("remote commands are unavailable on the telemetry channel")
	}
	return &res, nil
}
