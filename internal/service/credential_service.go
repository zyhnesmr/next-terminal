package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/infrastructure/crypto"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type CredentialService struct {
	credRepo  model.CredentialRepository
	encryptor *crypto.Encryptor
}

func NewCredentialService(credRepo model.CredentialRepository, encryptor *crypto.Encryptor) *CredentialService {
	return &CredentialService{credRepo: credRepo, encryptor: encryptor}
}

func (s *CredentialService) SaveCredential(ctx context.Context, cred *domain.Credential) error {
	if cred.ID == "" {
		cred.ID = uuid.New().String()
	}
	now := time.Now().Unix()
	cred.CreatedAt = now
	cred.UpdatedAt = now

	// Encrypt sensitive fields before storage
	if cred.Password != "" {
		encrypted, err := s.encryptor.Encrypt(cred.Password)
		if err != nil {
			return err
		}
		cred.Password = encrypted
	}
	if cred.PrivateKey != "" {
		encrypted, err := s.encryptor.Encrypt(cred.PrivateKey)
		if err != nil {
			return err
		}
		cred.PrivateKey = encrypted
	}
	if cred.KeyPassphrase != "" {
		encrypted, err := s.encryptor.Encrypt(cred.KeyPassphrase)
		if err != nil {
			return err
		}
		cred.KeyPassphrase = encrypted
	}

	return s.credRepo.Create(ctx, cred)
}

func (s *CredentialService) GetCredential(ctx context.Context, id string) (*domain.Credential, error) {
	cred, err := s.credRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Decrypt sensitive fields
	if cred.Password != "" {
		decrypted, err := s.encryptor.Decrypt(cred.Password)
		if err != nil {
			return nil, err
		}
		cred.Password = decrypted
	}
	if cred.PrivateKey != "" {
		decrypted, err := s.encryptor.Decrypt(cred.PrivateKey)
		if err != nil {
			return nil, err
		}
		cred.PrivateKey = decrypted
	}
	if cred.KeyPassphrase != "" {
		decrypted, err := s.encryptor.Decrypt(cred.KeyPassphrase)
		if err != nil {
			return nil, err
		}
		cred.KeyPassphrase = decrypted
	}

	return cred, nil
}

func (s *CredentialService) ListCredentials(ctx context.Context) ([]*domain.Credential, error) {
	// List only returns metadata, no sensitive fields
	return s.credRepo.List(ctx)
}

func (s *CredentialService) DeleteCredential(ctx context.Context, id string) error {
	return s.credRepo.Delete(ctx, id)
}

func (s *CredentialService) UpdateCredential(ctx context.Context, cred *domain.Credential) error {
	cred.UpdatedAt = time.Now().Unix()

	if cred.Password != "" {
		encrypted, err := s.encryptor.Encrypt(cred.Password)
		if err != nil {
			return err
		}
		cred.Password = encrypted
	}
	if cred.PrivateKey != "" {
		encrypted, err := s.encryptor.Encrypt(cred.PrivateKey)
		if err != nil {
			return err
		}
		cred.PrivateKey = encrypted
	}
	if cred.KeyPassphrase != "" {
		encrypted, err := s.encryptor.Encrypt(cred.KeyPassphrase)
		if err != nil {
			return err
		}
		cred.KeyPassphrase = encrypted
	}

	return s.credRepo.Update(ctx, cred)
}
