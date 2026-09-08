package servicehealth

import (
	"testing"
	"time"

	"smu-server-status-viewer/backend/internal/incidentstore"
)

func TestBuildLevels(t *testing.T) {
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	old := now.Add(-40 * 24 * time.Hour) // 40일 관측

	cases := []struct {
		name string
		st   incidentstore.Stats
		cur  Current
		want string
	}{
		{
			name: "no history, long observation -> solid",
			st:   incidentstore.Stats{},
			cur:  Current{Status: "ok", ResponseTimeMs: 300},
			want: LevelSolid,
		},
		{
			name: "one short outage last month -> mostly-stable",
			st:   incidentstore.Stats{Incidents30d: 1, DownMinutes30d: 4, MedianMinutes: 4},
			cur:  Current{Status: "ok", ResponseTimeMs: 300},
			want: LevelMostlyStable,
		},
		{
			name: "three outages this week -> shaky",
			st:   incidentstore.Stats{Incidents7d: 3, Incidents30d: 3, DownMinutes7d: 20, DownMinutes30d: 20},
			cur:  Current{Status: "ok", ResponseTimeMs: 300},
			want: LevelShaky,
		},
		{
			name: "currently down -> down regardless of history",
			st:   incidentstore.Stats{},
			cur:  Current{Status: "timeout"},
			want: LevelDown,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			sc := Build(c.st, old, c.cur, now)
			if sc.Level != c.want {
				t.Fatalf("level = %q, want %q (%+v)", sc.Level, c.want, sc)
			}
		})
	}
}

func TestUptimeWindowShrinksWhenYoung(t *testing.T) {
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	firstSeen := now.Add(-2 * 24 * time.Hour) // 2일만 관측

	// 30분 다운, 2일 관측 -> 30d uptime은 30일이 아니라 2일 기준.
	sc := Build(incidentstore.Stats{DownMinutes30d: 30}, firstSeen, Current{Status: "ok", ResponseTimeMs: 100}, now)
	if sc.ObservedDays != 2 {
		t.Fatalf("observedDays = %d, want 2", sc.ObservedDays)
	}
	want := 1 - 30.0/(2*24*60)
	if diff := sc.Uptime30d - want; diff > 0.001 || diff < -0.001 {
		t.Fatalf("uptime30d = %v, want ~%v", sc.Uptime30d, want)
	}
}

func TestInputsHashIgnoresResponseTime(t *testing.T) {
	now := time.Now()
	old := now.Add(-40 * 24 * time.Hour)
	a := Build(incidentstore.Stats{}, old, Current{Status: "ok", ResponseTimeMs: 120}, now)
	b := Build(incidentstore.Stats{}, old, Current{Status: "ok", ResponseTimeMs: 640}, now)
	if a.InputsHash() != b.InputsHash() {
		t.Fatalf("hash changed on response-time-only diff: %s vs %s", a.InputsHash(), b.InputsHash())
	}
}
