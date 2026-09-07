// Package statemonitor watches the status cache for real, sustained status
// transitions and fires the alerts (email + Discord) that used to live in
// cmd/checkstatus. Moving this into the always-on server means transitions
// are caught on the cache's own 15s clock instead of a flaky 5-minute
// GitHub Actions cron.
//
// Debounce: because 15s is short enough to catch a momentary blip, a change
// isn't acted on until the new status holds for `Confirmations` consecutive
// checks (default 2 = ~30s). A service's very first observation is taken as
// the baseline silently. This confirmed/pending split is also the first
// filter for the "일시적 vs 지속적" incident analysis added later — a blip
// that can't clear 30s never becomes an incident.
package statemonitor

import (
	"context"
	"log"
	"time"

	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/discordnotify"
	"smu-server-status-viewer/backend/internal/mailer"
	"smu-server-status-viewer/backend/internal/services"
	"smu-server-status-viewer/backend/internal/servicestate"
	"smu-server-status-viewer/backend/internal/statuschecker"
)

// defaultConfirmations is how many consecutive checks a new status must
// hold before statemonitor treats it as a real transition.
const defaultConfirmations = 2

// Cache is the subset of statuscache.Cache statemonitor needs.
type Cache interface {
	Snapshot() map[string]statuschecker.Result
	Subscribe() (<-chan struct{}, func())
}

// Transition describes a confirmed status change. Passed to OnTransition so
// later features (incident recording + AI analysis) can hook in without
// touching this package.
type Transition struct {
	ServiceKey     string    // "ECAMPUS"
	SiteKey        string    // "ecampus"
	PreviousStatus string    // raw: ok | error | timeout
	CurrentStatus  string    // raw
	PreviousSince  time.Time // when PreviousStatus began (zero if unknown)
	At             time.Time // when this transition was confirmed
}

type Config struct {
	Cache         Cache
	State         *servicestate.Store
	Confirmations int                               // 0 → defaultConfirmations
	OnTransition  func(context.Context, Transition) // optional
}

type confirmedStatus struct {
	status    string
	changedAt time.Time
	known     bool
}

type pendingChange struct {
	status string
	count  int
}

type Monitor struct {
	cache         Cache
	state         *servicestate.Store
	confirmations int
	onTransition  func(context.Context, Transition)

	// dispatch delivers a confirmed transition (alerts + OnTransition).
	// A seam so tests can observe transitions synchronously; production
	// runs it in a goroutine so a slow SMTP/Discord call can't stall the
	// evaluate loop.
	dispatch func(services.Service, Transition)

	// Only the evaluate goroutine touches these — no mutex needed.
	confirmed map[string]confirmedStatus
	pending   map[string]pendingChange
}

func New(cfg Config) *Monitor {
	n := cfg.Confirmations
	if n <= 0 {
		n = defaultConfirmations
	}
	m := &Monitor{
		cache:         cfg.Cache,
		state:         cfg.State,
		confirmations: n,
		onTransition:  cfg.OnTransition,
		confirmed:     map[string]confirmedStatus{},
		pending:       map[string]pendingChange{},
	}
	m.dispatch = func(svc services.Service, t Transition) { go m.handleTransition(svc, t) }
	return m
}

// Start seeds the baseline from the store and then evaluates the cache on
// every refresh signal until ctx is cancelled.
func (m *Monitor) Start(ctx context.Context) {
	seed, err := m.state.Load(ctx)
	if err != nil {
		log.Printf("[statemonitor] 상태 로드 실패, 빈 기준선으로 시작: %v", err)
		seed = map[string]servicestate.Entry{}
	}
	for key, e := range seed {
		m.confirmed[key] = confirmedStatus{status: e.Status, changedAt: e.ChangedAt, known: true}
	}

	updates, cancel := m.cache.Subscribe()
	go func() {
		defer cancel()
		m.evaluate(ctx, m.cache.Snapshot()) // catch whatever's already cached
		for {
			select {
			case <-ctx.Done():
				return
			case _, ok := <-updates:
				if !ok {
					return
				}
				m.evaluate(ctx, m.cache.Snapshot())
			}
		}
	}()
}

func (m *Monitor) evaluate(ctx context.Context, snapshot map[string]statuschecker.Result) {
	for _, svc := range services.Monitored {
		res, ok := snapshot[svc.Key]
		if !ok || res.Status == "" {
			continue
		}
		raw := res.Status
		cur := m.confirmed[svc.Key]

		if cur.known && cur.status == raw {
			delete(m.pending, svc.Key)
			continue
		}

		p := m.pending[svc.Key]
		if p.status != raw {
			p = pendingChange{status: raw}
		}
		p.count++
		m.pending[svc.Key] = p

		// A known service must hold the new status for N checks; an
		// unknown one (no baseline yet) is seeded on first sight.
		if cur.known && p.count < m.confirmations {
			continue
		}

		now := time.Now()
		delete(m.pending, svc.Key)
		m.confirmed[svc.Key] = confirmedStatus{status: raw, changedAt: now, known: true}
		if err := m.saveState(ctx, svc.Key, raw, now); err != nil {
			log.Printf("[statemonitor] %s 상태 저장 실패: %v", svc.Key, err)
		}

		if cur.known && healthy(cur.status) != healthy(raw) {
			t := Transition{
				ServiceKey:     svc.Key,
				SiteKey:        svc.SiteKey,
				PreviousStatus: cur.status,
				CurrentStatus:  raw,
				PreviousSince:  cur.changedAt,
				At:             now,
			}
			log.Printf("[statemonitor] %s: %s -> %s (확정)", svc.Key, cur.status, raw)
			m.dispatch(svc, t)
		}
	}
}

func (m *Monitor) saveState(ctx context.Context, key, status string, at time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return m.state.Save(ctx, key, servicestate.Entry{Status: status, ChangedAt: at})
}

func (m *Monitor) handleTransition(svc services.Service, t Transition) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	mailer.SendStatusChangeEmail(apitext.SiteName(svc.SiteKey), t.PreviousStatus, t.CurrentStatus)

	if discordnotify.Configured(svc.SiteKey) {
		msg := apitext.StatusChangeDiscordMessage(svc.SiteKey, t.PreviousStatus, t.CurrentStatus)
		if err := discordnotify.Send(ctx, svc.SiteKey, msg); err != nil {
			log.Printf("[statemonitor] %s discord 알림 실패: %v", svc.SiteKey, err)
		}
	}

	if m.onTransition != nil {
		m.onTransition(ctx, t)
	}
}

// healthy collapses statuschecker's raw status into up/down. Transitions
// that don't flip this (e.g. error → timeout, both down) update the
// recorded status but don't re-alert.
func healthy(status string) bool { return status == "ok" }
