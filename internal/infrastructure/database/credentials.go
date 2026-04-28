package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type CredentialRepo struct {
	db *sql.DB
}

func NewCredentialRepo(db *sql.DB) *CredentialRepo {
	return &CredentialRepo{db: db}
}

func (r *CredentialRepo) Create(ctx context.Context, cred *domain.Credential) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO credentials (id, name, type, password, private_key, key_passphrase, fingerprint, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		cred.ID, cred.Name, string(cred.Type),
		nilIfEmpty(cred.Password), nilIfEmpty(cred.PrivateKey), nilIfEmpty(cred.KeyPassphrase),
		nilIfEmpty(cred.Fingerprint), cred.CreatedAt, cred.UpdatedAt,
	)
	return err
}

func (r *CredentialRepo) GetByID(ctx context.Context, id string) (*domain.Credential, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, name, type, password, private_key, key_passphrase, fingerprint, created_at, updated_at
		FROM credentials WHERE id = ?`, id)

	cred := &domain.Credential{}
	var password, privateKey, keyPassphrase, fingerprint sql.NullString

	err := row.Scan(&cred.ID, &cred.Name, &cred.Type, &password, &privateKey, &keyPassphrase, &fingerprint, &cred.CreatedAt, &cred.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("credential not found: %s", id)
	}
	if err != nil {
		return nil, err
	}

	cred.Password = password.String
	cred.PrivateKey = privateKey.String
	cred.KeyPassphrase = keyPassphrase.String
	cred.Fingerprint = fingerprint.String
	return cred, nil
}

func (r *CredentialRepo) List(ctx context.Context) ([]*domain.Credential, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, type, fingerprint, created_at, updated_at
		FROM credentials ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []*domain.Credential
	for rows.Next() {
		cred := &domain.Credential{}
		var fingerprint sql.NullString
		if err := rows.Scan(&cred.ID, &cred.Name, &cred.Type, &fingerprint, &cred.CreatedAt, &cred.UpdatedAt); err != nil {
			return nil, err
		}
		cred.Fingerprint = fingerprint.String
		creds = append(creds, cred)
	}
	return creds, rows.Err()
}

func (r *CredentialRepo) Update(ctx context.Context, cred *domain.Credential) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE credentials SET name=?, type=?, password=?, private_key=?, key_passphrase=?, fingerprint=?, updated_at=?
		WHERE id=?`,
		cred.Name, string(cred.Type),
		nilIfEmpty(cred.Password), nilIfEmpty(cred.PrivateKey), nilIfEmpty(cred.KeyPassphrase),
		nilIfEmpty(cred.Fingerprint), cred.UpdatedAt, cred.ID,
	)
	return err
}

// Compile-time check
var _ model.CredentialRepository = (*CredentialRepo)(nil)

func (r *CredentialRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM credentials WHERE id = ?`, id)
	return err
}
