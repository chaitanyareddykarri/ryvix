package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/ryvix/agent/pkg/auth"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/ryvix/agent/pkg/daemon"
)

var (
	Version   = "2.4.0"
	BuildArch = "linux/amd64"
	Commit    = "unknown"
)

func main() {
	serverID := flag.String("server-id", "", "Unique Server ID registered in Ryvix database")
	hostname := flag.String("hostname", "", "Server hostname override")
	token := flag.String("token", "", "Enrolled device credential")
	controlPlane := flag.String("control-plane", "", "Ryvix HTTPS Control Plane origin")
	interval := flag.Duration("interval", 5*time.Second, "Telemetry reporting interval (e.g. 5s, 10s)")
	once := flag.Bool("once", false, "Collect single telemetry snapshot, output JSON to stdout, and exit")
	showVersion := flag.Bool("version", false, "Display agent version and exit")
	configPath := flag.String("config", "", "Private enrolled device configuration file")
	enroll := flag.Bool("enroll", false, "Enroll with a short-lived token read from stdin")
	flag.Parse()

	if *showVersion {
		fmt.Printf("ryvix-agent v%s (%s) commit: %s\n", Version, BuildArch, Commit)
		os.Exit(0)
	}

	if *enroll {
		data, err := io.ReadAll(io.LimitReader(os.Stdin, 1024))
		if err != nil || *configPath == "" {
			fmt.Fprintln(os.Stderr, "Enrollment requires stdin token and --config path")
			os.Exit(1)
		}
		if err := auth.EnrollDevice(*controlPlane, strings.TrimSpace(string(data)), Version, *configPath); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Println("Enrolled device identity saved.")
		return
	}
	if *configPath != "" {
		stored, err := auth.LoadDevice(*configPath)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		*serverID, *token, *controlPlane = stored.ServerID, stored.PrivateSeed, stored.ControlPlaneURL
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
		snapshot, collectErr := d.GatherSnapshot()
		if collectErr != nil {
			fmt.Fprintln(os.Stderr, collectErr)
			os.Exit(1)
		}
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
