// Package userstore persists Kakao-logged-in users, their login sessions,
// and their per-site notification subscriptions in Postgres. Like
// clickstore, a nil *sql.DB puts it in disabled/no-op mode so the rest of
// the API keeps working without a database configured.
package userstore

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"
)

var ErrDisabled = errors.New("userstore: no database configured")

type Store struct {
	db *sql.DB // nil means disabled
}

func New(db *sql.DB) (*Store, error) {
	if db == nil {
		return &Store{}, nil
	}

	const schema = `
		CREATE TABLE IF NOT EXISTS kakao_users (
			kakao_id BIGINT PRIMARY KEY,
			nickname TEXT,
			access_token TEXT NOT NULL,
			refresh_token TEXT NOT NULL,
			token_expires_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS kakao_sessions (
			session_token TEXT PRIMARY KEY,
			kakao_id BIGINT NOT NULL REFERENCES kakao_users(kakao_id) ON DELETE CASCADE,
			expires_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS kakao_subscriptions (
			kakao_id BIGINT NOT NULL REFERENCES kakao_users(kakao_id) ON DELETE CASCADE,
			site_key TEXT NOT NULL,
			PRIMARY KEY (kakao_id, site_key)
		);
	`
	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	return &Store{db: db}, nil
}

func (s *Store) Enabled() bool {
	return s.db != nil
}

type User struct {
	KakaoID      int64
	Nickname     string
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}

// UpsertUser records (or refreshes) a logged-in user's tokens.
func (s *Store) UpsertUser(ctx context.Context, u User) error {
	if s.db == nil {
		return ErrDisabled
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO kakao_users (kakao_id, nickname, access_token, refresh_token, token_expires_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (kakao_id) DO UPDATE SET
			nickname = EXCLUDED.nickname,
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			token_expires_at = EXCLUDED.token_expires_at
	`, u.KakaoID, u.Nickname, u.AccessToken, u.RefreshToken, u.ExpiresAt)
	return err
}

// UpdateTokens is called after a token refresh (nickname untouched).
func (s *Store) UpdateTokens(ctx context.Context, kakaoID int64, accessToken, refreshToken string, expiresAt time.Time) error {
	if s.db == nil {
		return ErrDisabled
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE kakao_users SET access_token = $2, refresh_token = $3, token_expires_at = $4
		WHERE kakao_id = $1
	`, kakaoID, accessToken, refreshToken, expiresAt)
	return err
}

// CreateSession issues a new random session token for kakaoID, valid for ttl.
func (s *Store) CreateSession(ctx context.Context, kakaoID int64, ttl time.Duration) (string, error) {
	if s.db == nil {
		return "", ErrDisabled
	}

	token, err := randomToken()
	if err != nil {
		return "", err
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO kakao_sessions (session_token, kakao_id, expires_at)
		VALUES ($1, $2, $3)
	`, token, kakaoID, time.Now().Add(ttl))
	if err != nil {
		return "", err
	}
	return token, nil
}

// SessionUser resolves a session token to its user, if the session exists
// and hasn't expired.
func (s *Store) SessionUser(ctx context.Context, sessionToken string) (User, bool, error) {
	if s.db == nil {
		return User{}, false, nil
	}

	var u User
	err := s.db.QueryRowContext(ctx, `
		SELECT u.kakao_id, u.nickname, u.access_token, u.refresh_token, u.token_expires_at
		FROM kakao_sessions s
		JOIN kakao_users u ON u.kakao_id = s.kakao_id
		WHERE s.session_token = $1 AND s.expires_at > now()
	`, sessionToken).Scan(&u.KakaoID, &u.Nickname, &u.AccessToken, &u.RefreshToken, &u.ExpiresAt)

	if errors.Is(err, sql.ErrNoRows) {
		return User{}, false, nil
	}
	if err != nil {
		return User{}, false, err
	}
	return u, true, nil
}

func (s *Store) DeleteSession(ctx context.Context, sessionToken string) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM kakao_sessions WHERE session_token = $1`, sessionToken)
	return err
}

func (s *Store) Subscriptions(ctx context.Context, kakaoID int64) ([]string, error) {
	if s.db == nil {
		return nil, nil
	}
	rows, err := s.db.QueryContext(ctx, `SELECT site_key FROM kakao_subscriptions WHERE kakao_id = $1`, kakaoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (s *Store) Subscribe(ctx context.Context, kakaoID int64, siteKey string) error {
	if s.db == nil {
		return ErrDisabled
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO kakao_subscriptions (kakao_id, site_key) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, kakaoID, siteKey)
	return err
}

func (s *Store) Unsubscribe(ctx context.Context, kakaoID int64, siteKey string) error {
	if s.db == nil {
		return ErrDisabled
	}
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM kakao_subscriptions WHERE kakao_id = $1 AND site_key = $2
	`, kakaoID, siteKey)
	return err
}

// SubscribersForSite returns every user subscribed to siteKey, for sending
// down/recovery alerts.
func (s *Store) SubscribersForSite(ctx context.Context, siteKey string) ([]User, error) {
	if s.db == nil {
		return nil, nil
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT u.kakao_id, u.nickname, u.access_token, u.refresh_token, u.token_expires_at
		FROM kakao_subscriptions sub
		JOIN kakao_users u ON u.kakao_id = sub.kakao_id
		WHERE sub.site_key = $1
	`, siteKey)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.KakaoID, &u.Nickname, &u.AccessToken, &u.RefreshToken, &u.ExpiresAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
