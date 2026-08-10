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
	"smu-uptime/backend/internal/kakao"
	"smu-uptime/backend/internal/mailer"
	"smu-uptime/backend/internal/statuschecker"
	"smu-uptime/backend/internal/statusstore"
)

var monitoredServices = []string{"HOME", "SAMMUL", "ECAMPUS"}

func main() {
	_ = godotenv.Load()

	store := statusstore.New("data/status.json")
	ctx := context.Background()

	anyChanged := false

	for _, serviceName := range monitoredServices {
		result := statuschecker.CheckServiceStatus(ctx, statuschecker.ServiceURL[serviceName])

		change, err := store.RecordStatus(serviceName, result.Status)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[check-status] %s 상태 기록 실패: %v\n", serviceName, err)
			os.Exit(1)
		}

		if change.Changed {
			anyChanged = true
			prevLabel := "(최초 기록)"
			if change.HadPrevious {
				prevLabel = change.PreviousStatus
			}
			fmt.Printf("[check-status] %s: %s -> %s\n", serviceName, prevLabel, result.Status)

			if change.HadPrevious {
				mailer.SendStatusChangeEmail(serviceName, change.PreviousStatus, result.Status)
				kakao.SendStatusChangeKakao(serviceName, change.PreviousStatus, result.Status)
			}
		}
	}

	if !anyChanged {
		fmt.Println("[check-status] 변경 없음.")
	}
}
