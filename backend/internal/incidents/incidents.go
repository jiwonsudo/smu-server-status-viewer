// Package incidents orchestrates the outage history + AI analysis feature:
// it turns a confirmed status transition (from internal/statemonitor) into
// a durable incident row, then — off the hot path — computes the natural-
// language summary, its embedding, the historical stats, and the Claude
// verdict, and writes them back.
//
// Everything degrades quietly: no DB → no incidents; no OPENAI_API_KEY →
// no embedding; no ANTHROPIC_API_KEY → no verdict. The status site keeps
// working regardless.
package incidents

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"smu-server-status-viewer/backend/internal/academic"
	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/embed"
	"smu-server-status-viewer/backend/internal/incidentai"
	"smu-server-status-viewer/backend/internal/incidentstore"
)

// analysisDelay is how long an outage must persist before it's worth an
// embedding + LLM call. Short blips (SMU has a lot of them) still get an
// incident row for the history, but no verdict — if it recovered this
// fast it was transient by definition.
const analysisDelay = 90 * time.Second

type Service struct {
	store *incidentstore.Store
}

func New(store *incidentstore.Store) *Service {
	return &Service{store: store}
}

// OnDown records the start of an outage and kicks off async enrichment +
// analysis. serviceKey is e.g. "ECAMPUS", siteKey "ecampus", downStatus
// the raw statuschecker status ("error" | "timeout").
func (s *Service) OnDown(ctx context.Context, serviceKey, siteKey, downStatus string, startedAt time.Time) {
	if !s.store.Enabled() {
		return
	}
	tag := academic.ContextTag(startedAt)
	id, err := s.store.Open(ctx, serviceKey, siteKey, downStatus, tag, startedAt)
	if err != nil {
		log.Printf("[incidents] %s open 실패: %v", serviceKey, err)
		return
	}
	log.Printf("[incidents] %s 장애 기록 #%d (%s, %s)", serviceKey, id, downStatus, tag)

	// Wait out analysisDelay; if the service recovered by then it was a
	// blip — skip the analysis entirely. Otherwise enrich (embedding + LLM)
	// off the hot path. A server restart during the wait loses the timer;
	// the admin reanalyze endpoint covers that rare case.
	time.AfterFunc(analysisDelay, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		cur, err := s.store.Get(ctx, id)
		cancel()
		if err != nil {
			log.Printf("[incidents] #%d 지연 분석 확인 실패: %v", id, err)
			return
		}
		if cur == nil || cur.ResolvedAt != nil {
			log.Printf("[incidents] #%d %s 내 복구 — 분석 생략", id, analysisDelay)
			return
		}
		s.enrich(id, serviceKey, siteKey, downStatus, tag, startedAt)
	})
}

// ErrNotFound is returned by Reanalyze for an unknown incident id.
var ErrNotFound = errors.New("incident not found")

// Reanalyze re-runs enrichment + AI analysis for one incident, synchronously.
// Used by the admin endpoint to retry a failed analysis (or to verify the
// pipeline). Returns the resulting verdict string.
func (s *Service) Reanalyze(ctx context.Context, id int64) (string, error) {
	if !s.store.Enabled() {
		return "", errors.New("incidents disabled (no DATABASE_URL)")
	}
	in, err := s.store.Get(ctx, id)
	if err != nil {
		return "", err
	}
	if in == nil {
		return "", ErrNotFound
	}
	tag := in.ContextTag
	if tag == "" {
		tag = academic.ContextTag(in.StartedAt)
	}
	s.enrich(id, in.ServiceKey, in.SiteKey, in.DownStatus, tag, in.StartedAt)

	after, err := s.store.Get(ctx, id)
	if err != nil || after == nil {
		return "", err
	}
	return after.Verdict, nil
}

// OnRecovered closes the most recent open incident for serviceKey.
func (s *Service) OnRecovered(ctx context.Context, serviceKey string, resolvedAt time.Time) {
	if !s.store.Enabled() {
		return
	}
	if err := s.store.Resolve(ctx, serviceKey, resolvedAt); err != nil {
		log.Printf("[incidents] %s resolve 실패: %v", serviceKey, err)
		return
	}
	log.Printf("[incidents] %s 복구 기록", serviceKey)
}

func (s *Service) enrich(id int64, serviceKey, siteKey, downStatus, tag string, startedAt time.Time) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	siteName := apitext.SiteName(siteKey)
	summary := buildSummary(siteName, downStatus, tag, startedAt)

	vec, err := embed.Embed(ctx, summary)
	if err != nil {
		log.Printf("[incidents] #%d 임베딩 실패(계속 진행): %v", id, err)
	}
	if err := s.store.SaveEnrichment(ctx, id, summary, vec); err != nil {
		log.Printf("[incidents] #%d enrichment 저장 실패: %v", id, err)
	}

	stats, err := s.store.Stats(ctx, serviceKey, startedAt)
	if err != nil {
		log.Printf("[incidents] #%d 통계 조회 실패: %v", id, err)
		return
	}

	verdict, err := incidentai.Analyze(ctx, incidentai.Input{
		SiteName:          siteName,
		DownStatus:        downStatus,
		StartedAt:         startedAt,
		ContextTag:        tag,
		OngoingMinutes:    int(time.Since(startedAt).Minutes()),
		HistoryCount:      stats.Count,
		HistoryResolved:   stats.ResolvedCount,
		MedianMinutes:     stats.MedianMinutes,
		MinMinutes:        stats.MinMinutes,
		MaxMinutes:        stats.MaxMinutes,
		SameHourCount:     stats.SameHourCount,
		SameHourMedian:    stats.SameHourMedian,
		SameWeekdayCount:  stats.SameWeekdayCount,
		SameContextCount:  stats.SameContextCount,
		SameContextMedian: stats.SameContextMedian,
		Flapping24hCount:  stats.Flapping24hCount,
	})
	if err != nil {
		log.Printf("[incidents] #%d AI 분석 실패: %v", id, err)
		return
	}

	if err := s.store.SaveVerdict(ctx, id, verdict.Verdict, verdict.Confidence,
		verdict.ETA, verdict.Reasoning, incidentai.Model, time.Now()); err != nil {
		log.Printf("[incidents] #%d verdict 저장 실패: %v", id, err)
		return
	}
	log.Printf("[incidents] #%d 분석 완료: %s (%.2f)", id, verdict.Verdict, verdict.Confidence)
}

// buildSummary is the natural-language line that gets embedded. Kept terse
// and consistently shaped so future semantic search over these has a
// stable vocabulary.
func buildSummary(siteName, downStatus, tag string, startedAt time.Time) string {
	weekday := [...]string{"일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"}[startedAt.Weekday()]
	symptom := "응답 없음"
	if downStatus == "error" {
		symptom = "오류 응답"
	}
	return fmt.Sprintf("%s, %s, %s %02d시 발생, %s, %s",
		startedAt.Format("2006-01-02"), siteName, weekday, startedAt.Hour(), tag, symptom)
}
