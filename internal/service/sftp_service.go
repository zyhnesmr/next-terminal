package service

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	gossh "golang.org/x/crypto/ssh"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/sftp"
)

type SftpExplorer struct {
	ID         string
	SessionID  string
	SftpClient *sftp.Client
}

type SftpService struct {
	explorers map[string]*SftpExplorer
	mu        sync.RWMutex
	ctx       context.Context
}

func NewSftpService() *SftpService {
	return &SftpService{
		explorers: make(map[string]*SftpExplorer),
	}
}

func (s *SftpService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// OpenExplorer opens an SFTP subsystem on an existing SSH client for a given session.
func (s *SftpService) OpenExplorer(sessionID string, sshClient *gossh.Client) (string, error) {
	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		return "", fmt.Errorf("failed to open SFTP: %w", err)
	}

	explorerID := uuid.New().String()
	explorer := &SftpExplorer{
		ID:         explorerID,
		SessionID:  sessionID,
		SftpClient: sftpClient,
	}

	s.mu.Lock()
	s.explorers[explorerID] = explorer
	s.mu.Unlock()

	slog.Info("SFTP explorer opened", "explorerID", explorerID, "sessionID", sessionID)
	return explorerID, nil
}

func (s *SftpService) ListDir(explorerID, path string) ([]*domain.FileEntry, error) {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("explorer not found: %s", explorerID)
	}

	entries, err := explorer.SftpClient.ReadDir(path)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.FileEntry, 0, len(entries))
	for _, entry := range entries {
		result = append(result, sftp.ToDomainFileEntry(entry))
	}
	return result, nil
}

func (s *SftpService) Stat(explorerID, path string) (*domain.FileEntry, error) {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("explorer not found: %s", explorerID)
	}

	info, err := explorer.SftpClient.Stat(path)
	if err != nil {
		return nil, err
	}

	entry := sftp.ToDomainFileEntry(*info)
	return entry, nil
}

func (s *SftpService) Mkdir(explorerID, path string) error {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("explorer not found: %s", explorerID)
	}

	return explorer.SftpClient.Mkdir(path)
}

func (s *SftpService) Remove(explorerID, path string) error {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("explorer not found: %s", explorerID)
	}

	return explorer.SftpClient.Remove(path)
}

func (s *SftpService) Rename(explorerID, oldPath, newPath string) error {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("explorer not found: %s", explorerID)
	}

	return explorer.SftpClient.Rename(oldPath, newPath)
}

func (s *SftpService) Upload(explorerID, localPath, remotePath string) error {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("explorer not found: %s", explorerID)
	}

	return explorer.SftpClient.Upload(localPath, remotePath, func(bytesTransferred, total int64) {
		if s.ctx != nil {
			runtime.EventsEmit(s.ctx, "sftp:transfer-progress", map[string]interface{}{
				"explorerID":      explorerID,
				"bytesTransferred": bytesTransferred,
				"totalBytes":      total,
				"isUpload":        true,
			})
		}
	})
}

func (s *SftpService) Download(explorerID, remotePath, localPath string) error {
	s.mu.RLock()
	explorer, ok := s.explorers[explorerID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("explorer not found: %s", explorerID)
	}

	return explorer.SftpClient.Download(remotePath, localPath, func(bytesTransferred, total int64) {
		if s.ctx != nil {
			runtime.EventsEmit(s.ctx, "sftp:transfer-progress", map[string]interface{}{
				"explorerID":      explorerID,
				"bytesTransferred": bytesTransferred,
				"totalBytes":      total,
				"isUpload":        false,
			})
		}
	})
}

func (s *SftpService) CloseExplorer(explorerID string) error {
	s.mu.Lock()
	explorer, ok := s.explorers[explorerID]
	if ok {
		delete(s.explorers, explorerID)
	}
	s.mu.Unlock()

	if !ok {
		return fmt.Errorf("explorer not found: %s", explorerID)
	}

	return explorer.SftpClient.Close()
}

func (s *SftpService) CloseAllExplorers() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, explorer := range s.explorers {
		if err := explorer.SftpClient.Close(); err != nil {
			slog.Warn("failed to close SFTP explorer", "id", id, "error", err)
		}
		delete(s.explorers, id)
	}
}
