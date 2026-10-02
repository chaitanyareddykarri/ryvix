package dispatcher

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ryvix/agent/pkg/telemetry"
)

func TestTelemetryAcknowledgement(t *testing.T) {
	pub, key, _ := ed25519.GenerateKey(rand.Reader)
	seed := base64.StdEncoding.EncodeToString(key.Seed())
	for _, test := range []struct {
		name, body string
		valid      bool
	}{
		{"accepted", `{"success":true}`, true},
		{"empty command list", `{"success":true,"commands":[]}`, true},
		{"unsigned restart", `{"success":true,"commands":[{"action":"systemd.restart_service","params":{"service":"nginx"}}]}`, false},
		{"unsigned firewall change", `{"success":true,"commands":[{"action":"firewall.block_ip","params":{"ip":"192.0.2.1"}}]}`, false},
		{"unsigned container restart", `{"success":true,"commands":[{"action":"docker.restart_container","params":{"containerId":"test"}}]}`, false},
		{"rejected", `{"success":false,"commands":[{"action":"reboot"}]}`, false},
		{"empty", "", false}, {"html", "<html>gateway failure</html>", false},
		{"missing acknowledgement", `{}`, false},
		{"trailing data", `{"success":true} {"success":true}`, false},
		{"oversized", `{"success":true,"padding":"` + strings.Repeat("x", 65536) + `"}`, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				body, _ := io.ReadAll(r.Body)
				signature, _ := base64.StdEncoding.DecodeString(r.Header.Get("X-Ryvix-Signature"))
				message := fmt.Sprintf("POST\n/api/connector/telemetry\n%s\n%s\n%x", r.Header.Get("X-Ryvix-Timestamp"), r.Header.Get("X-Ryvix-Nonce"), sha256.Sum256(body))
				if !ed25519.Verify(pub, []byte(message), signature) || r.Header.Get("X-Ryvix-Agent-Token") != "" {
					t.Error("Missing credential")
				}
				w.Write([]byte(test.body))
			}))
			defer server.Close()
			d := NewDispatcher(server.URL, seed)
			d.client.Transport = server.Client().Transport
			response, err := d.SendTelemetry(telemetry.HostTelemetryPayload{})
			if test.valid && (err != nil || response == nil || !response.Success) {
				t.Fatalf("Acknowledgement rejected: %v", err)
			}
			if !test.valid && (err == nil || response != nil) {
				t.Fatal("Invalid acknowledgement must not return executable commands")
			}
		})
	}
}

func TestSecurityReportSignature(t *testing.T) {
	pub, key, _ := ed25519.GenerateKey(rand.Reader)
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/connector/security" {
			t.Error("wrong signed endpoint")
		}
		body, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("POST\n/api/connector/security\n%s\n%s\n%x", r.Header.Get("X-Ryvix-Timestamp"), r.Header.Get("X-Ryvix-Nonce"), sha256.Sum256(body))
		signature, _ := base64.StdEncoding.DecodeString(r.Header.Get("X-Ryvix-Signature"))
		if !ed25519.Verify(pub, []byte(message), signature) {
			t.Error("invalid security signature")
		}
		if !strings.Contains(string(body), `"serverId":"enrolled-server"`) {
			t.Error("enrolled identity missing")
		}
		fmt.Fprint(w, `{"success":true,"received":1}`)
	}))
	defer server.Close()
	d := NewDispatcher(server.URL, base64.StdEncoding.EncodeToString(key.Seed()))
	d.client = server.Client()
	if _, err := d.SendSecurityEvents("enrolled-server", []byte(`[{"id":"fixture"}]`)); err != nil {
		t.Fatal(err)
	}
	if _, err := d.SendSecurityEvents("enrolled-server", []byte(`[]`)); err == nil {
		t.Fatal("empty event batch accepted")
	}
}

func TestCredentialsDoNotFollowRedirects(t *testing.T) {
	_, key, _ := ed25519.GenerateKey(rand.Reader)
	seed := base64.StdEncoding.EncodeToString(key.Seed())
	redirected := false
	target := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirected = true }))
	defer target.Close()
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
	}))
	defer server.Close()
	d := NewDispatcher(server.URL, seed)
	d.client.Transport = server.Client().Transport
	if response, err := d.SendTelemetry(telemetry.HostTelemetryPayload{}); err == nil || response != nil {
		t.Fatal("Redirect accepted")
	}
	if redirected {
		t.Fatal("Credential request followed a redirect")
	}
}

func TestUnsafeControlPlaneRejected(t *testing.T) {
	for _, endpoint := range []string{"http://localhost:3000", "https://user:secret@example.test", "https://example.test?secret=value", "https://example.test/path", ""} {
		d := NewDispatcher(endpoint, "test-credential")
		if _, err := d.SendTelemetry(telemetry.HostTelemetryPayload{}); err == nil {
			t.Fatal("Unsafe endpoint accepted")
		}
	}
	if _, err := NewDispatcher("https://example.test", "").SendTelemetry(telemetry.HostTelemetryPayload{}); err == nil {
		t.Fatal("Missing credential accepted")
	}
}
