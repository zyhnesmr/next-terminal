package service

import (
	"context"
	"encoding/json"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type SettingsService struct {
	settingsRepo model.SettingsRepository
}

func NewSettingsService(settingsRepo model.SettingsRepository) *SettingsService {
	return &SettingsService{settingsRepo: settingsRepo}
}

func (s *SettingsService) GetSettings(ctx context.Context) (*domain.AppSettings, error) {
	all, err := s.settingsRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	settings := domain.DefaultSettings()
	if v, ok := all["theme"]; ok {
		json.Unmarshal([]byte(v), &settings.Theme)
	}
	if v, ok := all["font_family"]; ok {
		json.Unmarshal([]byte(v), &settings.FontFamily)
	}
	if v, ok := all["font_size"]; ok {
		json.Unmarshal([]byte(v), &settings.FontSize)
	}
	if v, ok := all["default_shell"]; ok {
		json.Unmarshal([]byte(v), &settings.DefaultShell)
	}
	if v, ok := all["scrollback"]; ok {
		json.Unmarshal([]byte(v), &settings.Scrollback)
	}
	if v, ok := all["cursor_style"]; ok {
		json.Unmarshal([]byte(v), &settings.CursorStyle)
	}
	if v, ok := all["cursor_blink"]; ok {
		json.Unmarshal([]byte(v), &settings.CursorBlink)
	}
	if v, ok := all["copy_on_select"]; ok {
		json.Unmarshal([]byte(v), &settings.CopyOnSelect)
	}
	if v, ok := all["confirm_on_close"]; ok {
		json.Unmarshal([]byte(v), &settings.ConfirmOnClose)
	}

	return settings, nil
}

func (s *SettingsService) SaveSetting(ctx context.Context, key string, value string) error {
	return s.settingsRepo.Set(ctx, key, value)
}

func (s *SettingsService) GetSetting(ctx context.Context, key string) (string, error) {
	return s.settingsRepo.Get(ctx, key)
}
