// Package embed turns a short natural-language incident summary into a
// vector via the OpenAI embeddings API (Anthropic has no embeddings
// endpoint). Plain HTTPS POST, same shape as internal/mailer and
// internal/discordnotify. If OPENAI_API_KEY isn't set, Embed is a no-op
// that returns (nil, nil) — the incident is still recorded, just without
// an embedding.
package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const (
	apiURL = "https://api.openai.com/v1/embeddings"
	// model dimension is 1536; kept small + cheap ($0.02 / 1M tokens).
	model = "text-embedding-3-small"
)

// Embed returns the embedding for text, or (nil, nil) when disabled.
func Embed(ctx context.Context, text string) ([]float32, error) {
	key := os.Getenv("OPENAI_API_KEY")
	if key == "" {
		return nil, nil
	}

	body, err := json.Marshal(map[string]any{"model": model, "input": text})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("openai embeddings failed (HTTP %d): %s", resp.StatusCode, string(raw))
	}

	var parsed struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Data) == 0 {
		return nil, fmt.Errorf("openai embeddings returned no data")
	}
	return parsed.Data[0].Embedding, nil
}
