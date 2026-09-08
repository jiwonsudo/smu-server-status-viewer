// Package clickstore persists per-site click counts in Postgres. If
// DATABASE_URL isn't configured, Store is a no-op so the rest of the API
// keeps working without a database.
package clickstore

import (
	"context"
	"database/sql"
)

type Store struct {
	db *sql.DB // nil means disabled
}

// New wraps the shared DB connection. A nil db puts the Store in no-op mode.
func New(db *sql.DB) (*Store, error) {
	if db == nil {
		return &Store{}, nil
	}

	const schema = `
		CREATE TABLE IF NOT EXISTS site_clicks (
			site_key TEXT PRIMARY KEY,
			click_count BIGINT NOT NULL DEFAULT 0
		)
	`
	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	return &Store{db: db}, nil
}

func (s *Store) Enabled() bool {
	return s.db != nil
}

func (s *Store) Increment(ctx context.Context, siteKey string) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO site_clicks (site_key, click_count)
		VALUES ($1, 1)
		ON CONFLICT (site_key) DO UPDATE SET click_count = site_clicks.click_count + 1
	`, siteKey)
	return err
}

func (s *Store) All(ctx context.Context) (map[string]int64, error) {
	counts := map[string]int64{}
	if s.db == nil {
		return counts, nil
	}

	rows, err := s.db.QueryContext(ctx, `SELECT site_key, click_count FROM site_clicks`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var key string
		var count int64
		if err := rows.Scan(&key, &count); err != nil {
			return nil, err
		}
		counts[key] = count
	}
	return counts, rows.Err()
}
