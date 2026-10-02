//go:build !linux

package commands

import "fmt"

func lockJournal(path string) (func(), error) {
	return nil, fmt.Errorf("approved service operations require a Linux agent")
}
