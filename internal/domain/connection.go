package domain

type AuthMethod string

const (
	AuthMethodPassword   AuthMethod = "password"
	AuthMethodKey        AuthMethod = "key"
	AuthMethodPasswordMFA AuthMethod = "password+mfa"
	AuthMethodKeyMFA     AuthMethod = "key+mfa"
)

type Connection struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	GroupID            string     `json:"groupId,omitempty"`
	Host               string     `json:"host"`
	Port               int        `json:"port"`
	Username           string     `json:"username"`
	AuthMethod         AuthMethod `json:"authMethod"`
	CredentialID       string     `json:"credentialId,omitempty"`
	Password           string     `json:"password,omitempty"`         // encrypted, base64
	PrivateKey         string     `json:"privateKey,omitempty"`       // encrypted, base64
	KeyPassphrase      string     `json:"keyPassphrase,omitempty"`    // encrypted, base64
	JumpHostIDs        string     `json:"jumpHostIds,omitempty"`      // JSON array of connection IDs
	KeepAliveInterval  int        `json:"keepAliveInterval"`
	ConnectionTimeout  int        `json:"connectionTimeout"`
	TerminalType       string     `json:"terminalType"`
	FontSize           int        `json:"fontSize"`
	SortOrder          int        `json:"sortOrder"`
	LastUsedAt         int64      `json:"lastUsedAt,omitempty"`
	CreatedAt          int64      `json:"createdAt"`
	UpdatedAt          int64      `json:"updatedAt"`
	DeletedAt          int64      `json:"deletedAt,omitempty"`
}

type Group struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	ParentID   string `json:"parentId,omitempty"`
	SortOrder  int    `json:"sortOrder"`
	IsExpanded bool   `json:"isExpanded"`
	CreatedAt  int64  `json:"createdAt"`
	UpdatedAt  int64  `json:"updatedAt"`
}
