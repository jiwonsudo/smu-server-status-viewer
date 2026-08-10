// Package mailer sends a status-change alert email via SMTP.
// Mirrors the old lib/mailer.js: silently skips (with a warning log) when
// SMTP credentials or a recipient aren't configured, rather than failing.
package mailer

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"gopkg.in/gomail.v2"
)

func SendStatusChangeEmail(serviceName, previousStatus, currentStatus string) {
	host := os.Getenv("SMTP_HOST")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	to := os.Getenv("ALERT_EMAIL_TO")

	if host == "" || user == "" || pass == "" || to == "" {
		fmt.Println("[mailer] SMTP 또는 수신 이메일 설정이 없어 알림 메일을 보내지 않습니다.")
		return
	}

	port := 587
	if p := os.Getenv("SMTP_PORT"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			port = parsed
		}
	}

	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = user
	}

	prev := previousStatus
	if prev == "" {
		prev = "알수없음"
	}

	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", fmt.Sprintf("[SMU 서버 상태] %s: %s -> %s", serviceName, prev, currentStatus))
	m.SetBody("text/plain", fmt.Sprintf(
		"%s 서비스 상태가 변경되었습니다.\n\n이전 상태: %s\n현재 상태: %s\n시각: %s",
		serviceName, prev, currentStatus, time.Now().Format("2006-01-02 15:04:05"),
	))

	d := gomail.NewDialer(host, port, user, pass)
	if err := d.DialAndSend(m); err != nil {
		fmt.Printf("[mailer] 알림 메일 발송 실패: %v\n", err)
	}
}
