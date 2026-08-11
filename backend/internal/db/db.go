// Package db opens the single shared Postgres connection pool used by
// clickstore and userstore. Returns (nil, nil) when DATABASE_URL isn't
// configured so callers can fall back to their own disabled/no-op mode
// (mirrors the mailer/kakao "silently skip" pattern used elsewhere).
package db

import (
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func Open(databaseURL string) (*sql.DB, error) {
	if databaseURL == "" {
		return nil, nil
	}

	conn, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	if err := conn.Ping(); err != nil {
		return nil, err
	}
	return conn, nil
}
