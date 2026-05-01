package service

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	gossh "golang.org/x/crypto/ssh"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/ssh"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/terminal"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type SessionService struct {
	sessionRepo    model.SessionRepository
	connService    *ConnectionService
	credService    *CredentialService
	dialer         *ssh.Dialer
	mfaRegistry    *ssh.MFAChallengeRegistry
	activeSessions map[string]*terminal.SSHSessionBridge
	mu             sync.RWMutex
	ctx            context.Context
}

func NewSessionService(
	sessionRepo model.SessionRepository,
	connService *ConnectionService,
	credService *CredentialService,
	dialer *ssh.Dialer,
) *SessionService {
	return &SessionService{
		sessionRepo:    sessionRepo,
		connService:    connService,
		credService:    credService,
		dialer:         dialer,
		activeSessions: make(map[string]*terminal.SSHSessionBridge),
	}
}

func (s *SessionService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *SessionService) SetMFARegistry(registry *ssh.MFAChallengeRegistry) {
	s.mfaRegistry = registry
	s.dialer.SetMFARegistry(registry)
}

// Resolve implements ssh.CredentialProvider for jump host credential resolution.
func (s *SessionService) Resolve(ctx context.Context, connectionID string) (*domain.Connection, string, []byte, string, error) {
	conn, err := s.connService.GetConnection(ctx, connectionID)
	if err != nil {
		return nil, "", nil, "", fmt.Errorf("connection not found: %w", err)
	}

	var password string
	var privateKey []byte
	var keyPassphrase string

	if conn.CredentialID != "" {
		cred, err := s.credService.GetCredential(ctx, conn.CredentialID)
		if err != nil {
			return nil, "", nil, "", fmt.Errorf("failed to get credential: %w", err)
		}
		password = cred.Password
		privateKey = []byte(cred.PrivateKey)
		keyPassphrase = cred.KeyPassphrase
	} else {
		password = conn.Password
		privateKey = []byte(conn.PrivateKey)
		keyPassphrase = conn.KeyPassphrase
	}

	return conn, password, privateKey, keyPassphrase, nil
}

func (s *SessionService) StartSession(ctx context.Context, connectionID string) (string, error) {
	conn, err := s.connService.GetConnection(ctx, connectionID)
	if err != nil {
		return "", fmt.Errorf("connection not found: %w", err)
	}

	sessionID := uuid.New().String()

	// Create context with session ID for MFA callback routing
	sessionCtx := context.WithValue(ctx, "sessionID", sessionID)

	// Resolve credentials for the target
	var password string
	var privateKey []byte
	var keyPassphrase string

	if conn.CredentialID != "" {
		cred, err := s.credService.GetCredential(ctx, conn.CredentialID)
		if err != nil {
			return "", fmt.Errorf("failed to get credential: %w", err)
		}
		password = cred.Password
		privateKey = []byte(cred.PrivateKey)
		keyPassphrase = cred.KeyPassphrase
	} else {
		password = conn.Password
		privateKey = []byte(conn.PrivateKey)
		keyPassphrase = conn.KeyPassphrase
	}

	// Dial SSH — direct or via jump hosts
	var client *gossh.Client

	jumpIDs, err := ssh.ParseJumpHostIDs(conn.JumpHostIDs)
	if err != nil {
		return "", fmt.Errorf("invalid jump host IDs: %w", err)
	}

	if len(jumpIDs) > 0 {
		client, err = s.dialer.DialWithJump(sessionCtx, conn, s)
	} else {
		client, err = s.dialer.Dial(sessionCtx, conn, password, privateKey, keyPassphrase)
	}
	if err != nil {
		return "", fmt.Errorf("failed to connect: %w", err)
	}

	// Create session bridge
	bridge := terminal.NewSSHSessionBridge(ctx, sessionID, connectionID, client)

	eventBridge := terminal.NewWailsEventBridge(ctx)

	onOutput := func(data []byte) {
		eventBridge.OnOutput(sessionID, data)
	}
	onError := func(err error) {
		eventBridge.OnError(sessionID, err)
		s.removeSession(sessionID)
	}

	if err := bridge.Start(conn.TerminalType, 24, 80, onOutput, onError); err != nil {
		client.Close()
		return "", fmt.Errorf("failed to start terminal session: %w", err)
	}

	s.mu.Lock()
	s.activeSessions[sessionID] = bridge
	s.mu.Unlock()

	// Record session history
	history := &domain.SessionHistory{
		ID:           sessionID,
		ConnectionID: connectionID,
		StartedAt:    time.Now().Unix(),
	}
	if err := s.sessionRepo.Create(ctx, history); err != nil {
		slog.Warn("failed to record session history", "error", err)
	}

	if err := s.connService.UpdateLastUsed(ctx, connectionID); err != nil {
		slog.Warn("failed to update last used", "error", err)
	}

	slog.Info("session started", "sessionID", sessionID, "connectionID", connectionID, "jumpHosts", len(jumpIDs))
	return sessionID, nil
}

func (s *SessionService) WriteToSession(sessionID string, data string) error {
	s.mu.RLock()
	bridge, ok := s.activeSessions[sessionID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return bridge.Write([]byte(data))
}

func (s *SessionService) ResizeSession(sessionID string, rows, cols uint16) error {
	s.mu.RLock()
	bridge, ok := s.activeSessions[sessionID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return bridge.Resize(rows, cols)
}

func (s *SessionService) CloseSession(sessionID string) error {
	s.mu.Lock()
	bridge, ok := s.activeSessions[sessionID]
	if ok {
		delete(s.activeSessions, sessionID)
	}
	s.mu.Unlock()

	if !ok {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	err := bridge.Close()

	if s.sessionRepo != nil {
		s.sessionRepo.UpdateEndTime(context.Background(), sessionID, time.Now().Unix(), 0)
	}

	return err
}

func (s *SessionService) SubmitMFAResponse(sessionID string, responses []string) error {
	if s.mfaRegistry == nil {
		return fmt.Errorf("MFA not initialized")
	}
	return s.mfaRegistry.SubmitResponse(sessionID, responses)
}

func (s *SessionService) SetTabVisibility(sessionID string, visible bool) {
	s.mu.RLock()
	bridge, ok := s.activeSessions[sessionID]
	s.mu.RUnlock()
	if ok {
		bridge.SetVisible(visible)
	}
}

func (s *SessionService) GetActiveSessions() []*domain.ActiveSession {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]*domain.ActiveSession, 0, len(s.activeSessions))
	for id, bridge := range s.activeSessions {
		sessions = append(sessions, &domain.ActiveSession{
			ID:           id,
			ConnectionID: bridge.ConnectionID,
			Status:       domain.SessionStatusActive,
		})
	}
	return sessions
}

func (s *SessionService) ListSessionHistory(ctx context.Context, connectionID string, limit int) ([]*domain.SessionHistory, error) {
	return s.sessionRepo.ListByConnection(ctx, connectionID, limit)
}

func (s *SessionService) ListRecentSessions(ctx context.Context, limit int) ([]*domain.SessionHistory, error) {
	return s.sessionRepo.ListRecent(ctx, limit)
}

func (s *SessionService) CloseAllSessions() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, bridge := range s.activeSessions {
		if err := bridge.Close(); err != nil {
			slog.Warn("failed to close session", "id", id, "error", err)
		}
		delete(s.activeSessions, id)
	}
}

func (s *SessionService) removeSession(sessionID string) {
	s.mu.Lock()
	delete(s.activeSessions, sessionID)
	s.mu.Unlock()

	if s.ctx != nil {
		runtime.EventsEmit(s.ctx, "terminal:"+sessionID+":closed")
	}
}

// GetSSHClient returns the underlying SSH client for an active session (used by SFTP).
func (s *SessionService) GetSSHClient(sessionID string) (*gossh.Client, error) {
	s.mu.RLock()
	bridge, ok := s.activeSessions[sessionID]
	s.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	return bridge.Client, nil
}

func (s *SessionService) CreateSessionHistory(ctx context.Context, session *domain.SessionHistory) error {
	return s.sessionRepo.Create(ctx, session)
}

func (s *SessionService) UpdateSessionEnd(ctx context.Context, id string, endedAt int64, exitStatus int) error {
	return s.sessionRepo.UpdateEndTime(ctx, id, endedAt, exitStatus)
}
