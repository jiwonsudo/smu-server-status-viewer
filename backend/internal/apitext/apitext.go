// Package apitext collects every user-facing string the backend produces —
// HTTP error messages, status-check labels, and Discord/email notification
// text — so wording can change without touching logic.
package apitext

import (
	"fmt"
	"strings"

	"smu-server-status-viewer/backend/internal/services"
)

// ---- statuschecker: 사이트 하나를 점검한 결과 메시지 ----
const (
	StatusOK               = "정상 서비스"
	StatusConnectionFailed = "서비스 접속 실패"
	StatusTimeout          = "매우 느림(비정상)"
)

func StatusHTTPError(code int) string {
	return fmt.Sprintf("서비스 비정상: %d", code)
}

// ---- HTTP API 응답 메시지 ----
const (
	StatusCheckPending    = "아직 첫 점검 중입니다"
	InvalidRequestFormat  = "요청 형식이 올바르지 않습니다."
	ContactMessageSent    = "전송되었습니다."
	ContactMessageMissing = "문의 내용을 입력해주세요."
	RateLimited           = "이 IP에서 너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요."
)

// ---- statemonitor: 상태 전환 확정 시 디스코드/이메일 알림 ----
const (
	StatusRecoveredLabel = "복구됨"
	StatusDownLabel      = "다운됨"
	UnknownStatusLabel   = "알수없음"
)

func StatusChangeLabel(currentStatus string) string {
	if currentStatus == "ok" {
		return StatusRecoveredLabel
	}
	return StatusDownLabel
}

// rawStatusLabels translates statuschecker's internal status values into
// Korean for display.
var rawStatusLabels = map[string]string{
	"ok":      "정상",
	"error":   "오류",
	"timeout": "응답없음",
}

func rawStatusLabel(status string) string {
	if label, ok := rawStatusLabels[status]; ok {
		return label
	}
	return UnknownStatusLabel
}

// StatusChangeDiscordMessage builds the text posted to a site's Discord
// webhook when its status transitions. siteKey is the short key (e.g.
// "ecampus"), not the statuschecker service key.
func StatusChangeDiscordMessage(siteKey, previousStatus, currentStatus string) string {
	return fmt.Sprintf(
		"[SMU 서버상태] %s: %s -> %s (%s)\nhttps://www.issmuok.site",
		services.DisplayName(siteKey), rawStatusLabel(previousStatus), rawStatusLabel(currentStatus), StatusChangeLabel(currentStatus),
	)
}

// ---- 이메일(상태 변화 알림 / 문의) ----
func StatusChangeEmailSubject(serviceName, previousStatus, currentStatus string) string {
	return fmt.Sprintf("[SMU 서버 상태] %s: %s -> %s", serviceName, previousStatus, currentStatus)
}

func StatusChangeEmailBody(serviceName, previousStatus, currentStatus, timestamp string) string {
	return fmt.Sprintf(
		"%s 서비스 상태가 변경되었습니다.\n\n이전 상태: %s\n현재 상태: %s\n시각: %s",
		serviceName, previousStatus, currentStatus, timestamp,
	)
}

const AnonymousSender = "익명"
const NoEmailProvided = "(입력 안 함)"

func ContactEmailSubject(displayName string, flagged bool) string {
	if flagged {
		return fmt.Sprintf("[⚠️ 욕설 의심] [SMU 서버상태] 문의/건의사항 - %s", displayName)
	}
	return fmt.Sprintf("[SMU 서버상태] 문의/건의사항 - %s", displayName)
}

func ContactEmailBody(displayName, senderEmail, clientIP, timestamp, message string, profanityHits []string) string {
	if clientIP == "" {
		clientIP = "(확인 불가)"
	}
	var b strings.Builder
	fmt.Fprintf(&b, "보낸 사람: %s\n답장 받을 이메일: %s\n접속 IP: %s\n시각: %s\n",
		displayName, senderEmail, clientIP, timestamp)
	if len(profanityHits) > 0 {
		fmt.Fprintf(&b, "감지된 표현: %s\n", strings.Join(profanityHits, ", "))
	}
	fmt.Fprintf(&b, "\n%s", message)
	return b.String()
}
