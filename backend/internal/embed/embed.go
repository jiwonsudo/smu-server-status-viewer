// Package embed turns a short natural-language incident summary into a
// vector via the OpenAI embeddings API. If OPENAI_API_KEY isn't set, Embed
// is a no-op that returns (nil, nil).
package embed

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"smu-server-status-viewer/backend/internal/httpx"
)

const (
	apiURL = "https://api.openai.com/v1/embeddings"
	// 1536 dimensions.
	model = "text-embedding-3-small"
)

// Embed returns the embedding for text, or (nil, nil) when disabled.
func Embed(ctx context.Context, text string) ([]float32, error) {
	key := os.Getenv("OPENAI_API_KEY")
	if key == "" {
		return nil, nil
	}

	raw, err := httpx.PostJSON(ctx, apiURL,
		map[string]string{"Authorization": "Bearer " + key}, 15*time.Second,
		map[string]any{"model": model, "input": text})
	if err != nil {
		return nil, err
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
