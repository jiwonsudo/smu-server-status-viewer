// Package db opens the single shared Postgres connection pool. Returns
// (nil, nil) when DATABASE_URL isn't configured so callers can fall back to
// their own no-op mode.
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
	// Cap connections so a traffic spike doesn't exceed the Postgres
	// free-tier connection limit.
	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(5)
	return conn, nil
}
