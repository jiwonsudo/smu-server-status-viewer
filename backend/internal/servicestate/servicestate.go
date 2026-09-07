// Package servicestate persists the last confirmed status of each monitored
// service in Postgres, so a server restart doesn't lose the baseline and
// re-fire "장애" alerts on the first check after boot. Replaces the old
// git-tracked data/status.json (Render's free tier has no persistent disk,
// so a file wouldn't survive a restart anyway).
//
// If DATABASE_URL isn't configured, Store is a no-op (mirrors clickstore /
// mailer): Load returns nothing and Save drops the write. The state monitor
// then runs purely in memory — transition detection still works while the
// process is up, it just loses its baseline across restarts.
package servicestate

import (
	"context"
	"database/sql"
	"time"
)

type Store struct {
	db *sql.DB // nil means disabled
}

// Entry is one service's last confirmed status.
type Entry struct {
	Status    string    // raw statuschecker status: "ok" | "error" | "timeout"
	ChangedAt time.Time // when the service last transitioned into Status
}

// New wraps the shared DB connection (see internal/db). A nil db is valid
// and puts the Store in disabled/no-op mode.
func New(db *sql.DB) (*Store, error) {
	if db == nil {
		return &Store{}, nil
	}

	const schema = `
		CREATE TABLE IF NOT EXISTS service_status (
			service_key TEXT PRIMARY KEY,
			status      TEXT NOT NULL,
			changed_at  TIMESTAMPTZ NOT NULL,
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`
	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Enabled() bool { return s.db != nil }

// Load returns the last confirmed status of every service, keyed by service
// key. An empty map (no rows, or disabled) is normal on first boot.
func (s *Store) Load(ctx context.Context) (map[string]Entry, error) {
	out := map[string]Entry{}
	if s.db == nil {
		return out, nil
	}

	rows, err := s.db.QueryContext(ctx, `SELECT service_key, status, changed_at FROM service_status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var key string
		var e Entry
		if err := rows.Scan(&key, &e.Status, &e.ChangedAt); err != nil {
			return nil, err
		}
		out[key] = e
	}
	return out, rows.Err()
}

// Save upserts one service's confirmed status.
func (s *Store) Save(ctx context.Context, serviceKey string, e Entry) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO service_status (service_key, status, changed_at, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (service_key)
		DO UPDATE SET status = EXCLUDED.status, changed_at = EXCLUDED.changed_at, updated_at = now()
	`, serviceKey, e.Status, e.ChangedAt)
	return err
}
