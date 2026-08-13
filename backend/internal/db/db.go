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
	// database/sql은 기본적으로 동시 커넥션 수 제한이 없다 — 트래픽이
	// 갑자기 몰리면(클릭 집계 등) Postgres 무료 티어의 커넥션 한도를 그대로
	// 넘겨버릴 수 있어서 명시적으로 상한을 둔다.
	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(5)
	return conn, nil
}
