// Package hostlogs collects only explicitly allowlisted journal units.
package hostlogs

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Entry struct {
	ID        string `json:"id"`
	Source    string `json:"source"`
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
	Severity  string `json:"severity"`
}

var unitPattern = regexp.MustCompile(`^[a-zA-Z0-9_.@-]{1,128}$`)
var credentials = regexp.MustCompile(`(?i)(password|passwd|secret|token|api[_-]?key)\s*[=:]\s*("[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)`)
var headers = regexp.MustCompile(`(?i)(authorization|cookie|set-cookie)\s*:[^\r\n]*`)
var bearerTokens = regexp.MustCompile(`(?:eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{36}|(?:gsk_|github_pat_)[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{35}|sk-[A-Za-z0-9_-]{20,})`)

func Parse(data []byte, unit string, now time.Time) ([]Entry, error) {
	if !unitPattern.MatchString(unit) || len(data) > 262144 {
		return nil, fmt.Errorf("invalid journal batch")
	}
	entries := []Entry{}
	scanner := bufio.NewScanner(bytes.NewReader(data))
	scanner.Buffer(make([]byte, 4096), 65536)
	for scanner.Scan() {
		var row map[string]interface{}
		if json.Unmarshal(scanner.Bytes(), &row) != nil {
			return nil, fmt.Errorf("invalid journal JSON")
		}
		message, ok := row["MESSAGE"].(string)
		if !ok || message == "" {
			continue
		}
		cursor, _ := row["__CURSOR"].(string)
		stamp, _ := row["__REALTIME_TIMESTAMP"].(string)
		micros, err := strconv.ParseInt(stamp, 10, 64)
		if err != nil || cursor == "" {
			continue
		}
		observed := time.UnixMicro(micros)
		if observed.Before(now.Add(-110*time.Second)) || observed.After(now.Add(5*time.Second)) {
			continue
		}
		if len(message) > 1500 || strings.ContainsAny(message, "\r\n") || strings.Contains(message, "PRIVATE KEY") {
			continue
		}
		message = headers.ReplaceAllString(message, "$1: [REDACTED]")
		message = credentials.ReplaceAllString(message, "$1=[REDACTED]")
		message = bearerTokens.ReplaceAllString(message, "[REDACTED]")
		sum := sha256.Sum256([]byte(unit + "\n" + cursor))
		sum[6] = (sum[6] & 15) | 0x50
		sum[8] = (sum[8] & 63) | 0x80
		id := fmt.Sprintf("%x-%x-%x-%x-%x", sum[:4], sum[4:6], sum[6:8], sum[8:10], sum[10:16])
		severity := "info"
		priority, _ := row["PRIORITY"].(string)
		if priority == "0" || priority == "1" || priority == "2" {
			severity = "critical"
		} else if priority == "3" || priority == "4" {
			severity = "warning"
		}
		entries = append(entries, Entry{id, unit, observed.UTC().Format(time.RFC3339Nano), message, severity})
		if len(entries) >= 50 {
			break
		}
	}
	return entries, scanner.Err()
}
func Collect(unit string) ([]Entry, error) {
	if !unitPattern.MatchString(unit) || strings.HasPrefix(unit, "-") {
		return nil, fmt.Errorf("invalid journal unit")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "journalctl", "--unit="+unit, "--since=-60 seconds", "--lines=50", "--output=json", "--no-pager")
	output, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err = cmd.Start(); err != nil {
		return nil, err
	}
	data, readErr := io.ReadAll(io.LimitReader(output, 262145))
	if len(data) > 262144 || readErr != nil {
		cancel()
	}
	err = cmd.Wait()
	if err != nil || readErr != nil || len(data) > 262144 {
		return nil, fmt.Errorf("journal collection unavailable or exceeds limit")
	}
	return Parse(data, unit, time.Now())
}
