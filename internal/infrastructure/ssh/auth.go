package ssh

import (
	"fmt"

	gossh "golang.org/x/crypto/ssh"
)

func BuildAuthMethods(password string, privateKey []byte, keyPassphrase string) ([]gossh.AuthMethod, error) {
	var methods []gossh.AuthMethod

	if password != "" {
		methods = append(methods, gossh.Password(password))
	}

	if len(privateKey) > 0 {
		signer, err := parsePrivateKey(privateKey, keyPassphrase)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
		methods = append(methods, gossh.PublicKeys(signer))
	}

	if len(methods) == 0 {
		return nil, fmt.Errorf("no authentication method available")
	}

	return methods, nil
}

func parsePrivateKey(key []byte, passphrase string) (gossh.Signer, error) {
	if passphrase != "" {
		return gossh.ParsePrivateKeyWithPassphrase(key, []byte(passphrase))
	}

	signer, err := gossh.ParsePrivateKey(key)
	if err != nil {
		if _, ok := err.(*gossh.PassphraseMissingError); ok && passphrase == "" {
			return nil, fmt.Errorf("private key requires a passphrase")
		}
		return nil, err
	}

	return signer, nil
}
