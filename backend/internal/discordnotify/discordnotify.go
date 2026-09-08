// Package discordnotify posts status-change alerts to per-site Discord
// channels via incoming webhooks (the webhook URL itself is the secret).
// Each monitored site gets its own channel so students can mute the ones
// they don't care about.
package discordnotify

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"smu-server-status-viewer/backend/internal/httpx"
)

// envVar returns the env var name holding siteKey's webhook URL, e.g.
// "ecampus" -> "DISCORD_WEBHOOK_ECAMPUS".
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
	_, err := httpx.PostJSON(ctx, webhookURL, nil, 10*time.Second, map[string]string{"content": content})
	return err
}
