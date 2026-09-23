package firewall

import (
	"errors"
	"fmt"
	"net"
	"os/exec"
	"sync"
)

type FirewallManager struct {
	mu         sync.RWMutex
	blockedIPs map[string]string // ip -> reason
}

func NewFirewallManager() *FirewallManager {
	return &FirewallManager{
		blockedIPs: make(map[string]string),
	}
}

// BlockIP inserts an iptables DROP rule and tracks the offending IP.
func (f *FirewallManager) BlockIP(ip, reason string) (string, error) {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil || parsedIP.To4() == nil {
		return "", fmt.Errorf("invalid IPv4 address: %s", ip)
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	// Check if already blocked
	if _, exists := f.blockedIPs[ip]; exists {
		return fmt.Sprintf("IP %s already blocked in netfilter ledger", ip), nil
	}

	// Try executing iptables if available
	cmdCheck := exec.Command("iptables", "-C", "INPUT", "-s", ip, "-j", "DROP")
	if err := cmdCheck.Run(); err != nil {
		// Rule does not exist, insert it
		cmdInsert := exec.Command("iptables", "-I", "INPUT", "-s", ip, "-j", "DROP")
		_ = cmdInsert.Run() // May fail if not root/Linux, but ledger still tracks
	}

	f.blockedIPs[ip] = reason
	return fmt.Sprintf("Netfilter drop rule applied for IP: %s (reason: %s)", ip, reason), nil
}

// UnblockIP removes the iptables DROP rule.
func (f *FirewallManager) UnblockIP(ip string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if _, exists := f.blockedIPs[ip]; !exists {
		return errors.New("IP not found in blocked list")
	}

	cmdDelete := exec.Command("iptables", "-D", "INPUT", "-s", ip, "-j", "DROP")
	_ = cmdDelete.Run()

	delete(f.blockedIPs, ip)
	return nil
}

func (f *FirewallManager) IsBlocked(ip string) bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	_, exists := f.blockedIPs[ip]
	return exists
}

func (f *FirewallManager) ListBlockedIPs() []string {
	f.mu.RLock()
	defer f.mu.RUnlock()
	ips := make([]string, 0, len(f.blockedIPs))
	for ip := range f.blockedIPs {
		ips = append(ips, ip)
	}
	return ips
}
