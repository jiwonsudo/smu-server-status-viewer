// Package incidents orchestrates the outage history + AI analysis feature:
// it turns a confirmed status transition into a durable incident row, then —
// off the hot path — computes the summary, its embedding, the historical
// stats, and the LLM verdict, and writes them back.
//
// Everything degrades quietly: no DB → no incidents; no OPENAI_API_KEY → no
// embedding and no verdict.
package incidents

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"smu-server-status-viewer/backend/internal/academic"
	"smu-server-status-viewer/backend/internal/embed"
	"smu-server-status-viewer/backend/internal/incidentai"
	"smu-server-status-viewer/backend/internal/incidentstore"
	"smu-server-status-viewer/backend/internal/servicehealth"
	"smu-server-status-viewer/backend/internal/services"
	"smu-server-status-viewer/backend/internal/statuschecker"
)

// analysisDelay is how long an outage must persist before it's worth an
// embedding + LLM call. Shorter blips still get an incident row, but no
// verdict.
const analysisDelay = 90 * time.Second

// reanalyzeCooldown throttles per-service AI verdicts: while a service is
// flapping we don't burn a call (and a token) on every bounce.
const reanalyzeCooldown = 30 * time.Minute

// summaryMaxAge forces a blurb refresh even when the inputs hash is unchanged
// (so "관측 N일째" and day-granular ages don't go stale).
const summaryMaxAge = 24 * time.Hour

// dailyBlurbBudget smooths blurb LLM calls across a process-day (in-memory).
// The hard ceiling is the monthly*Budget values below, counted in the DB.
const dailyBlurbBudget = 50

// Monthly LLM call ceilings, enforced via incidentstore.ConsumeAIBudget (DB
// counters, so a restart loop can't reset them). Sized so the worst-case
// monthly OpenAI spend stays under ~$1: gpt-4o-mini calls ≈ $0.0004 each
// (700 verdict + 1200 blurb ≈ $0.76), embeddings ≈ $0.02 total.
const (
	monthlyVerdictBudget = 700
	monthlyBlurbBudget   = 1200
	monthlyEmbedBudget   = 8000
)

// StatusReader is the slice of statuscache.Cache the summary refresher needs.
type StatusReader interface {
	Snapshot() map[string]statuschecker.Result
}

type Service struct {
	store  *incidentstore.Store
	status StatusReader

	mu         sync.Mutex
	blurbDay   string
	blurbCalls int
}

func New(store *incidentstore.Store, status StatusReader) *Service {
	return &Service{store: store, status: status}
}

// OnDown records the start of an outage and schedules async enrichment +
// analysis. serviceKey is e.g. "ECAMPUS", siteKey "ecampus", downStatus the
// raw statuschecker status ("error" | "timeout").
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

	// After analysisDelay: if the service recovered it was a blip — skip
	// analysis. Otherwise enrich off the hot path. A server restart during
	// the wait loses the timer; the admin reanalyze endpoint covers that.
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

// Reanalyze re-runs enrichment + AI analysis for one incident synchronously.
// Returns the resulting verdict string.
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

// enrich computes the summary + embedding + stats + verdict for an incident
// and writes them back.
func (s *Service) enrich(id int64, serviceKey, siteKey, downStatus, tag string, startedAt time.Time) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	siteName := services.DisplayName(siteKey)
	summary := BuildSummary(siteName, downStatus, tag, startedAt)
	// Save the text line now; the embedding (a paid call) is attached later,
	// only after the cheap guards have cleared.
	if err := s.store.SaveEnrichment(ctx, id, summary, nil); err != nil {
		log.Printf("[incidents] #%d enrichment 저장 실패: %v", id, err)
	}

	stats, err := s.store.Stats(ctx, serviceKey, startedAt)
	if err != nil {
		log.Printf("[incidents] #%d 통계 조회 실패: %v", id, err)
		return
	}

	// Flapping guard: a service bouncing up/down repeatedly gets one grouped
	// note instead of a fresh LLM call per bounce.
	if stats.Flapping24hCount >= 4 {
		reason := fmt.Sprintf("최근 24시간 내 이 서비스 접속 오류 %d회 — 반복(플래핑) 중이라 개별 분석은 생략했어요.", stats.Flapping24hCount)
		if err := s.store.SaveVerdict(ctx, id, "판단보류", 0, "", reason, "rule:flapping", time.Now()); err != nil {
			log.Printf("[incidents] #%d 플래핑 verdict 저장 실패: %v", id, err)
		}
		return
	}
	if last, _ := s.store.LastVerdictAt(ctx, serviceKey, id); last != nil && time.Since(*last) < reanalyzeCooldown {
		log.Printf("[incidents] #%d 최근 %s 내 동일 서비스 분석됨 — LLM 생략", id, reanalyzeCooldown)
		return
	}

	if !incidentai.Enabled() {
		return
	}

	// Embedding (paid) — within the monthly ceiling only.
	if ok, _ := s.store.ConsumeAIBudget(ctx, "embed", monthlyEmbedBudget); ok {
		if vec, err := embed.Embed(ctx, summary); err != nil {
			log.Printf("[incidents] #%d 임베딩 실패(계속 진행): %v", id, err)
		} else if len(vec) > 0 {
			if err := s.store.SaveEnrichment(ctx, id, summary, vec); err != nil {
				log.Printf("[incidents] #%d 임베딩 저장 실패: %v", id, err)
			}
		}
	}

	if ok, _ := s.store.ConsumeAIBudget(ctx, "verdict", monthlyVerdictBudget); !ok {
		log.Printf("[incidents] #%d 이번 달 AI 판정 예산 소진 — LLM 생략", id)
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
		s.store.RefundAIBudget(ctx, "verdict") // call didn't land — don't count it
		return
	}

	if err := s.store.SaveVerdict(ctx, id, verdict.Verdict, verdict.Confidence,
		verdict.ETA, verdict.Reasoning, incidentai.Model, time.Now()); err != nil {
		log.Printf("[incidents] #%d verdict 저장 실패: %v", id, err)
		return
	}
	log.Printf("[incidents] #%d 분석 완료: %s (%.2f)", id, verdict.Verdict, verdict.Confidence)
}

// BuildSummary is the natural-language line that gets embedded. Kept terse
// and consistently shaped so future semantic search has a stable vocabulary.
func BuildSummary(siteName, downStatus, tag string, startedAt time.Time) string {
	weekday := [...]string{"일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"}[startedAt.Weekday()]
	symptom := "응답 없음"
	if downStatus == "error" {
		symptom = "오류 응답"
	}
	return fmt.Sprintf("%s, %s, %s %02d시 발생, %s, %s",
		startedAt.Format("2006-01-02"), siteName, weekday, startedAt.Hour(), tag, symptom)
}

// --- 평상시 안정성 요약 (service stability summary) ---

// RefreshAllSummaries recomputes the cached scorecard for every monitored
// service. Called on a timer from cmd/server. Errors are logged, not fatal.
func (s *Service) RefreshAllSummaries(ctx context.Context) {
	if !s.store.Enabled() {
		return
	}
	for _, svc := range services.Monitored {
		if err := s.RefreshSummary(ctx, svc.Key, svc.SiteKey); err != nil {
			log.Printf("[incidents] %s 요약 갱신 실패: %v", svc.SiteKey, err)
		}
	}
}

// RefreshSummary recomputes one service's scorecard and persists it. The LLM
// blurb is only regenerated when the coarse inputs changed, the stored blurb
// is stale, or there's none yet — and only within the daily budget.
func (s *Service) RefreshSummary(ctx context.Context, serviceKey, siteKey string) error {
	if !s.store.Enabled() {
		return nil
	}
	now := time.Now()

	stats, err := s.store.Stats(ctx, serviceKey, now)
	if err != nil {
		return err
	}

	prev, err := s.store.GetSummary(ctx, siteKey)
	if err != nil {
		return err
	}

	// first_seen_at: keep the earliest of (stored, oldest incident, now).
	firstSeen := now
	if stats.FirstIncidentAt != nil && stats.FirstIncidentAt.Before(firstSeen) {
		firstSeen = *stats.FirstIncidentAt
	}
	if prev != nil && prev.FirstSeenAt.Before(firstSeen) {
		firstSeen = prev.FirstSeenAt
	}

	var cur servicehealth.Current
	if s.status != nil {
		if r, ok := s.status.Snapshot()[serviceKey]; ok {
			cur.Status = r.Status
			if ms, isInt := r.ResponseTime.(int); isInt {
				cur.ResponseTimeMs = ms
			}
		}
	}

	sc := servicehealth.Build(stats, firstSeen, cur, now)
	scJSON, err := json.Marshal(sc)
	if err != nil {
		return err
	}
	hash := sc.InputsHash()

	out := incidentstore.Summary{
		SiteKey:     siteKey,
		FirstSeenAt: firstSeen,
		Scorecard:   scJSON,
		InputsHash:  hash,
		GeneratedAt: now,
	}
	if prev != nil {
		out.Blurb, out.BlurbModel, out.BlurbAt = prev.Blurb, prev.BlurbModel, prev.BlurbAt
	}

	stale := prev == nil || prev.Blurb == "" || prev.InputsHash != hash ||
		prev.BlurbAt == nil || now.Sub(*prev.BlurbAt) > summaryMaxAge
	if stale && incidentai.Enabled() && s.takeBlurbBudget(now) {
		monthlyOK, _ := s.store.ConsumeAIBudget(ctx, "blurb", monthlyBlurbBudget)
		if !monthlyOK {
			s.refundBlurbBudget()
			log.Printf("[incidents] %s 이번 달 AI 요약 예산 소진 — 스코어카드만 저장", siteKey)
			return s.store.SaveSummary(ctx, out)
		}
		blurb, err := incidentai.Summarize(ctx, incidentai.SummaryInput{
			SiteName:            services.DisplayName(siteKey),
			Purpose:             services.Purpose(siteKey),
			Level:               sc.Level,
			ObservedDays:        sc.ObservedDays,
			Incidents7d:         sc.Incidents7d,
			Incidents30d:        sc.Incidents30d,
			Uptime30dPercent:    pctOrNeg(sc.Uptime30d),
			LastIncidentDaysAgo: sc.LastIncidentDaysAgo,
			MedianRecoveryMin:   sc.MedianRecoveryMin,
			CurrentStatus:       sc.CurrentStatus,
			CurrentResponseMs:   sc.CurrentResponseMs,
		})
		switch {
		case errors.Is(err, incidentai.ErrDisabled):
			s.refundBlurbBudget()
			s.store.RefundAIBudget(ctx, "blurb")
		case err != nil:
			log.Printf("[incidents] %s 요약 blurb 생성 실패(스코어카드는 저장): %v", siteKey, err)
			s.store.RefundAIBudget(ctx, "blurb") // call didn't land
		default:
			bAt := now
			out.Blurb, out.BlurbModel, out.BlurbAt = blurb, incidentai.Model, &bAt
		}
	}

	return s.store.SaveSummary(ctx, out)
}

// takeBlurbBudget returns true if a blurb LLM call is allowed right now,
// consuming one unit of the per-day budget.
func (s *Service) takeBlurbBudget(now time.Time) bool {
	day := now.Format("2006-01-02")
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.blurbDay != day {
		s.blurbDay, s.blurbCalls = day, 0
	}
	if s.blurbCalls >= dailyBlurbBudget {
		return false
	}
	s.blurbCalls++
	return true
}

func (s *Service) refundBlurbBudget() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.blurbCalls > 0 {
		s.blurbCalls--
	}
}

func pctOrNeg(u float64) float64 {
	if u < 0 {
		return -1
	}
	return u * 100
}
