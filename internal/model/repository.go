package model

import (
	"context"

	"github.com/zyhnesmr/next-terminal/internal/domain"
)

type ConnectionRepository interface {
	Create(ctx context.Context, conn *domain.Connection) error
	GetByID(ctx context.Context, id string) (*domain.Connection, error)
	List(ctx context.Context) ([]*domain.Connection, error)
	ListByGroup(ctx context.Context, groupID string) ([]*domain.Connection, error)
	Update(ctx context.Context, conn *domain.Connection) error
	SoftDelete(ctx context.Context, id string) error
	UpdateLastUsed(ctx context.Context, id string) error
}

type GroupRepository interface {
	Create(ctx context.Context, group *domain.Group) error
	GetByID(ctx context.Context, id string) (*domain.Group, error)
	List(ctx context.Context) ([]*domain.Group, error)
	Update(ctx context.Context, group *domain.Group) error
	Delete(ctx context.Context, id string) error
}

type CredentialRepository interface {
	Create(ctx context.Context, cred *domain.Credential) error
	GetByID(ctx context.Context, id string) (*domain.Credential, error)
	List(ctx context.Context) ([]*domain.Credential, error)
	Update(ctx context.Context, cred *domain.Credential) error
	Delete(ctx context.Context, id string) error
}

type SessionRepository interface {
	Create(ctx context.Context, session *domain.SessionHistory) error
	UpdateEndTime(ctx context.Context, id string, endedAt int64, exitStatus int) error
	ListByConnection(ctx context.Context, connectionID string, limit int) ([]*domain.SessionHistory, error)
}

type SettingsRepository interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string) error
	GetAll(ctx context.Context) (map[string]string, error)
}
