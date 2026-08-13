// Command checkstatus is a one-shot status check run by
// .github/workflows/monitor.yml on a schedule. It records status via
// statusstore and fires alerts only on real transitions (not on the
// first-ever recording of a service).
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/discordnotify"
	"smu-server-status-viewer/backend/internal/mailer"
	"smu-server-status-viewer/backend/internal/statuschecker"
	"smu-server-status-viewer/backend/internal/statusstore"
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
	{"CLOUD", "cloud"},
	{"DORM_SEOUL", "dorm-seoul"},
	{"SUGANG", "sugang"},
}

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	store := statusstore.New("data/status.json")

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
			prevLabel := apitext.FirstRecordLabel
			if change.HadPrevious {
				prevLabel = change.PreviousStatus
			}
			fmt.Printf("[check-status] %s: %s -> %s\n", svc.serviceKey, prevLabel, result.Status)

			if change.HadPrevious {
				mailer.SendStatusChangeEmail(svc.serviceKey, change.PreviousStatus, result.Status)
				notifyDiscord(ctx, svc.siteKey, change.PreviousStatus, result.Status)
			}
		}
	}

	if !anyChanged {
		fmt.Println("[check-status] 변경 없음.")
	}
}

// notifyDiscord posts a status-change alert to the shared Discord status
// webhook. Unlike the old per-user Kakao "나에게 보내기" flow this replaces,
// there's no subscriber list to look up — everyone in the Discord channel
// gets it, and they mute channels they don't care about on their own.
func notifyDiscord(ctx context.Context, siteKey, previousStatus, currentStatus string) {
	if !discordnotify.Configured(siteKey) {
		return
	}

	message := apitext.StatusChangeDiscordMessage(siteKey, previousStatus, currentStatus)
	if err := discordnotify.Send(ctx, siteKey, message); err != nil {
		fmt.Fprintf(os.Stderr, "[discord] %s 알림 발송 실패: %v\n", siteKey, err)
		return
	}
	fmt.Printf("[discord] %s 알림 발송 성공\n", siteKey)
}
