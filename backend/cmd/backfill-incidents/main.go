// Command backfill-incidents reconstructs the incident history from the
// git trail of backend/data/status.json (the bot commits the old GitHub
// Actions monitor left, ~2026-08-10 .. 2026-09-07). Run once.
//
//	go run ./cmd/backfill-incidents               # dry run: print what it would insert
//	go run ./cmd/backfill-incidents -commit       # insert into the incidents table
//	go run ./cmd/backfill-incidents -commit -analyze   # also run embedding + LLM verdict
//
// Idempotent: an incident with the same (service_key, started_at) is skipped.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"smu-server-status-viewer/backend/internal/academic"
	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/db"
	"smu-server-status-viewer/backend/internal/embed"
	"smu-server-status-viewer/backend/internal/incidentai"
	"smu-server-status-viewer/backend/internal/incidentstore"
	"smu-server-status-viewer/backend/internal/services"
)

const statusFile = "backend/data/status.json"

type snapshotEntry struct {
	Status        string `json:"status"`
	LastChangedAt string `json:"lastChangedAt"`
}

type reconstructed struct {
	serviceKey, siteKey string
	downStatus          string
	startedAt           time.Time
	resolvedAt          *time.Time
}

func main() {
	commit := flag.Bool("commit", false, "insert rows (default: dry run)")
	analyze := flag.Bool("analyze", false, "also generate embedding + LLM verdict for each")
	flag.Parse()

	_ = godotenv.Load()

	// git 경로가 저장소 루트 기준이므로 어디서 실행하든 루트로 이동한다.
	if root, err := exec.Command("git", "rev-parse", "--show-toplevel").Output(); err == nil {
		_ = os.Chdir(strings.TrimSpace(string(root)))
	}

	incidents := reconstruct()
	sort.Slice(incidents, func(i, j int) bool { return incidents[i].startedAt.Before(incidents[j].startedAt) })

	fmt.Printf("재구성된 incident: %d건\n\n", len(incidents))
	for _, in := range incidents {
		dur := "진행 중(미복구)"
		if in.resolvedAt != nil {
			dur = fmt.Sprintf("%d분", int(in.resolvedAt.Sub(in.startedAt).Minutes()))
		}
		fmt.Printf("  %-12s %s  %-8s  %s\n", in.serviceKey,
			in.startedAt.Local().Format("2006-01-02 15:04"), in.downStatus, dur)
	}

	if !*commit {
		fmt.Println("\n[dry run] -commit 을 붙이면 위 항목을 incidents 테이블에 넣습니다.")
		return
	}

	conn, err := db.Open(os.Getenv("DATABASE_URL"))
	if err != nil || conn == nil {
		fmt.Fprintf(os.Stderr, "DATABASE_URL 연결 실패: %v\n", err)
		os.Exit(1)
	}
	store, err := incidentstore.New(conn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "스키마 준비 실패: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()
	inserted, skipped := 0, 0
	for _, in := range incidents {
		if exists(ctx, conn, in.serviceKey, in.startedAt) {
			skipped++
			continue
		}
		tag := academic.ContextTag(in.startedAt)
		id, err := store.Open(ctx, in.serviceKey, in.siteKey, in.downStatus, tag, in.startedAt)
		if err != nil {
			fmt.Fprintf(os.Stderr, "  %s open 실패: %v\n", in.serviceKey, err)
			continue
		}
		if in.resolvedAt != nil {
			if err := store.Resolve(ctx, in.serviceKey, *in.resolvedAt); err != nil {
				fmt.Fprintf(os.Stderr, "  #%d resolve 실패: %v\n", id, err)
			}
		}
		inserted++

		if *analyze {
			if err := analyzeOne(ctx, store, id, in, tag); err != nil {
				fmt.Fprintf(os.Stderr, "  #%d 분석 실패: %v\n", id, err)
			} else {
				fmt.Printf("  #%d 분석 완료\n", id)
			}
		}
	}
	fmt.Printf("\n삽입 %d건, 스킵(이미 존재) %d건\n", inserted, skipped)
}

// reconstruct walks the git history of statusFile and pairs up each
// service's down→up transitions into incidents.
func reconstruct() []reconstructed {
	hashes := gitLines("log", "--reverse", "--format=%H", "--", statusFile)

	monitored := map[string]string{} // serviceKey -> siteKey
	for _, s := range services.Monitored {
		monitored[s.Key] = s.SiteKey
	}

	type openInc struct {
		downStatus string
		startedAt  time.Time
	}
	open := map[string]*openInc{}
	lastChanged := map[string]string{}
	var out []reconstructed

	for _, h := range hashes {
		blob, err := gitShow(h + ":" + statusFile)
		if err != nil {
			continue
		}
		var snap map[string]snapshotEntry
		if json.Unmarshal([]byte(blob), &snap) != nil {
			continue
		}
		for svcKey, siteKey := range monitored {
			e, ok := snap[svcKey]
			if !ok || e.LastChangedAt == "" || e.LastChangedAt == lastChanged[svcKey] {
				continue
			}
			lastChanged[svcKey] = e.LastChangedAt
			at, err := time.Parse(time.RFC3339, e.LastChangedAt)
			if err != nil {
				continue
			}
			down := e.Status == "error" || e.Status == "timeout"
			cur := open[svcKey]
			switch {
			case down && cur == nil:
				open[svcKey] = &openInc{downStatus: e.Status, startedAt: at}
			case !down && cur != nil:
				resolved := at
				out = append(out, reconstructed{
					serviceKey: svcKey, siteKey: siteKey,
					downStatus: cur.downStatus, startedAt: cur.startedAt, resolvedAt: &resolved,
				})
				delete(open, svcKey)
			}
		}
	}
	// any still-open at the end of history: record without resolved_at
	for svcKey, cur := range open {
		out = append(out, reconstructed{
			serviceKey: svcKey, siteKey: monitored[svcKey],
			downStatus: cur.downStatus, startedAt: cur.startedAt,
		})
	}
	return out
}

func analyzeOne(ctx context.Context, store *incidentstore.Store, id int64, in reconstructed, tag string) error {
	siteName := apitext.SiteName(in.siteKey)
	weekday := [...]string{"일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"}[in.startedAt.Weekday()]
	symptom := "응답 없음"
	if in.downStatus == "error" {
		symptom = "오류 응답"
	}
	summary := fmt.Sprintf("%s, %s, %s %02d시 발생, %s, %s",
		in.startedAt.Format("2006-01-02"), siteName, weekday, in.startedAt.Hour(), tag, symptom)

	vec, _ := embed.Embed(ctx, summary)
	_ = store.SaveEnrichment(ctx, id, summary, vec)

	stats, err := store.Stats(ctx, in.serviceKey, in.startedAt)
	if err != nil {
		return err
	}
	ongoing := 0
	if in.resolvedAt != nil {
		ongoing = int(in.resolvedAt.Sub(in.startedAt).Minutes())
	}
	v, err := incidentai.Analyze(ctx, incidentai.Input{
		SiteName: siteName, DownStatus: in.downStatus, StartedAt: in.startedAt,
		ContextTag: tag, OngoingMinutes: ongoing,
		HistoryCount: stats.Count, HistoryResolved: stats.ResolvedCount,
		MedianMinutes: stats.MedianMinutes, MinMinutes: stats.MinMinutes, MaxMinutes: stats.MaxMinutes,
		SameHourCount: stats.SameHourCount, SameHourMedian: stats.SameHourMedian,
		SameWeekdayCount: stats.SameWeekdayCount,
		SameContextCount: stats.SameContextCount, SameContextMedian: stats.SameContextMedian,
		Flapping24hCount: stats.Flapping24hCount,
	})
	if err != nil {
		return err
	}
	return store.SaveVerdict(ctx, id, v.Verdict, v.Confidence, v.ETA, v.Reasoning, incidentai.Model, time.Now())
}

func exists(ctx context.Context, conn *sql.DB, serviceKey string, startedAt time.Time) bool {
	var n int
	err := conn.QueryRowContext(ctx,
		`SELECT count(*) FROM incidents WHERE service_key = $1 AND started_at = $2`,
		serviceKey, startedAt).Scan(&n)
	return err == nil && n > 0
}

// --- git helpers ---

func gitLines(args ...string) []string {
	out, err := exec.Command("git", args...).Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "git %s 실패: %v\n", strings.Join(args, " "), err)
		os.Exit(1)
	}
	var lines []string
	for _, l := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if l != "" {
			lines = append(lines, l)
		}
	}
	return lines
}

func gitShow(ref string) (string, error) {
	out, err := exec.Command("git", "show", ref).Output()
	return string(out), err
}
