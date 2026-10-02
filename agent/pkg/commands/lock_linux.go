//go:build linux

package commands

import (
	"os"
	"syscall"
)

func lockJournal(path string) (func(), error) {
	fd, err := syscall.Open(path+".lock", syscall.O_CREAT|syscall.O_RDWR|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return nil, err
	}
	file := os.NewFile(uintptr(fd), path+".lock")
	if err = syscall.Flock(fd, syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		file.Close()
		return nil, err
	}
	return func() { syscall.Flock(fd, syscall.LOCK_UN); file.Close() }, nil
}
