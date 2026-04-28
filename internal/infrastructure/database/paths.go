package database

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

func DataDir() (string, error) {
	var dir string

	switch runtime.GOOS {
	case "darwin":
		dir = filepath.Join(os.Getenv("HOME"), "Library", "Application Support", "next-terminal")
	case "windows":
		dir = filepath.Join(os.Getenv("APPDATA"), "next-terminal")
	default:
		dir = filepath.Join(os.Getenv("HOME"), ".local", "share", "next-terminal")
	}

	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", fmt.Errorf("failed to create data directory %s: %w", dir, err)
	}

	return dir, nil
}
