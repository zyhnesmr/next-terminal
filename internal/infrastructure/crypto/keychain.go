package crypto

import (
	"errors"
	"fmt"
	"runtime"
)

var ErrKeyNotFound = errors.New("master key not found in keychain")

const keychainService = "com.next-terminal.master-key"
const keychainAccount = "master-key"

func GetOrCreateMasterKey() ([]byte, error) {
	switch runtime.GOOS {
	case "darwin":
		return getOrCreateMasterKeyDarwin()
	default:
		return getOrCreateMasterKeyFallback()
	}
}

func getOrCreateMasterKeyFallback() ([]byte, error) {
	// For non-macOS platforms, generate a new key each launch
	// TODO: Implement Windows DPAPI or file-based encrypted storage
	return GenerateMasterKey()
}

func getOrCreateMasterKeyDarwin() ([]byte, error) {
	key, err := getKeychainKeyImpl()
	if err == nil {
		return key, nil
	}
	if !errors.Is(err, ErrKeyNotFound) {
		return nil, fmt.Errorf("failed to query keychain: %w", err)
	}

	key, err = GenerateMasterKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate master key: %w", err)
	}

	if err := setKeychainKeyImpl(key); err != nil {
		return nil, fmt.Errorf("failed to store master key in keychain: %w", err)
	}

	return key, nil
}
