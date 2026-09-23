package firewall

import (
	"testing"
)

func TestFirewallManager(t *testing.T) {
	fm := NewFirewallManager()

	// Test valid IP
	msg, err := fm.BlockIP("198.51.100.99", "brute_force_ssh")
	if err != nil {
		t.Fatalf("BlockIP failed: %v", err)
	}
	if msg == "" {
		t.Fatalf("Expected confirmation message")
	}

	if !fm.IsBlocked("198.51.100.99") {
		t.Fatalf("Expected 198.51.100.99 to be blocked")
	}

	// Test invalid IP
	_, errInvalid := fm.BlockIP("not.an.ip.address", "invalid")
	if errInvalid == nil {
		t.Fatalf("Expected invalid IP to produce error")
	}

	// Test unblock
	errUnblock := fm.UnblockIP("198.51.100.99")
	if errUnblock != nil {
		t.Fatalf("UnblockIP failed: %v", errUnblock)
	}
	if fm.IsBlocked("198.51.100.99") {
		t.Fatalf("Expected IP to be unblocked")
	}
}
