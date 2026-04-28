package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/ssh"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type ConnectionService struct {
	connRepo model.ConnectionRepository
	groupRepo model.GroupRepository
	credService *CredentialService
	dialer *sshDialer
}

type sshDialer interface {
	Dial(ctx context.Context, conn *domain.Connection, password string, privateKey []byte, keyPassphrase string) (client interface{}, err error)
}

func NewConnectionService(connRepo model.ConnectionRepository, groupRepo model.GroupRepository) *ConnectionService {
	return &ConnectionService{connRepo: connRepo, groupRepo: groupRepo}
}

func (s *ConnectionService) SetCredentialService(cs *CredentialService) {
	s.credService = cs
}

func (s *ConnectionService) UpdateLastUsed(ctx context.Context, id string) error {
	return s.connRepo.UpdateLastUsed(ctx, id)
}

func (s *ConnectionService) CreateConnection(ctx context.Context, conn *domain.Connection) error {
	if conn.ID == "" {
		conn.ID = uuid.New().String()
	}
	now := time.Now().Unix()
	conn.CreatedAt = now
	conn.UpdatedAt = now

	if conn.Port == 0 {
		conn.Port = 22
	}
	if conn.KeepAliveInterval == 0 {
		conn.KeepAliveInterval = 30
	}
	if conn.ConnectionTimeout == 0 {
		conn.ConnectionTimeout = 10
	}
	if conn.TerminalType == "" {
		conn.TerminalType = "xterm-256color"
	}
	if conn.FontSize == 0 {
		conn.FontSize = 14
	}

	return s.connRepo.Create(ctx, conn)
}

func (s *ConnectionService) UpdateConnection(ctx context.Context, conn *domain.Connection) error {
	conn.UpdatedAt = time.Now().Unix()
	return s.connRepo.Update(ctx, conn)
}

func (s *ConnectionService) DeleteConnection(ctx context.Context, id string) error {
	return s.connRepo.SoftDelete(ctx, id)
}

func (s *ConnectionService) GetConnection(ctx context.Context, id string) (*domain.Connection, error) {
	return s.connRepo.GetByID(ctx, id)
}

func (s *ConnectionService) ListConnections(ctx context.Context) ([]*domain.Connection, error) {
	return s.connRepo.List(ctx)
}

func (s *ConnectionService) ListConnectionsByGroup(ctx context.Context, groupID string) ([]*domain.Connection, error) {
	return s.connRepo.ListByGroup(ctx, groupID)
}

func (s *ConnectionService) CreateGroup(ctx context.Context, group *domain.Group) error {
	if group.ID == "" {
		group.ID = uuid.New().String()
	}
	now := time.Now().Unix()
	group.CreatedAt = now
	group.UpdatedAt = now
	return s.groupRepo.Create(ctx, group)
}

func (s *ConnectionService) UpdateGroup(ctx context.Context, group *domain.Group) error {
	group.UpdatedAt = time.Now().Unix()
	return s.groupRepo.Update(ctx, group)
}

func (s *ConnectionService) DeleteGroup(ctx context.Context, id string) error {
	return s.groupRepo.Delete(ctx, id)
}

func (s *ConnectionService) ListGroups(ctx context.Context) ([]*domain.Group, error) {
	return s.groupRepo.List(ctx)
}

func (s *ConnectionService) TestConnection(ctx context.Context, id string, dialer *ssh.Dialer) error {
	conn, err := s.connRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("connection not found: %w", err)
	}

	var password string
	var privateKey []byte
	var keyPassphrase string

	if conn.CredentialID != "" && s.credService != nil {
		cred, err := s.credService.GetCredential(ctx, conn.CredentialID)
		if err != nil {
			return fmt.Errorf("failed to get credential: %w", err)
		}
		password = cred.Password
		privateKey = []byte(cred.PrivateKey)
		keyPassphrase = cred.KeyPassphrase
	} else {
		password = conn.Password
		privateKey = []byte(conn.PrivateKey)
		keyPassphrase = conn.KeyPassphrase
	}

	client, err := dialer.Dial(ctx, conn, password, privateKey, keyPassphrase)
	if err != nil {
		return fmt.Errorf("connection test failed: %w", err)
	}
	client.Close()

	return nil
}
