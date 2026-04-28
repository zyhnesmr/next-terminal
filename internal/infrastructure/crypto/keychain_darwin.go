//go:build darwin

package crypto

import (
	"github.com/keybase/go-keychain"
)

func getKeychainKeyImpl() ([]byte, error) {
	query := keychain.NewItem()
	query.SetSecClass(keychain.SecClassGenericPassword)
	query.SetService(keychainService)
	query.SetAccount(keychainAccount)
	query.SetMatchLimit(keychain.MatchLimitOne)
	query.SetReturnData(true)

	results, err := keychain.QueryItem(query)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, ErrKeyNotFound
	}
	return results[0].Data, nil
}

func setKeychainKeyImpl(key []byte) error {
	item := keychain.NewItem()
	item.SetSecClass(keychain.SecClassGenericPassword)
	item.SetService(keychainService)
	item.SetAccount(keychainAccount)
	item.SetData(key)
	item.SetAccessible(keychain.AccessibleAfterFirstUnlockThisDeviceOnly)

	return keychain.AddItem(item)
}
