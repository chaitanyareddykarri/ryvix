package commands

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func fixture(t *testing.T) (Envelope, string, Command) {
	t.Helper()
	public, private, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKIXPublicKey(public)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UnixMilli()
	command := Command{1, "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333", "restart_service", "nginx.service", now, now + 120000}
	body, _ := json.Marshal(command)
	payload := base64.RawURLEncoding.EncodeToString(body)
	return Envelope{payload, base64.StdEncoding.EncodeToString(ed25519.Sign(private, []byte("ryvix-command-v1\n"+payload)))}, base64.StdEncoding.EncodeToString(der), command
}
func TestSignatureTargetExpiryAllowlist(t *testing.T) {
	envelope, key, command := fixture(t)
	if _, err := Verify(envelope, command.ServerID, key, []string{"nginx.service"}, time.Now()); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		server   string
		services []string
		now      time.Time
	}{
		{"wrong", []string{"nginx.service"}, time.Now()},
		{command.ServerID, []string{"other.service"}, time.Now()},
		{command.ServerID, []string{"nginx.service"}, time.Now().Add(3 * time.Minute)},
	} {
		if _, err := Verify(envelope, tc.server, key, tc.services, tc.now); err == nil {
			t.Fatal("Unauthorized command accepted")
		}
	}
	envelope.Payload += "x"
	if _, err := Verify(envelope, command.ServerID, key, []string{"nginx.service"}, time.Now()); err == nil {
		t.Fatal("Tampered payload accepted")
	}
}
func TestJournalPreventsReplayAcrossRestart(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Durable directory fsync and systemd command path are Linux-only")
	}
	envelope, key, command := fixture(t)
	calls := 0
	runner := func(_ context.Context, name string, args ...string) error {
		calls++
		if name != "/usr/bin/systemctl" || args[len(args)-1] != "nginx.service" {
			t.Fatal("Unexpected execution target")
		}
		return nil
	}
	c := &Client{ServerID: command.ServerID, PublicKey: key, Services: []string{"nginx.service"}, Journal: filepath.Join(t.TempDir(), "commands.json"), Run: runner}
	result, err := c.Process(context.Background(), envelope)
	if err != nil || result.Status != "succeeded" || calls != 2 {
		t.Fatalf("Execution/verification failed: %v", err)
	}
	restarted := &Client{ServerID: c.ServerID, PublicKey: key, Services: c.Services, Journal: c.Journal, Run: runner}
	if _, err = restarted.Process(context.Background(), envelope); err != nil || calls != 2 {
		t.Fatal("Restart reexecuted a command")
	}
}
func TestCrashMarkerNeverExecutes(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Durable directory fsync is Linux-only")
	}
	envelope, key, command := fixture(t)
	journal := filepath.Join(t.TempDir(), "commands.json")
	if err := os.WriteFile(journal+"."+command.ID, []byte{}, 0600); err != nil {
		t.Fatal(err)
	}
	c := &Client{ServerID: command.ServerID, PublicKey: key, Services: []string{"nginx.service"}, Journal: journal, Run: func(context.Context, string, ...string) error { t.Fatal("Crash marker reexecuted"); return nil }}
	result, err := c.Process(context.Background(), envelope)
	if err != nil || result.Status != "unknown" {
		t.Fatal("Interrupted execution must remain unknown", err)
	}
}
func TestJournalFailurePreventsExecution(t *testing.T) {
	envelope, key, command := fixture(t)
	c := &Client{ServerID: command.ServerID, PublicKey: key, Services: []string{"nginx.service"}, Journal: filepath.Join(t.TempDir(), "missing", "commands.json"), Run: func(context.Context, string, ...string) error {
		t.Fatal("Execution before durable journal")
		return nil
	}}
	if _, err := c.Process(context.Background(), envelope); err == nil {
		t.Fatal("Missing journal should fail closed")
	}
}
