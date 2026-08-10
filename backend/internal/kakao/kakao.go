// Package kakao is a placeholder for KakaoTalk channel "친구 대상 메시지"
// (broadcast to channel friends) alerts.
//
// TODO: the KakaoTalk channel + message API application (Kakao Business
// review) hasn't been done yet. Once KAKAO_ADMIN_KEY and a sender key are
// issued, replace the no-op below with the real send call and register the
// secrets in GitHub Actions.
package kakao

import (
	"fmt"
	"os"
)

func SendStatusChangeKakao(serviceName, previousStatus, currentStatus string) {
	if os.Getenv("KAKAO_ADMIN_KEY") == "" {
		fmt.Println("[kakao] KAKAO_ADMIN_KEY가 없어 카카오톡 알림을 보내지 않습니다.")
		return
	}

	fmt.Println("[kakao] 카카오톡 채널 메시지 API가 아직 연동되지 않았습니다.")
}
