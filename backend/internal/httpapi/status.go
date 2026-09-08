package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/statuschecker"
)

// status serves one site's cached check result.
func (h *handlers) status(serviceKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result, ok := h.cfg.Cache.Get(serviceKey)
		if !ok {
			writeMessage(w, http.StatusServiceUnavailable, apitext.StatusCheckPending)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}
}

// statusStreamPayload is one SSE "data:" event's JSON body. Sites is keyed
// by the same path the frontend uses for statusData (e.g. "/status/home").
type statusStreamPayload struct {
	Sites        map[string]statuschecker.Result `json:"sites"`
	NextUpdateAt time.Time                       `json:"nextUpdateAt"`
}

func (h *handlers) buildStreamPayload() statusStreamPayload {
	snapshot := h.cfg.Cache.Snapshot()
	sites := make(map[string]statuschecker.Result, len(statusRoutes))
	for path, serviceKey := range statusRoutes {
		if result, ok := snapshot[serviceKey]; ok {
			sites[path] = result
		}
	}
	return statusStreamPayload{Sites: sites, NextUpdateAt: h.cfg.Cache.NextUpdateAt()}
}

// statusStream pushes the full status snapshot over Server-Sent Events every
// time the cache finishes a refresh, so the frontend never polls on its own
// clock and drifts out of sync.
func (h *handlers) statusStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	writeEvent := func() bool {
		payload, err := json.Marshal(h.buildStreamPayload())
		if err != nil {
			return false
		}
		if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
			return false
		}
		flusher.Flush()
		return true
	}

	if !writeEvent() { // send the current state immediately on connect
		return
	}

	updates, cancel := h.cfg.Cache.Subscribe()
	defer cancel()

	for {
		select {
		case <-r.Context().Done(): // client disconnected
			return
		case _, ok := <-updates:
			if !ok || !writeEvent() {
				return
			}
		}
	}
}
