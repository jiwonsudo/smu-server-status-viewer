// Package apitext collects every user-facing string the backend produces —
// HTTP error messages, status-check labels, and Kakao/email notification
// text. This is the backend's equivalent of the frontend's lib/text.js:
// same goal (change wording without touching logic), just a separate file
// because Go and JS can't share one.
package apitext

import "fmt"

// ---- 사이트 표시 이름 (카카오톡 알림 문구용) ----
// 프론트 lib/text.js의 sites 섹션과 같은 이름으로 맞춰둔다.
var SiteNames = map[string]string{
	"home":       "상명대학교 홈페이지",
	"ecampus":    "상명대학교 이캠퍼스",
	"sammul":     "상명대학교 샘물(통합정보시스템)",
	"career":     "SM Challenge (진로·취업 포트폴리오)",
	"cloud":      "Office 365 (클라우드메일)",
	"dorm-seoul": "학생생활관",
}

func SiteName(siteKey string) string {
	if name, ok := SiteNames[siteKey]; ok {
		return name
	}
	return siteKey
}

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
	KakaoNotConfigured    = "카카오 로그인이 아직 설정되지 않았습니다."
	InvalidLoginRequest   = "잘못된 로그인 요청입니다."
	MissingAuthCode       = "인가 코드가 없습니다."
	LoginProcessingError  = "로그인 처리 중 오류가 발생했습니다."
	InvalidRequestFormat  = "요청 형식이 올바르지 않습니다."
	ContactMessageSent    = "전송되었습니다."
	ContactMessageMissing = "문의 내용을 입력해주세요."
	RateLimited           = "이 IP에서 너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요."
)

// ---- 구독 on/off 카카오톡 확인 메시지 ----
func SubscribeConfirm(siteName string) string {
	return fmt.Sprintf("[%s] 알림 설정 완료\n서버가 다운되거나 복구되면 카카오톡으로 알려드릴게요.", siteName)
}

func UnsubscribeConfirm(siteName string) string {
	return fmt.Sprintf("[%s] 알림 해제 완료\n더 이상 이 서비스의 상태 변경 알림이 가지 않아요.", siteName)
}

// ---- checkstatus: 상태 변화 감지 시 카카오톡/이메일 알림 ----
const (
	StatusRecoveredLabel = "복구됨"
	StatusDownLabel      = "다운됨"
	FirstRecordLabel     = "(최초 기록)"
	UnknownStatusLabel   = "알수없음"
)

func StatusChangeLabel(currentStatus string) string {
	if currentStatus == "ok" {
		return StatusRecoveredLabel
	}
	return StatusDownLabel
}

func StatusChangeKakaoMessage(serviceKey, previousStatus, currentStatus string) string {
	return fmt.Sprintf("[SMU 서버상태] %s: %s -> %s (%s)", serviceKey, previousStatus, currentStatus, StatusChangeLabel(currentStatus))
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

// ---- kakaoauth ----
const (
	FallbackNickname  = "카카오 사용자"    // 닉네임 동의를 안 했거나 빈 값일 때
	StatusCheckButton = "상태 확인하러 가기" // 카카오톡 메시지에 붙는 버튼 라벨
)

func ContactEmailSubject(displayName string) string {
	return fmt.Sprintf("[SMU 서버상태] 문의/건의사항 - %s", displayName)
}

func ContactEmailBody(displayName, senderEmail, timestamp, message string) string {
	return fmt.Sprintf(
		"보낸 사람: %s\n답장 받을 이메일: %s\n시각: %s\n\n%s",
		displayName, senderEmail, timestamp, message,
	)
}
