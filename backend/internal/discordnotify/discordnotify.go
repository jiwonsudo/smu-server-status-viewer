// Package discordnotify posts status-change alerts to per-site Discord
// channels via incoming webhooks. Discord webhooks need no OAuth/account
// system on our side — the webhook URL itself is the secret, so this is a
// single POST, unlike Kakao's per-user token refresh + send loop it
// replaces. Each monitored site gets its own channel/webhook so students
// can mute the ones they don't care about instead of getting every alert.
package discordnotify

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// envVar returns the env var name holding siteKey's webhook URL, e.g.
// "ecampus" -> "DISCORD_WEBHOOK_ECAMPUS", "dorm-seoul" -> "DISCORD_WEBHOOK_DORM_SEOUL".
func envVar(siteKey string) string {
	return "DISCORD_WEBHOOK_" + strings.ToUpper(strings.ReplaceAll(siteKey, "-", "_"))
}

// Configured reports whether siteKey has a webhook URL set.
func Configured(siteKey string) bool {
	return os.Getenv(envVar(siteKey)) != ""
}

// Send posts content as a plain message to siteKey's configured Discord webhook.
func Send(ctx context.Context, siteKey, content string) error {
	webhookURL := os.Getenv(envVar(siteKey))
	if webhookURL == "" {
		return fmt.Errorf("%s이 설정되지 않았습니다", envVar(siteKey))
	}

	payload, err := json.Marshal(map[string]string{"content": content})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord webhook failed (HTTP %d): %s", resp.StatusCode, string(body))
	}
	return nil
}
