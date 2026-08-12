// Command checkstatus is a one-shot status check run by
// .github/workflows/monitor.yml on a schedule. It records status via
// statusstore and fires alerts only on real transitions (not on the
// first-ever recording of a service).
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
	"smu-server-status-viewer/backend/internal/db"
	"smu-server-status-viewer/backend/internal/kakaoauth"
	"smu-server-status-viewer/backend/internal/mailer"
	"smu-server-status-viewer/backend/internal/statuschecker"
	"smu-server-status-viewer/backend/internal/statusstore"
	"smu-server-status-viewer/backend/internal/userstore"
)

// monitoredService pairs the statuschecker service key with the shorter
// site key used for clicks/subscriptions (see backend/cmd/server's
// validSiteKeys and the frontend's SITE_INFOS).
type monitoredService struct {
	serviceKey string
	siteKey    string
}

var monitoredServices = []monitoredService{
	{"HOME", "home"},
	{"SAMMUL", "sammul"},
	{"ECAMPUS", "ecampus"},
	{"CAREER", "career"},
	{"CLOUD", "cloud"},
	{"DORM_SEOUL", "dorm-seoul"},
}

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	store := statusstore.New("data/status.json")

	conn, err := db.Open(os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "[check-status] DB 연결 실패, 카카오 알림 없이 계속합니다: %v\n", err)
		conn = nil
	}
	userStore, err := userstore.New(conn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[check-status] 사용자 스토어 준비 실패: %v\n", err)
		os.Exit(1)
	}

	anyChanged := false

	for _, svc := range monitoredServices {
		result := statuschecker.CheckServiceStatus(ctx, statuschecker.ServiceURL[svc.serviceKey])

		change, err := store.RecordStatus(svc.serviceKey, result.Status)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[check-status] %s 상태 기록 실패: %v\n", svc.serviceKey, err)
			os.Exit(1)
		}

		if change.Changed {
			anyChanged = true
			prevLabel := "(최초 기록)"
			if change.HadPrevious {
				prevLabel = change.PreviousStatus
			}
			fmt.Printf("[check-status] %s: %s -> %s\n", svc.serviceKey, prevLabel, result.Status)

			if change.HadPrevious {
				mailer.SendStatusChangeEmail(svc.serviceKey, change.PreviousStatus, result.Status)
				notifyKakaoSubscribers(ctx, userStore, svc.siteKey, svc.serviceKey, change.PreviousStatus, result.Status)
			}
		}
	}

	if !anyChanged {
		fmt.Println("[check-status] 변경 없음.")
	}
}

// notifyKakaoSubscribers sends a "나에게 보내기" KakaoTalk message to every
// user who subscribed to siteKey. Refreshes each user's access token first
// if it's expired or about to be.
func notifyKakaoSubscribers(ctx context.Context, userStore *userstore.Store, siteKey, serviceKey, previousStatus, currentStatus string) {
	if !userStore.Enabled() {
		return
	}

	subscribers, err := userStore.SubscribersForSite(ctx, siteKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[kakao] %s 구독자 조회 실패: %v\n", siteKey, err)
		return
	}
	if len(subscribers) == 0 {
		return
	}

	statusLabel := "복구됨"
	if currentStatus != "ok" {
		statusLabel = "다운됨"
	}
	text := fmt.Sprintf("[SMU 서버상태] %s: %s -> %s (%s)", serviceKey, previousStatus, currentStatus, statusLabel)
	linkURL := "https://issmuok.site"

	for _, user := range subscribers {
		accessToken := user.AccessToken

		if time.Now().After(user.ExpiresAt.Add(-time.Minute)) {
			refreshed, err := kakaoauth.RefreshAccessToken(ctx, user.RefreshToken)
			if err != nil {
				fmt.Fprintf(os.Stderr, "[kakao] 유저 %d 토큰 갱신 실패: %v\n", user.KakaoID, err)
				continue
			}
			if err := userStore.UpdateTokens(ctx, user.KakaoID, refreshed.AccessToken, refreshed.RefreshToken, refreshed.ExpiresAt); err != nil {
				fmt.Fprintf(os.Stderr, "[kakao] 유저 %d 토큰 저장 실패: %v\n", user.KakaoID, err)
			}
			accessToken = refreshed.AccessToken
		}

		if err := kakaoauth.SendToMe(ctx, accessToken, text, linkURL); err != nil {
			fmt.Fprintf(os.Stderr, "[kakao] 유저 %d 발송 실패: %v\n", user.KakaoID, err)
		}
	}
}
