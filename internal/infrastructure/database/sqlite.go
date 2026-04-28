package database

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	_ "modernc.org/sqlite"
)

//go:embed all:migrations
var migrationFS embed.FS

type Database struct {
	db *sql.DB
}

func Open(dbPath string) (*Database, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{db: db}, nil
}

func (d *Database) RunMigrations() error {
	if err := d.ensureMigrationTable(); err != nil {
		return err
	}

	applied, err := d.getAppliedVersions()
	if err != nil {
		return err
	}

	files, err := d.readMigrationFiles()
	if err != nil {
		return err
	}

	for _, f := range files {
		if applied[f.version] {
			continue
		}

		slog.Info("applying migration", "file", f.name)

		content, err := migrationFS.ReadFile("migrations/" + f.name)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", f.name, err)
		}

		tx, err := d.db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}

		for _, stmt := range splitStatements(string(content)) {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := tx.Exec(stmt); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to execute migration %s: %w", f.name, err)
			}
		}

		if _, err := tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", f.version); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", f.name, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", f.name, err)
		}

		slog.Info("migration applied", "version", f.version)
	}

	return nil
}

func (d *Database) DB() *sql.DB {
	return d.db
}

func (d *Database) Close() error {
	slog.Info("closing database")
	return d.db.Close()
}

func (d *Database) ensureMigrationTable() error {
	_, err := d.db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at INTEGER DEFAULT (unixepoch())
		)
	`)
	return err
}

func (d *Database) getAppliedVersions() (map[int]bool, error) {
	rows, err := d.db.Query("SELECT version FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	versions := make(map[int]bool)
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		versions[v] = true
	}
	return versions, rows.Err()
}

type migrationFile struct {
	name    string
	version int
}

func (d *Database) readMigrationFiles() ([]migrationFile, error) {
	entries, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return nil, err
	}

	var files []migrationFile
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".up.sql") {
			continue
		}

		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) < 2 {
			continue
		}

		version, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}

		files = append(files, migrationFile{name: entry.Name(), version: version})
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].version < files[j].version
	})

	return files, nil
}

func splitStatements(content string) []string {
	var stmts []string
	var current strings.Builder

	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") && !strings.Contains(trimmed, ";") {
			continue
		}
		if current.Len() > 0 {
			current.WriteString("\n")
		}
		current.WriteString(line)

		if strings.HasSuffix(trimmed, ";") {
			stmts = append(stmts, current.String())
			current.Reset()
		}
	}

	if current.Len() > 0 {
		stmts = append(stmts, current.String())
	}

	return stmts
}
