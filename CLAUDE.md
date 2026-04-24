# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Go native GUI SSH client (Go GUI原生开发的SSH客户端). Supports jump server/bastion host connectivity and MFA authentication. All data is stored locally — no server-side data storage.

- **Language:** Go 1.24.2
- **Module:** `github.com/zyhnesmr/next-terminal`
- **Status:** Early initialization — project structure is still being established

## Build & Run

```bash
go build ./...
go test ./...
go run .
```

## Planned Structure

The `.gitignore` references `internal/model/sql`, indicating a planned Go standard layout with `internal/` packages and SQL-based local storage. Follow Go conventions as the project grows:
- `internal/` for non-importable packages
- `cmd/` for entry points if multiple binaries are needed
