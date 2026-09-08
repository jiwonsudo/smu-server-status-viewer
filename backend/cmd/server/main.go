package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"smu-server-status-viewer/backend/internal/clickstore"
	"smu-server-status-viewer/backend/internal/db"
	"smu-server-status-viewer/backend/internal/httpapi"
	"smu-server-status-viewer/backend/internal/incidents"
	"smu-server-status-viewer/backend/internal/incidentstore"
	"smu-server-status-viewer/backend/internal/services"
	"smu-server-status-viewer/backend/internal/servicestate"
	"smu-server-status-viewer/backend/internal/statemonitor"
	"smu-server-status-viewer/backend/internal/statuscache"
)

// statusRefreshInterval is the statusCache background refresh period, and
// the basis for the "time until next update" value sent over SSE.
const statusRefreshInterval = 15 * time.Second

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	// Background refresh every interval so outbound traffic to SMU stays
	// constant regardless of visitor count; /status/* only reads the cache.
	statusCache := statuscache.New(statusRefreshInterval, services.URLByKey())

	conn, err := db.Open(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Printf("[db] DATABASE_URL이 설정됐지만 연결에 실패해서 DB 없이 계속합니다: %v", err)
		conn = nil
	}

	clickStore, err := clickstore.New(conn)
	if err != nil {
		log.Fatalf("[clicks] 스키마 준비 실패: %v", err)
	}
	if !clickStore.Enabled() {
		log.Println("[clicks] DATABASE_URL이 없어 조회수를 기록하지 않습니다.")
	}

	serviceState, err := servicestate.New(conn)
	if err != nil {
		log.Fatalf("[statemonitor] 스키마 준비 실패: %v", err)
	}
	if !serviceState.Enabled() {
		log.Println("[statemonitor] DATABASE_URL이 없어 상태 기준선을 메모리로만 유지합니다(재시작 시 초기화).")
	}

	incidentStore, err := incidentstore.New(conn)
	if err != nil {
		log.Fatalf("[incidents] 스키마 준비 실패: %v", err)
	}
	if !incidentStore.Enabled() {
		log.Println("[incidents] DATABASE_URL이 없어 장애 이력/AI 분석을 비활성화합니다.")
	}
	incidentSvc := incidents.New(incidentStore)

	monitor := statemonitor.New(statemonitor.Config{
		Cache: statusCache,
		State: serviceState,
		OnTransition: func(ctx context.Context, t statemonitor.Transition) {
			if t.CurrentStatus == "ok" {
				incidentSvc.OnRecovered(ctx, t.ServiceKey, t.At)
				return
			}
			incidentSvc.OnDown(ctx, t.ServiceKey, t.SiteKey, t.CurrentStatus, t.At)
		},
	})
	monitor.Start(context.Background())

	handler := httpapi.New(httpapi.Config{
		Cache:         statusCache,
		ClickStore:    clickStore,
		IncidentStore: incidentStore,
		IncidentSvc:   incidentSvc,
		AdminToken:    os.Getenv("ADMIN_TOKEN"),
	})

	log.Printf("Server running at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
