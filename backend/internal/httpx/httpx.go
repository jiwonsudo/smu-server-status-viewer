// Package httpx is a tiny helper for the "POST some JSON to a third-party
// API and check the status" pattern used by mailer, embed, incidentai and
// discordnotify.
package httpx

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// PostJSON marshals body to JSON and POSTs it to url with the given headers
// and timeout. It returns the raw response body. A response status >= 300 is
// returned as an error that includes that body.
func PostJSON(ctx context.Context, url string, headers map[string]string, timeout time.Duration, body any) ([]byte, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return raw, fmt.Errorf("POST %s failed (HTTP %d): %s", url, resp.StatusCode, string(raw))
	}
	return raw, nil
}
