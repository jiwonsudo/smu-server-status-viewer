// Package incidentstore persists a durable history of service outages and
// the AI verdict computed for each one. Follows the clickstore pattern: a
// nil *sql.DB puts the Store in no-op mode (Enabled() == false) so the rest
// of the API keeps working without a database.
//
// The embedding column is JSONB (a []float32 marshaled to JSON), not
// pgvector's VECTOR type — retrieval is currently done with SQL aggregates
// (see Stats), and embeddings are stored now so that switching to
// pgvector cosine search is a migration + query change once the corpus is
// large enough to make semantic retrieval worthwhile.
package incidentstore

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"smu-server-status-viewer/backend/internal/academic"
)

type Store struct {
	db *sql.DB // nil means disabled
}

// Incident is one outage. Verdict* fields are zero until the AI analysis
// lands (a few seconds after StartedAt); Resolved* fields are zero while
// the outage is ongoing.
type Incident struct {
	ID              int64      `json:"id"`
	ServiceKey      string     `json:"serviceKey"`
	SiteKey         string     `json:"siteKey"`
	StartedAt       time.Time  `json:"startedAt"`
	ResolvedAt      *time.Time `json:"resolvedAt,omitempty"`
	DurationMinutes *int       `json:"durationMinutes,omitempty"`
	DownStatus      string     `json:"downStatus"` // raw: error | timeout
	ContextTag      string     `json:"contextTag,omitempty"`
	SummaryText     string     `json:"-"`

	Verdict           string     `json:"verdict,omitempty"`
	VerdictConfidence *float64   `json:"verdictConfidence,omitempty"`
	VerdictETA        string     `json:"verdictEta,omitempty"`
	VerdictReasoning  string     `json:"verdictReasoning,omitempty"`
	VerdictModel      string     `json:"verdictModel,omitempty"`
	VerdictAt         *time.Time `json:"verdictAt,omitempty"`
}

// Stats is the historical context handed to the LLM (and returned to the
// frontend). All windows are "all recorded incidents for this service".
type Stats struct {
	Count             int `json:"count"`
	ResolvedCount     int `json:"resolvedCount"`
	MedianMinutes     int `json:"medianMinutes"`
	MinMinutes        int `json:"minMinutes"`
	MaxMinutes        int `json:"maxMinutes"`
	SameHourCount     int `json:"sameHourCount"` // incidents started within ±1h clock time
	SameHourMedian    int `json:"sameHourMedian"`
	SameWeekdayCount  int `json:"sameWeekdayCount"`
	SameContextCount  int `json:"sameContextCount"` // incidents with the same context_tag
	SameContextMedian int `json:"sameContextMedian"`
	Flapping24hCount  int `json:"flapping24hCount"` // incidents for this service in the last 24h
}

func New(db *sql.DB) (*Store, error) {
	if db == nil {
		return &Store{}, nil
	}

	const schema = `
		CREATE TABLE IF NOT EXISTS incidents (
			id                 BIGSERIAL PRIMARY KEY,
			service_key        TEXT NOT NULL,
			site_key           TEXT NOT NULL,
			started_at         TIMESTAMPTZ NOT NULL,
			resolved_at        TIMESTAMPTZ,
			duration_minutes   INT,
			down_status        TEXT NOT NULL,
			context_tag        TEXT,
			summary_text       TEXT,
			embedding          JSONB,
			verdict            TEXT,
			verdict_confidence REAL,
			verdict_eta        TEXT,
			verdict_reasoning  TEXT,
			verdict_model      TEXT,
			verdict_at         TIMESTAMPTZ
		);
		CREATE INDEX IF NOT EXISTS incidents_service_started
			ON incidents (service_key, started_at DESC);
	`
	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Enabled() bool { return s.db != nil }

// Open records the start of an outage and returns its id. summaryText and
// embedding are attached later via SaveEnrichment once computed.
func (s *Store) Open(ctx context.Context, serviceKey, siteKey, downStatus, contextTag string, startedAt time.Time) (int64, error) {
	if s.db == nil {
		return 0, nil
	}
	var id int64
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO incidents (service_key, site_key, started_at, down_status, context_tag)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		RETURNING id
	`, serviceKey, siteKey, startedAt, downStatus, contextTag).Scan(&id)
	return id, err
}

// Resolve closes the most recent still-open incident for serviceKey.
func (s *Store) Resolve(ctx context.Context, serviceKey string, resolvedAt time.Time) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE incidents
		SET resolved_at = $2,
		    duration_minutes = GREATEST(0, ROUND(EXTRACT(EPOCH FROM ($2 - started_at)) / 60)::int)
		WHERE id = (
			SELECT id FROM incidents
			WHERE service_key = $1 AND resolved_at IS NULL
			ORDER BY started_at DESC
			LIMIT 1
		)
	`, serviceKey, resolvedAt)
	return err
}

// SaveEnrichment attaches the natural-language summary and its embedding.
func (s *Store) SaveEnrichment(ctx context.Context, id int64, summaryText string, embedding []float32) error {
	if s.db == nil || id == 0 {
		return nil
	}
	var embJSON any
	if len(embedding) > 0 {
		b, err := json.Marshal(embedding)
		if err != nil {
			return err
		}
		embJSON = string(b)
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE incidents SET summary_text = $2, embedding = $3 WHERE id = $1
	`, id, summaryText, embJSON)
	return err
}

// SaveVerdict attaches the AI analysis result.
func (s *Store) SaveVerdict(ctx context.Context, id int64, verdict string, confidence float64, eta, reasoning, model string, at time.Time) error {
	if s.db == nil || id == 0 {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE incidents
		SET verdict = $2, verdict_confidence = $3, verdict_eta = $4,
		    verdict_reasoning = $5, verdict_model = $6, verdict_at = $7
		WHERE id = $1
	`, id, verdict, confidence, eta, reasoning, model, at)
	return err
}

const incidentCols = `
	SELECT id, service_key, site_key, started_at, resolved_at, duration_minutes,
	       down_status, COALESCE(context_tag, ''), COALESCE(summary_text, ''),
	       COALESCE(verdict, ''), verdict_confidence, COALESCE(verdict_eta, ''),
	       COALESCE(verdict_reasoning, ''), COALESCE(verdict_model, ''), verdict_at
	FROM incidents `

func scanIncident(row interface{ Scan(...any) error }) (*Incident, error) {
	var in Incident
	err := row.Scan(
		&in.ID, &in.ServiceKey, &in.SiteKey, &in.StartedAt, &in.ResolvedAt, &in.DurationMinutes,
		&in.DownStatus, &in.ContextTag, &in.SummaryText,
		&in.Verdict, &in.VerdictConfidence, &in.VerdictETA,
		&in.VerdictReasoning, &in.VerdictModel, &in.VerdictAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &in, nil
}

// Latest returns the most recent incident for siteKey (open or resolved),
// or (nil, nil) if none recorded / disabled.
func (s *Store) Latest(ctx context.Context, siteKey string) (*Incident, error) {
	if s.db == nil {
		return nil, nil
	}
	return scanIncident(s.db.QueryRowContext(ctx,
		incidentCols+`WHERE site_key = $1 ORDER BY started_at DESC LIMIT 1`, siteKey))
}

// Get returns one incident by id, or (nil, nil) if not found / disabled.
func (s *Store) Get(ctx context.Context, id int64) (*Incident, error) {
	if s.db == nil {
		return nil, nil
	}
	return scanIncident(s.db.QueryRowContext(ctx, incidentCols+`WHERE id = $1`, id))
}

// RecentIncident is a trimmed row for the "최근 안정성" list shown even when
// the service is currently up.
type RecentIncident struct {
	StartedAt       time.Time  `json:"startedAt"`
	ResolvedAt      *time.Time `json:"resolvedAt,omitempty"`
	DurationMinutes *int       `json:"durationMinutes,omitempty"`
	DownStatus      string     `json:"downStatus"`
	Verdict         string     `json:"verdict,omitempty"`
}

// Recent returns up to limit most-recent incidents for siteKey, newest first.
func (s *Store) Recent(ctx context.Context, siteKey string, limit int) ([]RecentIncident, error) {
	if s.db == nil {
		return nil, nil
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT started_at, resolved_at, duration_minutes, down_status, COALESCE(verdict, '')
		FROM incidents
		WHERE site_key = $1
		ORDER BY started_at DESC
		LIMIT $2
	`, siteKey, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []RecentIncident
	for rows.Next() {
		var r RecentIncident
		if err := rows.Scan(&r.StartedAt, &r.ResolvedAt, &r.DurationMinutes, &r.DownStatus, &r.Verdict); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// Stats computes the historical context for serviceKey relative to now
// (the moment the current outage started).
func (s *Store) Stats(ctx context.Context, serviceKey string, now time.Time) (Stats, error) {
	var st Stats
	if s.db == nil {
		return st, nil
	}

	// Pull every resolved incident's duration + start time; small tables,
	// so aggregate in Go rather than write six correlated SQL queries.
	rows, err := s.db.QueryContext(ctx, `
		SELECT started_at, resolved_at, duration_minutes, COALESCE(context_tag, '')
		FROM incidents
		WHERE service_key = $1 AND started_at < $2
		ORDER BY started_at
	`, serviceKey, now)
	if err != nil {
		return st, err
	}
	defer rows.Close()

	nowHour := now.Hour()
	nowWeekday := now.Weekday()
	nowCtx := academic.ContextTag(now)

	var all, sameHour, sameCtx []int
	for rows.Next() {
		var startedAt time.Time
		var resolvedAt sql.NullTime
		var dur sql.NullInt64
		var tag string
		if err := rows.Scan(&startedAt, &resolvedAt, &dur, &tag); err != nil {
			return st, err
		}
		st.Count++
		if now.Sub(startedAt) <= 24*time.Hour {
			st.Flapping24hCount++
		}
		if !dur.Valid {
			continue
		}
		st.ResolvedCount++
		d := int(dur.Int64)
		all = append(all, d)
		if hourDiff(startedAt.Hour(), nowHour) <= 1 {
			st.SameHourCount++
			sameHour = append(sameHour, d)
		}
		if startedAt.Weekday() == nowWeekday {
			st.SameWeekdayCount++
		}
		if tag != "" && tag == nowCtx {
			st.SameContextCount++
			sameCtx = append(sameCtx, d)
		}
	}
	if err := rows.Err(); err != nil {
		return st, err
	}

	st.MedianMinutes = median(all)
	st.MinMinutes, st.MaxMinutes = minMax(all)
	st.SameHourMedian = median(sameHour)
	st.SameContextMedian = median(sameCtx)
	return st, nil
}

func hourDiff(a, b int) int {
	d := a - b
	if d < 0 {
		d = -d
	}
	if d > 12 {
		d = 24 - d
	}
	return d
}

func median(v []int) int {
	if len(v) == 0 {
		return 0
	}
	s := append([]int(nil), v...)
	sortInts(s)
	n := len(s)
	if n%2 == 1 {
		return s[n/2]
	}
	return (s[n/2-1] + s[n/2]) / 2
}

func minMax(v []int) (int, int) {
	if len(v) == 0 {
		return 0, 0
	}
	lo, hi := v[0], v[0]
	for _, x := range v[1:] {
		if x < lo {
			lo = x
		}
		if x > hi {
			hi = x
		}
	}
	return lo, hi
}

func sortInts(s []int) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j-1] > s[j]; j-- {
			s[j-1], s[j] = s[j], s[j-1]
		}
	}
}
