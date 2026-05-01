package domain

type SessionStatus string

const (
	SessionStatusActive    SessionStatus = "active"
	SessionStatusClosed    SessionStatus = "closed"
	SessionStatusError     SessionStatus = "error"
)

type SessionHistory struct {
	ID             string `json:"id"`
	ConnectionID   string `json:"connectionId"`
	ConnectionName string `json:"connectionName,omitempty"`
	Host           string `json:"host,omitempty"`
	StartedAt      int64  `json:"startedAt"`
	EndedAt        int64  `json:"endedAt,omitempty"`
	ExitStatus     int    `json:"exitStatus,omitempty"`
	BytesSent      int64  `json:"bytesSent"`
	BytesRecv      int64  `json:"bytesRecv"`
}

type ActiveSession struct {
	ID           string        `json:"id"`
	ConnectionID string        `json:"connectionId"`
	ConnectionName string      `json:"connectionName"`
	Host         string        `json:"host"`
	Status       SessionStatus `json:"status"`
}
