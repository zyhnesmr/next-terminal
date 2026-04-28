package database

import (
	"context"
	"database/sql"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type SessionRepo struct {
	db *sql.DB
}

func NewSessionRepo(db *sql.DB) *SessionRepo {
	return &SessionRepo{db: db}
}

// Compile-time check
var _ model.SessionRepository = (*SessionRepo)(nil)

func (r *SessionRepo) Create(ctx context.Context, session *domain.SessionHistory) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO session_history (id, connection_id, started_at, ended_at, exit_status, bytes_sent, bytes_recv)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		session.ID, session.ConnectionID, session.StartedAt,
		nilIfZero(session.EndedAt), session.ExitStatus, session.BytesSent, session.BytesRecv,
	)
	return err
}

func (r *SessionRepo) UpdateEndTime(ctx context.Context, id string, endedAt int64, exitStatus int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE session_history SET ended_at = ?, exit_status = ? WHERE id = ?`,
		endedAt, exitStatus, id,
	)
	return err
}

func (r *SessionRepo) ListByConnection(ctx context.Context, connectionID string, limit int) ([]*domain.SessionHistory, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, connection_id, started_at, ended_at, exit_status, bytes_sent, bytes_recv
		FROM session_history WHERE connection_id = ?
		ORDER BY started_at DESC LIMIT ?`, connectionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*domain.SessionHistory
	for rows.Next() {
		s := &domain.SessionHistory{}
		var endedAt sql.NullInt64
		var exitStatus sql.NullInt64
		if err := rows.Scan(&s.ID, &s.ConnectionID, &s.StartedAt, &endedAt, &exitStatus, &s.BytesSent, &s.BytesRecv); err != nil {
			return nil, err
		}
		s.EndedAt = endedAt.Int64
		s.ExitStatus = int(exitStatus.Int64)
		sessions = append(sessions, s)
	}
	return sessions, rows.Err()
}
