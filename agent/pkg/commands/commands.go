// Package commands implements the separately approved command channel.
// Telemetry acknowledgements remain unable to execute commands.
package commands

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

type Envelope struct {
	Payload   string `json:"payload"`
	Signature string `json:"signature"`
}
type Command struct {
	Version    int    `json:"version"`
	ID         string `json:"id"`
	ServerID   string `json:"serverId"`
	ApprovalID string `json:"approvalId"`
	Action     string `json:"action"`
	Service    string `json:"service"`
	IssuedAt   int64  `json:"issuedAt"`
	ExpiresAt  int64  `json:"expiresAt"`
}
type Result struct {
	ServerID     string `json:"serverId"`
	CommandID    string `json:"commandId"`
	Status       string `json:"status"`
	ServiceState string `json:"serviceState"`
}
type entry struct {
	ExpiresAt int64  `json:"expiresAt"`
	Result    Result `json:"result"`
	Ack       bool   `json:"ack"`
}
type Runner func(context.Context, string, ...string) error
type Client struct {
	Origin, ServerID, PrivateSeed, PublicKey, Journal string
	Services                                          []string
	HTTP                                              *http.Client
	Run                                               Runner
	mu                                                sync.Mutex
}

var uuid = regexp.MustCompile(`^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$`)
var unit = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_.@-]{0,119}\.service$`)

func Verify(envelope Envelope, server, public string, services []string, now time.Time) (Command, error) {
	var command Command
	if len(envelope.Payload) > 4096 || len(envelope.Signature) != 88 {
		return command, fmt.Errorf("invalid command envelope")
	}
	der, err := base64.StdEncoding.DecodeString(public)
	if err != nil {
		return command, fmt.Errorf("invalid pinned key")
	}
	parsed, err := x509.ParsePKIXPublicKey(der)
	if err != nil {
		return command, fmt.Errorf("invalid pinned key")
	}
	key, ok := parsed.(ed25519.PublicKey)
	if !ok {
		return command, fmt.Errorf("Ed25519 pinned key required")
	}
	signature, err := base64.StdEncoding.DecodeString(envelope.Signature)
	if err != nil || !ed25519.Verify(key, []byte("ryvix-command-v1\n"+envelope.Payload), signature) {
		return command, fmt.Errorf("command signature rejected")
	}
	data, err := base64.RawURLEncoding.DecodeString(envelope.Payload)
	if err != nil {
		return command, fmt.Errorf("invalid command payload")
	}
	if json.Unmarshal(data, &command) != nil {
		return command, fmt.Errorf("invalid command JSON")
	}
	allowed := false
	for _, service := range services {
		if service == command.Service {
			allowed = true
		}
	}
	if command.Version != 1 || !uuid.MatchString(command.ID) || !uuid.MatchString(command.ApprovalID) || command.ServerID != server || command.Action != "restart_service" ||
		!unit.MatchString(command.Service) || !allowed || command.IssuedAt > now.UnixMilli()+30000 || command.ExpiresAt <= now.UnixMilli() || command.ExpiresAt-command.IssuedAt != 120000 {
		return command, fmt.Errorf("expired or unauthorized command")
	}
	return command, nil
}

func (c *Client) load() (map[string]entry, error) {
	state := map[string]entry{}
	info, err := os.Lstat(c.Journal)
	if os.IsNotExist(err) {
		return state, nil
	}
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() > 1024*1024 {
		return nil, fmt.Errorf("private bounded command journal required")
	}
	data, err := os.ReadFile(c.Journal)
	if err != nil {
		return nil, err
	}
	if json.Unmarshal(data, &state) != nil || state == nil {
		return nil, fmt.Errorf("invalid command journal")
	}
	return state, nil
}
func (c *Client) save(state map[string]entry) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	if len(data) > 1024*1024 {
		return fmt.Errorf("command journal full; operator review required")
	}
	file, err := os.CreateTemp(filepath.Dir(c.Journal), ".ryvix-command-*")
	if err != nil {
		return err
	}
	name := file.Name()
	defer os.Remove(name)
	if err = file.Chmod(0600); err == nil {
		_, err = file.Write(data)
	}
	if err == nil {
		err = file.Sync()
	}
	closeErr := file.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	if err = os.Rename(name, c.Journal); err != nil {
		return err
	}
	// The parent directory entry must be durable before any operation executes.
	dir, err := os.Open(filepath.Dir(c.Journal))
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}

// Process journals unknown BEFORE execution. A crash never causes reexecution.
func (c *Client) Process(ctx context.Context, envelope Envelope) (Result, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	unlock, lockErr := lockJournal(c.Journal)
	if lockErr != nil {
		return Result{}, lockErr
	}
	defer unlock()
	command, err := Verify(envelope, c.ServerID, c.PublicKey, c.Services, time.Now())
	if err != nil {
		return Result{}, err
	}
	state, err := c.load()
	if err != nil {
		return Result{}, err
	}
	if previous, ok := state[command.ID]; ok {
		return previous.Result, nil
	}
	result := Result{c.ServerID, command.ID, "unknown", "unknown"}
	// O_EXCL also fences separate daemon processes using the same private journal.
	// A marker without a journal result means an interrupted attempt, never retry.
	marker, claimErr := os.OpenFile(c.Journal+"."+command.ID, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if claimErr != nil && !os.IsExist(claimErr) {
		return Result{}, claimErr
	}
	claimed := claimErr == nil
	if claimed {
		syncErr := marker.Sync()
		closeErr := marker.Close()
		if syncErr != nil {
			return Result{}, syncErr
		}
		if closeErr != nil {
			return Result{}, closeErr
		}
	}
	state[command.ID] = entry{ExpiresAt: command.ExpiresAt, Result: result}
	if err = c.save(state); err != nil {
		return Result{}, err
	}
	if !claimed {
		return result, nil
	}
	run := c.Run
	if run == nil {
		run = func(ctx context.Context, name string, args ...string) error {
			return exec.CommandContext(ctx, name, args...).Run()
		}
	}
	bounded, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err = run(bounded, "/usr/bin/systemctl", "restart", "--", command.Service); err != nil {
		if bounded.Err() == nil {
			result.Status = "failed"
		}
	} else {
		probe, stop := context.WithTimeout(ctx, 5*time.Second)
		err = run(probe, "/usr/bin/systemctl", "is-active", "--quiet", "--", command.Service)
		stop()
		if err == nil {
			result.Status = "succeeded"
			result.ServiceState = "active"
		} else {
			result.Status = "failed"
			result.ServiceState = "unknown"
		}
	}
	state[command.ID] = entry{ExpiresAt: command.ExpiresAt, Result: result}
	if err = c.save(state); err != nil {
		return Result{}, err
	}
	return result, nil
}
func (c *Client) post(ctx context.Context, path string, input, output any) error {
	endpoint, err := url.Parse(c.Origin)
	if err != nil || endpoint.Scheme != "https" || endpoint.Hostname() == "" || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
		return fmt.Errorf("HTTPS control plane origin required")
	}
	seed, err := base64.StdEncoding.DecodeString(c.PrivateSeed)
	if err != nil || len(seed) != ed25519.SeedSize {
		return fmt.Errorf("enrolled identity required")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return err
	}
	nonce := make([]byte, 16)
	if _, err = rand.Read(nonce); err != nil {
		return err
	}
	nonce[6] = (nonce[6] & 15) | 64
	nonce[8] = (nonce[8] & 63) | 128
	nonceText := fmt.Sprintf("%x-%x-%x-%x-%x", nonce[:4], nonce[4:6], nonce[6:8], nonce[8:10], nonce[10:])
	timestamp := fmt.Sprint(time.Now().UnixMilli())
	endpoint.Path = path
	request, err := http.NewRequestWithContext(ctx, "POST", endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Ryvix-Timestamp", timestamp)
	request.Header.Set("X-Ryvix-Nonce", nonceText)
	message := fmt.Sprintf("POST\n%s\n%s\n%s\n%x", path, timestamp, nonceText, sha256.Sum256(body))
	request.Header.Set("X-Ryvix-Signature", base64.StdEncoding.EncodeToString(ed25519.Sign(ed25519.NewKeyFromSeed(seed), []byte(message))))
	client := c.HTTP
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
	}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("command transport unavailable")
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, 8193))
	if err != nil || len(data) > 8192 || response.StatusCode != 200 {
		return fmt.Errorf("command request not acknowledged")
	}
	if json.Unmarshal(data, output) != nil {
		return fmt.Errorf("invalid command response")
	}
	return nil
}
func (c *Client) flush(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	unlock, lockErr := lockJournal(c.Journal)
	if lockErr != nil {
		return lockErr
	}
	defer unlock()
	state, err := c.load()
	if err != nil {
		return err
	}
	for id, item := range state {
		if item.Ack {
			if item.ExpiresAt < time.Now().Add(-24*time.Hour).UnixMilli() {
				delete(state, id)
			}
			continue
		}
		var ack struct {
			Acknowledged bool `json:"acknowledged"`
		}
		if err = c.post(ctx, "/api/connector/commands/result", item.Result, &ack); err != nil {
			return err
		}
		if !ack.Acknowledged {
			return fmt.Errorf("receipt not acknowledged")
		}
		item.Ack = true
		state[id] = item
		if err = c.save(state); err != nil {
			return err
		}
	}
	return c.save(state)
}
func (c *Client) Cycle(ctx context.Context) error {
	if c.PublicKey == "" || len(c.Services) == 0 || c.Journal == "" {
		return fmt.Errorf("command configuration unavailable")
	}
	if !filepath.IsAbs(c.Journal) || strings.ContainsAny(c.Journal, "\r\n") {
		return fmt.Errorf("absolute private journal path required")
	}
	if err := c.flush(ctx); err != nil {
		return err
	}
	var reply struct {
		Command *Envelope `json:"command"`
	}
	if err := c.post(ctx, "/api/connector/commands/poll", map[string]string{"serverId": c.ServerID}, &reply); err != nil {
		return err
	}
	if reply.Command == nil {
		return nil
	}
	if _, err := c.Process(ctx, *reply.Command); err != nil {
		return err
	}
	return c.flush(ctx)
}
