//go:build linux

package telemetry

import (
	"bufio"
	"fmt"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type LinuxCollector struct {
	mu           sync.Mutex
	lastCPUTotal uint64
	lastCPUIdle  uint64
	lastSampled  time.Time
}

func NewCollector() Collector {
	c := &LinuxCollector{}
	c.initCPUSample()
	return c
}

func (c *LinuxCollector) initCPUSample() {
	total, idle, err := readRawCPUTimes()
	if err == nil {
		c.lastCPUTotal = total
		c.lastCPUIdle = idle
		c.lastSampled = time.Now()
	}
}

func (c *LinuxCollector) CollectMetrics() (SystemMetrics, error) {
	metrics := SystemMetrics{
		CPUCores: runtime.NumCPU(),
	}

	// 1. CPU Usage via /proc/stat delta
	cpuUsage, err := c.calculateCPUUsage()
	if err != nil {
		return SystemMetrics{}, err
	}
	metrics.CPUUsagePercent = cpuUsage

	// 2. Memory via /proc/meminfo
	memTotal, memUsed, memPercent, err := readMemInfo()
	if err != nil {
		return SystemMetrics{}, err
	}
	metrics.MemoryTotalMb = memTotal
	metrics.MemoryUsedMb = memUsed
	metrics.MemoryUsagePercent = memPercent

	// 3. Disk Usage via syscall.Statfs
	diskTotal, diskUsed, diskPercent, err := readDiskStats("/")
	if err != nil {
		return SystemMetrics{}, err
	}
	metrics.DiskTotalGb = diskTotal
	metrics.DiskUsedGb = diskUsed
	metrics.DiskUsagePercent = diskPercent

	// 4. Load Average via /proc/loadavg
	loadAvg, err := readLoadAvg()
	if err != nil {
		return SystemMetrics{}, err
	}
	metrics.LoadAverage = loadAvg

	return metrics, nil
}

func (c *LinuxCollector) GetOSInfo() (string, string) {
	osType := "linux"
	kernelVersion := ""

	// Read /etc/os-release for friendly distro name
	if data, err := os.ReadFile("/etc/os-release"); err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "PRETTY_NAME=") {
				osType = strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
				break
			}
		}
	}

	// Read /proc/sys/kernel/osrelease
	if data, err := os.ReadFile("/proc/sys/kernel/osrelease"); err == nil {
		kernelVersion = strings.TrimSpace(string(data))
	}

	return osType, kernelVersion
}

func readRawCPUTimes() (uint64, uint64, error) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "cpu ") {
			fields := strings.Fields(line)
			if len(fields) >= 5 {
				var total uint64
				for _, valStr := range fields[1:] {
					val, parseErr := strconv.ParseUint(valStr, 10, 64)
					if parseErr != nil {
						return 0, 0, fmt.Errorf("Invalid CPU counter")
					}
					total += val
				}
				idle, _ := strconv.ParseUint(fields[4], 10, 64)
				var iowait uint64
				if len(fields) >= 6 {
					iowait, _ = strconv.ParseUint(fields[5], 10, 64)
				}
				return total, idle + iowait, nil
			}
		}
	}
	return 0, 0, fmt.Errorf("CPU counters unavailable")
}

func (c *LinuxCollector) calculateCPUUsage() (float64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	total, idle, err := readRawCPUTimes()
	if err != nil {
		return 0, err
	}

	if c.lastCPUTotal == 0 || total < c.lastCPUTotal || idle < c.lastCPUIdle {
		c.lastCPUTotal, c.lastCPUIdle = total, idle
		return 0, fmt.Errorf("CPU sample baseline unavailable")
	}
	deltaTotal := total - c.lastCPUTotal
	deltaIdle := idle - c.lastCPUIdle

	c.lastCPUTotal = total
	c.lastCPUIdle = idle
	c.lastSampled = time.Now()

	if deltaTotal == 0 || deltaIdle > deltaTotal {
		return 0, fmt.Errorf("CPU sample interval unavailable")
	}

	deltaActive := deltaTotal - deltaIdle
	usage := (float64(deltaActive) / float64(deltaTotal)) * 100.0
	if usage < 0.0 {
		usage = 0.0
	} else if usage > 100.0 {
		usage = 100.0
	}
	return math.Round(usage*10) / 10, nil
}

func readMemInfo() (float64, float64, float64, error) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0, 0, err
	}
	defer file.Close()

	var totalKb, availKb float64
	var haveAvailable bool
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				totalKb, _ = strconv.ParseFloat(fields[1], 64)
			}
		} else if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				var parseErr error
				availKb, parseErr = strconv.ParseFloat(fields[1], 64)
				haveAvailable = parseErr == nil
			}
		}
	}

	if scanner.Err() != nil || math.IsNaN(totalKb) || math.IsInf(totalKb, 0) || math.IsNaN(availKb) || math.IsInf(availKb, 0) || totalKb <= 0 || !haveAvailable || availKb < 0 || availKb > totalKb {
		return 0, 0, 0, fmt.Errorf("Memory counters unavailable")
	}

	totalMb := math.Round(totalKb / 1024.0)
	usedMb := math.Round((totalKb - availKb) / 1024.0)
	percent := math.Round(((totalKb-availKb)/totalKb)*1000) / 10

	return totalMb, usedMb, percent, nil
}

func readDiskStats(path string) (float64, float64, float64, error) {
	var stat syscall.Statfs_t
	err := syscall.Statfs(path, &stat)
	if err != nil {
		return 0, 0, 0, err
	}

	bsize := uint64(stat.Bsize)
	totalBytes := stat.Blocks * bsize
	freeBytes := stat.Bfree * bsize
	if totalBytes == 0 || freeBytes > totalBytes {
		return 0, 0, 0, fmt.Errorf("Disk counters unavailable")
	}
	usedBytes := totalBytes - freeBytes

	totalGb := math.Round(float64(totalBytes)/(1024*1024*1024)*10) / 10
	usedGb := math.Round(float64(usedBytes)/(1024*1024*1024)*10) / 10
	percent := math.Round((float64(usedBytes)/float64(totalBytes))*1000) / 10

	return totalGb, usedGb, percent, nil
}

func readLoadAvg() ([3]float64, error) {
	var load [3]float64
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return load, err
	}

	fields := strings.Fields(string(data))
	if len(fields) < 3 {
		return load, fmt.Errorf("Load averages unavailable")
	}
	for i := range load {
		value, parseErr := strconv.ParseFloat(fields[i], 64)
		if parseErr != nil || math.IsNaN(value) || math.IsInf(value, 0) || value < 0 {
			return load, fmt.Errorf("Invalid load average")
		}
		load[i] = value
	}
	return load, nil
}
