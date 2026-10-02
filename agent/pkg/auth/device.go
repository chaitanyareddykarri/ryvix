package auth

import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"strings"
	"time"
)

type DeviceConfig struct {
	ServerID         string   `json:"serverId"`
	PrivateSeed      string   `json:"privateSeed"`
	ControlPlaneURL  string   `json:"controlPlaneUrl"`
	CommandPublicKey string   `json:"commandPublicKey,omitempty"`
	CommandServices  []string `json:"commandServices,omitempty"`
	CommandJournal   string   `json:"commandJournal,omitempty"`
}

func LoadDevice(path string) (DeviceConfig, error) {
	var config DeviceConfig
	info, err := os.Lstat(path)
	if err != nil {
		return config, fmt.Errorf("device configuration unavailable")
	}
	if !info.Mode().IsRegular() || (runtime.GOOS != "windows" && info.Mode().Perm()&0077 != 0) {
		return config, fmt.Errorf("device configuration must be a private regular file (0600)")
	}
	data, err := os.ReadFile(path)
	if err != nil || len(data) > 8192 || json.Unmarshal(data, &config) != nil {
		return config, fmt.Errorf("invalid device configuration")
	}
	return config, nil
}

func EnrollDevice(origin, token, version, path string) error {
	endpoint, err := url.Parse(origin)
	if err != nil || endpoint.Scheme != "https" || endpoint.Hostname() == "" || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
		return fmt.Errorf("enrollment requires an HTTPS control plane origin")
	}
	if len(token) != 43 || strings.ContainsAny(token, "\r\n\t ") {
		return fmt.Errorf("invalid enrollment token")
	}
	// Reserve the private file before consuming the one-use token. Never replace an existing identity.
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("cannot create new private device configuration")
	}
	saved := false
	defer func() {
		file.Close()
		if !saved {
			os.Remove(path)
		}
	}()
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return fmt.Errorf("device key generation failed")
	}
	publicDER, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		return fmt.Errorf("device key encoding failed")
	}
	body, _ := json.Marshal(map[string]string{"enrollmentToken": token, "publicKey": base64.StdEncoding.EncodeToString(publicDER), "osType": runtime.GOOS, "agentVersion": version})
	endpoint.Path = "/api/connector/register"
	request, err := http.NewRequest(http.MethodPost, endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cannot create registration request")
	}
	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("registration connection failed; check TLS and connectivity")
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, 8193))
	if err != nil || len(data) > 8192 || response.StatusCode != http.StatusOK {
		return fmt.Errorf("registration not acknowledged (HTTP %d); do not reuse a consumed token", response.StatusCode)
	}
	var result struct {
		Success   bool `json:"success"`
		Connector struct {
			ServerID string `json:"serverId"`
		} `json:"connector"`
	}
	if json.Unmarshal(data, &result) != nil || !result.Success || result.Connector.ServerID == "" {
		return fmt.Errorf("invalid registration acknowledgement")
	}
	config := DeviceConfig{ServerID: result.Connector.ServerID, PrivateSeed: base64.StdEncoding.EncodeToString(privateKey.Seed()), ControlPlaneURL: origin}
	encoded, _ := json.Marshal(config)
	if _, err = file.Write(encoded); err != nil {
		return fmt.Errorf("cannot persist enrolled identity; revoke enrollment before retrying")
	}
	if err = file.Sync(); err != nil {
		return fmt.Errorf("cannot sync enrolled identity")
	}
	saved = true
	return nil
}
