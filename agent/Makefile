.PHONY: all build test clean linux-amd64 linux-arm64 windows

all: test build

test:
	go test -v ./...

build: linux-amd64 linux-arm64 windows

linux-amd64:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o dist/ryvix-agent-linux-amd64 ./cmd/ryvix-agent

linux-arm64:
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o dist/ryvix-agent-linux-arm64 ./cmd/ryvix-agent

windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o dist/ryvix-agent-windows-amd64.exe ./cmd/ryvix-agent

clean:
	rm -rf dist/
