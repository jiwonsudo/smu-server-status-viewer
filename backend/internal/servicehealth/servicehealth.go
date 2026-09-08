// Package servicehealth turns the raw incident stats for one service into a
// deterministic "current stability" scorecard: uptime over rolling windows, a
// coarse level (solid / mostly-stable / shaky / down), and the few numbers the
// UI and the optional LLM phrasing both read. No I/O, no LLM — pure math over
// what incidentstore.Stats already computed.
package servicehealth

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"time"

	"smu-server-status-viewer/backend/internal/incidentstore"
)

// Level is the coarse stability bucket the UI styles and words on.
const (
	LevelSolid        = "solid"         // no recent trouble
	LevelMostlyStable = "mostly-stable" // rare, short blips
	LevelShaky        = "shaky"         // frequent or long outages lately
	LevelDown         = "down"          // currently in an outage
)

// Current is the live status at the moment the scorecard is built.
type Current struct {
	Status         string // statuschecker raw: "ok" | "error" | "timeout" | ""
	ResponseTimeMs int    // 0 if unknown / timed out
}

func (c Current) down() bool { return c.Status == "error" || c.Status == "timeout" }

// SlowResponseMs mirrors the frontend's SLOW_RESPONSE_THRESHOLD_MS.
const SlowResponseMs = 800

// Scorecard is the deterministic summary. Uptime fields are 0..1, or -1 when
// the window isn't fully observed yet (monitoring younger than the window).
type Scorecard struct {
	ObservedDays        int     `json:"observedDays"`
	Incidents7d         int     `json:"incidents7d"`
	Incidents30d        int     `json:"incidents30d"`
	Uptime7d            float64 `json:"uptime7d"`
	Uptime30d           float64 `json:"uptime30d"`
	LastIncidentDaysAgo int     `json:"lastIncidentDaysAgo"` // -1 if never
	MedianRecoveryMin   int     `json:"medianRecoveryMin"`
	CurrentStatus       string  `json:"currentStatus"` // "ok" | "slow" | "down" | "unknown"
	CurrentResponseMs   int     `json:"currentResponseMs"`
	Level               string  `json:"level"`
}

// Build computes the scorecard. firstSeenAt is when monitoring for this
// service began (used to shrink the uptime window when monitoring is young).
func Build(st incidentstore.Stats, firstSeenAt time.Time, cur Current, now time.Time) Scorecard {
	sc := Scorecard{
		Incidents7d:         st.Incidents7d,
		Incidents30d:        st.Incidents30d,
		MedianRecoveryMin:   st.MedianMinutes,
		CurrentResponseMs:   cur.ResponseTimeMs,
		LastIncidentDaysAgo: -1,
	}

	observed := now.Sub(firstSeenAt)
	if observed < 0 {
		observed = 0
	}
	sc.ObservedDays = int(observed.Hours() / 24)

	sc.Uptime7d = uptime(st.DownMinutes7d, observed, 7*24*time.Hour)
	sc.Uptime30d = uptime(st.DownMinutes30d, observed, 30*24*time.Hour)

	if st.LastIncidentAt != nil {
		sc.LastIncidentDaysAgo = int(now.Sub(*st.LastIncidentAt).Hours() / 24)
	}

	switch {
	case cur.down():
		sc.CurrentStatus = "down"
	case cur.Status == "ok" && cur.ResponseTimeMs > SlowResponseMs:
		sc.CurrentStatus = "slow"
	case cur.Status == "ok":
		sc.CurrentStatus = "ok"
	default:
		sc.CurrentStatus = "unknown"
	}

	sc.Level = level(sc)
	return sc
}

// uptime returns the fraction of the (possibly shrunk) window the service was
// up, or -1 when there's essentially no observation window yet.
func uptime(downMin int, observed, window time.Duration) float64 {
	w := window
	if observed < w {
		w = observed
	}
	wm := w.Minutes()
	if wm < 60 { // less than an hour observed — not a meaningful number
		return -1
	}
	u := 1 - float64(downMin)/wm
	return math.Max(0, math.Min(1, math.Round(u*10000)/10000))
}

func level(sc Scorecard) string {
	if sc.CurrentStatus == "down" {
		return LevelDown
	}
	shaky := sc.Incidents7d >= 3 ||
		(sc.Uptime7d >= 0 && sc.Uptime7d < 0.98) ||
		(sc.Uptime30d >= 0 && sc.Uptime30d < 0.95)
	if shaky {
		return LevelShaky
	}
	if sc.Incidents30d >= 1 || (sc.Uptime30d >= 0 && sc.Uptime30d < 0.999) {
		return LevelMostlyStable
	}
	return LevelSolid
}

// InputsHash is a digest of the fields that should trigger LLM re-phrasing
// when they change. Deliberately coarse: current response time and sub-day
// age drift are excluded so the blurb isn't regenerated every tick.
func (sc Scorecard) InputsHash() string {
	key := fmt.Sprintf("%s|%d|%d|%d|%d|%d|%d",
		sc.Level, sc.Incidents7d, sc.Incidents30d,
		int(sc.Uptime7d*1000), int(sc.Uptime30d*1000),
		sc.LastIncidentDaysAgo, sc.MedianRecoveryMin)
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:8])
}
