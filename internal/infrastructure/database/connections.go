package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type ConnectionRepo struct {
	db *sql.DB
}

func NewConnectionRepo(db *sql.DB) *ConnectionRepo {
	return &ConnectionRepo{db: db}
}

func (r *ConnectionRepo) Create(ctx context.Context, conn *domain.Connection) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO connections (id, name, group_id, host, port, username, auth_method, credential_id,
			password, private_key, key_passphrase, jump_host_ids,
			keep_alive_interval, connection_timeout, terminal_type, font_size,
			sort_order, last_used_at, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		conn.ID, conn.Name, nilIfEmpty(conn.GroupID), conn.Host, conn.Port, conn.Username,
		string(conn.AuthMethod), nilIfEmpty(conn.CredentialID),
		nilIfEmpty(conn.Password), nilIfEmpty(conn.PrivateKey), nilIfEmpty(conn.KeyPassphrase),
		nilIfEmpty(conn.JumpHostIDs),
		conn.KeepAliveInterval, conn.ConnectionTimeout, conn.TerminalType, conn.FontSize,
		conn.SortOrder, nilIfZero(conn.LastUsedAt), conn.CreatedAt, conn.UpdatedAt, nilIfZero(conn.DeletedAt),
	)
	return err
}

func (r *ConnectionRepo) GetByID(ctx context.Context, id string) (*domain.Connection, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, name, group_id, host, port, username, auth_method, credential_id,
			password, private_key, key_passphrase, jump_host_ids,
			keep_alive_interval, connection_timeout, terminal_type, font_size,
			sort_order, last_used_at, created_at, updated_at, deleted_at
		FROM connections WHERE id = ? AND deleted_at IS NULL`, id)

	conn := &domain.Connection{}
	var groupID, credID, password, privateKey, keyPassphrase, jumpHostIDs sql.NullString
	var lastUsedAt, deletedAt sql.NullInt64

	err := row.Scan(
		&conn.ID, &conn.Name, &groupID, &conn.Host, &conn.Port, &conn.Username,
		&conn.AuthMethod, &credID, &password, &privateKey, &keyPassphrase, &jumpHostIDs,
		&conn.KeepAliveInterval, &conn.ConnectionTimeout, &conn.TerminalType, &conn.FontSize,
		&conn.SortOrder, &lastUsedAt, &conn.CreatedAt, &conn.UpdatedAt, &deletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("connection not found: %s", id)
	}
	if err != nil {
		return nil, err
	}

	conn.GroupID = groupID.String
	conn.CredentialID = credID.String
	conn.Password = password.String
	conn.PrivateKey = privateKey.String
	conn.KeyPassphrase = keyPassphrase.String
	conn.JumpHostIDs = jumpHostIDs.String
	conn.LastUsedAt = lastUsedAt.Int64
	conn.DeletedAt = deletedAt.Int64
	return conn, nil
}

func (r *ConnectionRepo) List(ctx context.Context) ([]*domain.Connection, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, group_id, host, port, username, auth_method, credential_id,
			password, private_key, key_passphrase, jump_host_ids,
			keep_alive_interval, connection_timeout, terminal_type, font_size,
			sort_order, last_used_at, created_at, updated_at, deleted_at
		FROM connections WHERE deleted_at IS NULL ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanConnections(rows)
}

func (r *ConnectionRepo) ListByGroup(ctx context.Context, groupID string) ([]*domain.Connection, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, group_id, host, port, username, auth_method, credential_id,
			password, private_key, key_passphrase, jump_host_ids,
			keep_alive_interval, connection_timeout, terminal_type, font_size,
			sort_order, last_used_at, created_at, updated_at, deleted_at
		FROM connections WHERE group_id = ? AND deleted_at IS NULL ORDER BY sort_order, name`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanConnections(rows)
}

func (r *ConnectionRepo) Update(ctx context.Context, conn *domain.Connection) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE connections SET name=?, group_id=?, host=?, port=?, username=?, auth_method=?,
			credential_id=?, password=?, private_key=?, key_passphrase=?, jump_host_ids=?,
			keep_alive_interval=?, connection_timeout=?, terminal_type=?, font_size=?,
			sort_order=?, updated_at=?
		WHERE id=? AND deleted_at IS NULL`,
		conn.Name, nilIfEmpty(conn.GroupID), conn.Host, conn.Port, conn.Username,
		string(conn.AuthMethod), nilIfEmpty(conn.CredentialID),
		nilIfEmpty(conn.Password), nilIfEmpty(conn.PrivateKey), nilIfEmpty(conn.KeyPassphrase),
		nilIfEmpty(conn.JumpHostIDs),
		conn.KeepAliveInterval, conn.ConnectionTimeout, conn.TerminalType, conn.FontSize,
		conn.SortOrder, conn.UpdatedAt, conn.ID,
	)
	return err
}

func (r *ConnectionRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE connections SET deleted_at = unixepoch() WHERE id = ?`, id)
	return err
}

func (r *ConnectionRepo) UpdateLastUsed(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE connections SET last_used_at = unixepoch() WHERE id = ?`, id)
	return err
}

func scanConnections(rows *sql.Rows) ([]*domain.Connection, error) {
	var conns []*domain.Connection
	for rows.Next() {
		conn := &domain.Connection{}
		var groupID, credID, password, privateKey, keyPassphrase, jumpHostIDs sql.NullString
		var lastUsedAt, deletedAt sql.NullInt64

		err := rows.Scan(
			&conn.ID, &conn.Name, &groupID, &conn.Host, &conn.Port, &conn.Username,
			&conn.AuthMethod, &credID, &password, &privateKey, &keyPassphrase, &jumpHostIDs,
			&conn.KeepAliveInterval, &conn.ConnectionTimeout, &conn.TerminalType, &conn.FontSize,
			&conn.SortOrder, &lastUsedAt, &conn.CreatedAt, &conn.UpdatedAt, &deletedAt,
		)
		if err != nil {
			return nil, err
		}

		conn.GroupID = groupID.String
		conn.CredentialID = credID.String
		conn.Password = password.String
		conn.PrivateKey = privateKey.String
		conn.KeyPassphrase = keyPassphrase.String
		conn.JumpHostIDs = jumpHostIDs.String
		conn.LastUsedAt = lastUsedAt.Int64
		conn.DeletedAt = deletedAt.Int64
		conns = append(conns, conn)
	}
	return conns, rows.Err()
}

// Compile-time check
var _ model.ConnectionRepository = (*ConnectionRepo)(nil)

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nilIfZero(n int64) any {
	if n == 0 {
		return nil
	}
	return n
}
