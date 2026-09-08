// Package mailer sends emails via the Resend HTTP API (https://resend.com)
// over plain HTTPS, since Render blocks the usual outbound SMTP ports.
// Silently skips (with a warning log) when the API key or recipient isn't
// configured.
package mailer

import (
	"context"
	"fmt"
	"os"
	"time"

	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/httpx"
)

const resendURL = "https://api.resend.com/emails"

// defaultFrom is Resend's shared sending address, usable without verifying a
// domain first. Set RESEND_FROM to an address on a verified domain for
// better deliverability.
const defaultFrom = "onboarding@resend.dev"

func sendEmail(to, subject, body string, replyTo string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" || to == "" {
		fmt.Println("[mailer] RESEND_API_KEY 또는 수신 이메일 설정이 없어 메일을 보내지 않습니다.")
		return nil
	}

	from := os.Getenv("RESEND_FROM")
	if from == "" {
		from = defaultFrom
	}

	payload := map[string]any{
		"from":    from,
		"to":      []string{to},
		"subject": subject,
		"text":    body,
	}
	if replyTo != "" {
		payload["reply_to"] = replyTo
	}

	_, err := httpx.PostJSON(context.Background(), resendURL,
		map[string]string{"Authorization": "Bearer " + apiKey}, 10*time.Second, payload)
	return err
}

func SendStatusChangeEmail(serviceName, previousStatus, currentStatus string) {
	to := os.Getenv("ALERT_EMAIL_TO")

	prev := previousStatus
	if prev == "" {
		prev = apitext.UnknownStatusLabel
	}

	subject := apitext.StatusChangeEmailSubject(serviceName, prev, currentStatus)
	body := apitext.StatusChangeEmailBody(serviceName, prev, currentStatus, time.Now().Format("2006-01-02 15:04:05"))

	if err := sendEmail(to, subject, body, ""); err != nil {
		fmt.Printf("[mailer] 알림 메일 발송 실패: %v\n", err)
	}
}

// SendContactMessage forwards a visitor's contact form submission to
// ALERT_EMAIL_TO. clientIP + profanityHits go in the body for abuse triage;
// a non-empty profanityHits also flags the subject.
func SendContactMessage(name, senderEmail, message, clientIP string, profanityHits []string) {
	to := os.Getenv("ALERT_EMAIL_TO")

	displayName := name
	if displayName == "" {
		displayName = apitext.AnonymousSender
	}

	subject := apitext.ContactEmailSubject(displayName, len(profanityHits) > 0)
	body := apitext.ContactEmailBody(
		displayName, orDash(senderEmail), clientIP,
		time.Now().Format("2006-01-02 15:04:05"), message, profanityHits,
	)

	if err := sendEmail(to, subject, body, senderEmail); err != nil {
		fmt.Printf("[mailer] 문의 메일 발송 실패: %v\n", err)
	}
}

func orDash(s string) string {
	if s == "" {
		return apitext.NoEmailProvided
	}
	return s
}
