//go:build !darwin

package crypto

func getKeychainKeyImpl() ([]byte, error) {
	return nil, ErrKeyNotFound
}

func setKeychainKeyImpl(_ []byte) error {
	return nil
}
