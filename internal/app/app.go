package app

import (
	"context"
	"log/slog"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/crypto"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/database"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/ssh"
	"github.com/zyhnesmr/next-terminal/internal/service"
)

type App struct {
	ctx             context.Context
	db              *database.Database
	connService     *service.ConnectionService
	sessionService  *service.SessionService
	credService     *service.CredentialService
	sftpService     *service.SftpService
	settingsService *service.SettingsService
	dialer          *ssh.Dialer
	mfaRegistry     *ssh.MFAChallengeRegistry
}

func NewApp() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	dataDir, err := database.DataDir()
	if err != nil {
		slog.Error("failed to get data directory", "error", err)
		return
	}

	dbPath := dataDir + "/data.db"
	a.db, err = database.Open(dbPath)
	if err != nil {
		slog.Error("failed to open database", "error", err)
		return
	}

	if err := a.db.RunMigrations(); err != nil {
		slog.Error("failed to run migrations", "error", err)
		return
	}

	sqlDB := a.db.DB()

	connRepo := database.NewConnectionRepo(sqlDB)
	groupRepo := database.NewGroupRepo(sqlDB)
	credRepo := database.NewCredentialRepo(sqlDB)
	sessionRepo := database.NewSessionRepo(sqlDB)
	settingsRepo := database.NewSettingsRepo(sqlDB)

	masterKey, err := crypto.GetOrCreateMasterKey()
	if err != nil {
		slog.Error("failed to get master key", "error", err)
		return
	}

	encryptor, err := crypto.NewEncryptor(masterKey)
	if err != nil {
		slog.Error("failed to create encryptor", "error", err)
		return
	}

	a.dialer = ssh.NewDialer()
	a.mfaRegistry = ssh.NewMFAChallengeRegistry(ctx)
	a.connService = service.NewConnectionService(connRepo, groupRepo)
	a.credService = service.NewCredentialService(credRepo, encryptor)
	a.connService.SetCredentialService(a.credService)
	a.sessionService = service.NewSessionService(sessionRepo, a.connService, a.credService, a.dialer)
	a.sessionService.SetContext(ctx)
	a.sessionService.SetMFARegistry(a.mfaRegistry)
	a.sftpService = service.NewSftpService()
	a.sftpService.SetContext(ctx)
	a.settingsService = service.NewSettingsService(settingsRepo)

	// Listen for terminal input events from frontend
	runtime.EventsOn(ctx, "terminal:input", func(optionalData ...interface{}) {
		if len(optionalData) < 2 {
			return
		}
		sessionID, ok1 := optionalData[0].(string)
		data, ok2 := optionalData[1].(string)
		if ok1 && ok2 {
			if err := a.sessionService.WriteToSession(sessionID, data); err != nil {
				slog.Warn("failed to write to session", "sessionID", sessionID, "error", err)
			}
		}
	})

	// Listen for terminal resize events
	runtime.EventsOn(ctx, "terminal:resize", func(optionalData ...interface{}) {
		if len(optionalData) < 3 {
			return
		}
		sessionID, ok1 := optionalData[0].(string)
		rows, ok2 := optionalData[1].(float64)
		cols, ok3 := optionalData[2].(float64)
		if ok1 && ok2 && ok3 {
			if err := a.sessionService.ResizeSession(sessionID, uint16(rows), uint16(cols)); err != nil {
				slog.Warn("failed to resize session", "sessionID", sessionID, "error", err)
			}
		}
	})

	// Listen for MFA response events from frontend
	runtime.EventsOn(ctx, "auth:mfa-response", func(optionalData ...interface{}) {
		if len(optionalData) < 2 {
			return
		}
		sessionID, ok1 := optionalData[0].(string)
		responses, ok2 := optionalData[1].([]string)
		if !ok1 || !ok2 {
			// Try as []interface{} and convert
			if raw, ok := optionalData[1].([]interface{}); ok {
				responses = make([]string, len(raw))
				for i, v := range raw {
					if s, ok := v.(string); ok {
						responses[i] = s
					}
				}
				ok2 = true
			}
		}
		if ok1 && ok2 {
			if err := a.sessionService.SubmitMFAResponse(sessionID, responses); err != nil {
				slog.Warn("failed to submit MFA response", "sessionID", sessionID, "error", err)
			}
		}
	})

	slog.Info("application started successfully")
}

func (a *App) Shutdown(ctx context.Context) {
	if a.sftpService != nil {
		a.sftpService.CloseAllExplorers()
	}
	if a.sessionService != nil {
		a.sessionService.CloseAllSessions()
	}
	if a.db != nil {
		if err := a.db.Close(); err != nil {
			slog.Error("failed to close database", "error", err)
		}
	}
	slog.Info("application shutdown")
}

// --- Wails-bound methods ---

// Connection management
func (a *App) ListConnections() ([]*domain.Connection, error) {
	return a.connService.ListConnections(a.ctx)
}

func (a *App) SaveConnection(conn *domain.Connection) error {
	if conn.ID == "" {
		return a.connService.CreateConnection(a.ctx, conn)
	}
	return a.connService.UpdateConnection(a.ctx, conn)
}

func (a *App) DeleteConnection(id string) error {
	return a.connService.DeleteConnection(a.ctx, id)
}

func (a *App) GetConnection(id string) (*domain.Connection, error) {
	return a.connService.GetConnection(a.ctx, id)
}

func (a *App) TestConnection(id string) error {
	return a.connService.TestConnection(a.ctx, id, a.dialer)
}

// Groups
func (a *App) ListGroups() ([]*domain.Group, error) {
	return a.connService.ListGroups(a.ctx)
}

func (a *App) SaveGroup(group *domain.Group) error {
	if group.ID == "" {
		return a.connService.CreateGroup(a.ctx, group)
	}
	return a.connService.UpdateGroup(a.ctx, group)
}

func (a *App) DeleteGroup(id string) error {
	return a.connService.DeleteGroup(a.ctx, id)
}

// Session management
func (a *App) StartSession(connectionID string) (string, error) {
	return a.sessionService.StartSession(a.ctx, connectionID)
}

func (a *App) CloseSession(sessionID string) error {
	return a.sessionService.CloseSession(sessionID)
}

func (a *App) WriteToSession(sessionID string, data string) error {
	return a.sessionService.WriteToSession(sessionID, data)
}

func (a *App) ResizeSession(sessionID string, rows int, cols int) error {
	return a.sessionService.ResizeSession(sessionID, uint16(rows), uint16(cols))
}

func (a *App) GetActiveSessions() []*domain.ActiveSession {
	return a.sessionService.GetActiveSessions()
}

// MFA
func (a *App) SubmitMFAResponse(sessionID string, responses []string) error {
	return a.sessionService.SubmitMFAResponse(sessionID, responses)
}

// Settings
func (a *App) GetSettings() (*domain.AppSettings, error) {
	return a.settingsService.GetSettings(a.ctx)
}

func (a *App) SaveSetting(key string, value string) error {
	return a.settingsService.SaveSetting(a.ctx, key, value)
}

// SFTP operations
func (a *App) OpenSftpExplorer(sessionID string) (string, error) {
	sshClient, err := a.sessionService.GetSSHClient(sessionID)
	if err != nil {
		return "", err
	}
	return a.sftpService.OpenExplorer(sessionID, sshClient)
}

func (a *App) SftpListDir(explorerID string, path string) ([]*domain.FileEntry, error) {
	return a.sftpService.ListDir(explorerID, path)
}

func (a *App) SftpStat(explorerID string, path string) (*domain.FileEntry, error) {
	return a.sftpService.Stat(explorerID, path)
}

func (a *App) SftpMkdir(explorerID string, path string) error {
	return a.sftpService.Mkdir(explorerID, path)
}

func (a *App) SftpRemove(explorerID string, path string) error {
	return a.sftpService.Remove(explorerID, path)
}

func (a *App) SftpRename(explorerID string, oldPath string, newPath string) error {
	return a.sftpService.Rename(explorerID, oldPath, newPath)
}

func (a *App) SftpUpload(explorerID string, localPath string, remotePath string) error {
	return a.sftpService.Upload(explorerID, localPath, remotePath)
}

func (a *App) SftpDownload(explorerID string, remotePath string, localPath string) error {
	return a.sftpService.Download(explorerID, remotePath, localPath)
}

func (a *App) CloseSftpExplorer(explorerID string) error {
	return a.sftpService.CloseExplorer(explorerID)
}

// Credential management
func (a *App) SaveCredential(cred *domain.Credential) error {
	if cred.ID == "" {
		return a.credService.SaveCredential(a.ctx, cred)
	}
	return a.credService.UpdateCredential(a.ctx, cred)
}

func (a *App) ListCredentials() ([]*domain.Credential, error) {
	return a.credService.ListCredentials(a.ctx)
}

func (a *App) DeleteCredential(id string) error {
	return a.credService.DeleteCredential(a.ctx, id)
}
