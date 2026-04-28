package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/zyhnesmr/next-terminal/internal/domain"
	"github.com/zyhnesmr/next-terminal/internal/model"
)

type GroupRepo struct {
	db *sql.DB
}

func NewGroupRepo(db *sql.DB) *GroupRepo {
	return &GroupRepo{db: db}
}

// Compile-time check
var _ model.GroupRepository = (*GroupRepo)(nil)

func (r *GroupRepo) Create(ctx context.Context, group *domain.Group) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO groups (id, name, parent_id, sort_order, is_expanded, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		group.ID, group.Name, nilIfEmpty(group.ParentID), group.SortOrder,
		boolToInt(group.IsExpanded), group.CreatedAt, group.UpdatedAt,
	)
	return err
}

func (r *GroupRepo) GetByID(ctx context.Context, id string) (*domain.Group, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, name, parent_id, sort_order, is_expanded, created_at, updated_at
		FROM groups WHERE id = ?`, id)

	group := &domain.Group{}
	var parentID sql.NullString
	var isExpanded int

	err := row.Scan(&group.ID, &group.Name, &parentID, &group.SortOrder, &isExpanded, &group.CreatedAt, &group.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("group not found: %s", id)
	}
	if err != nil {
		return nil, err
	}

	group.ParentID = parentID.String
	group.IsExpanded = isExpanded == 1
	return group, nil
}

func (r *GroupRepo) List(ctx context.Context) ([]*domain.Group, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, parent_id, sort_order, is_expanded, created_at, updated_at
		FROM groups ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*domain.Group
	for rows.Next() {
		group := &domain.Group{}
		var parentID sql.NullString
		var isExpanded int
		if err := rows.Scan(&group.ID, &group.Name, &parentID, &group.SortOrder, &isExpanded, &group.CreatedAt, &group.UpdatedAt); err != nil {
			return nil, err
		}
		group.ParentID = parentID.String
		group.IsExpanded = isExpanded == 1
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (r *GroupRepo) Update(ctx context.Context, group *domain.Group) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE groups SET name=?, parent_id=?, sort_order=?, is_expanded=?, updated_at=?
		WHERE id=?`,
		group.Name, nilIfEmpty(group.ParentID), group.SortOrder,
		boolToInt(group.IsExpanded), group.UpdatedAt, group.ID,
	)
	return err
}

func (r *GroupRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM groups WHERE id = ?`, id)
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
