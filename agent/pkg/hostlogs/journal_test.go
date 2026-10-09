package hostlogs

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestJournal(t *testing.T) {
	now := time.Now()
	data := []byte(fmt.Sprintf(`{"MESSAGE":"password=short","__CURSOR":"a","__REALTIME_TIMESTAMP":"%d","PRIORITY":"3"}`, now.UnixMicro()))
	rows, err := Parse(data, "ssh.service", now)
	if err != nil || len(rows) != 1 || strings.Contains(rows[0].Message, "short") {
		t.Fatal("redaction failed")
	}
	again, _ := Parse(data, "ssh.service", now)
	if again[0].ID != rows[0].ID {
		t.Fatal("unstable event identity")
	}
	old, _ := Parse(data, "ssh.service", now.Add(3*time.Minute))
	if len(old) != 0 {
		t.Fatal("stale record accepted")
	}
	if _, err := Collect("--all"); err == nil {
		t.Fatal("option injection accepted")
	}
}
