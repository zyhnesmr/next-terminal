package domain

type CredentialType string

const (
	CredentialTypePassword       CredentialType = "password"
	CredentialTypeKey            CredentialType = "key"
	CredentialTypeKeyPassphrase  CredentialType = "key+passphrase"
)

type Credential struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Type           CredentialType `json:"type"`
	Password       string         `json:"password,omitempty"`        // encrypted, base64
	PrivateKey     string         `json:"privateKey,omitempty"`      // encrypted, base64
	KeyPassphrase  string         `json:"keyPassphrase,omitempty"`   // encrypted, base64
	Fingerprint    string         `json:"fingerprint,omitempty"`
	CreatedAt      int64          `json:"createdAt"`
	UpdatedAt      int64          `json:"updatedAt"`
}
