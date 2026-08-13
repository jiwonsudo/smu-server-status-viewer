// Package mailer sends emails via the Resend HTTP API (https://resend.com).
// Render's outbound network blocks the usual SMTP ports (25/465/587) — every
// attempt via gomail/SMTP failed with a TCP dial timeout — so this goes over
// plain HTTPS (443) instead, which isn't blocked. Mirrors the old behavior:
// silently skips (with a warning log) when the API key or recipient isn't
// configured, rather than failing the request that triggered it.
package mailer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"smu-server-status-viewer/backend/internal/apitext"
)

const resendURL = "https://api.resend.com/emails"

// defaultFrom is Resend's shared sending address, usable without verifying
// a domain first. Once a domain (e.g. issmuok.site) is verified in Resend,
// set RESEND_FROM to an address on it for better deliverability.
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

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, resendURL, bytes.NewReader(payloadJSON))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend API failed (HTTP %d): %s", resp.StatusCode, string(respBody))
	}
	return nil
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

// SendContactMessage forwards a visitor's 문의/건의사항 form submission.
// Reuses ALERT_EMAIL_TO since the same person (site owner) receives both
// status alerts and contact messages.
func SendContactMessage(name, senderEmail, message string) {
	to := os.Getenv("ALERT_EMAIL_TO")

	displayName := name
	if displayName == "" {
		displayName = apitext.AnonymousSender
	}

	subject := apitext.ContactEmailSubject(displayName)
	body := apitext.ContactEmailBody(displayName, orDash(senderEmail), time.Now().Format("2006-01-02 15:04:05"), message)

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
