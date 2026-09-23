package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ryvix/agent/pkg/daemon"
)

var (
	Version   = "2.4.0"
	BuildArch = "linux/amd64"
	Commit    = "a8f9c2d"
)

func main() {
	serverID := flag.String("server-id", "", "Unique Server ID registered in Ryvix database")
	hostname := flag.String("hostname", "", "Server hostname override")
	token := flag.String("token", "", "HMAC-SHA256 enrollment token")
	controlPlane := flag.String("control-plane", "http://localhost:3000", "Ryvix Web/API Control Plane Base URL")
	interval := flag.Duration("interval", 5*time.Second, "Telemetry reporting interval (e.g. 5s, 10s)")
	once := flag.Bool("once", false, "Collect single telemetry snapshot, output JSON to stdout, and exit")
	showVersion := flag.Bool("version", false, "Display agent version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Printf("ryvix-agent v%s (%s) commit: %s\n", Version, BuildArch, Commit)
		os.Exit(0)
	}

	cfg := daemon.Config{
		ServerID:        *serverID,
		Hostname:        *hostname,
		Token:           *token,
		ControlPlaneURL: *controlPlane,
		Interval:        *interval,
	}

	d := daemon.NewAgentDaemon(cfg)

	// One-shot mode: probe and print JSON
	if *once {
		snapshot := d.GatherSnapshot()
		data, err := json.MarshalIndent(snapshot, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error serializing snapshot: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(data))
		os.Exit(0)
	}

	// Daemon mode: listen for SIGINT/SIGTERM
	ctx, cancel := context.WithCancel(context.Background())
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		cancel()
	}()

	if err := d.Run(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Daemon error: %v\n", err)
		os.Exit(1)
	}
}
