package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/mailer"
	"smu-server-status-viewer/backend/internal/profanity"
)

// ---- 문의/건의사항 ----

const maxContactMessageBytes = 1 << 12 // 4KB

type contactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
	// Website is a honeypot: hidden in the form, so a non-empty value means a bot.
	Website string `json:"website"`
}

func (h *handlers) contact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req contactRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxContactMessageBytes)).Decode(&req); err != nil {
		writeMessage(w, http.StatusBadRequest, apitext.InvalidRequestFormat)
		return
	}

	if req.Website != "" {
		// Fake success to a bot so it doesn't learn to adapt.
		writeMessage(w, http.StatusOK, apitext.ContactMessageSent)
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		writeMessage(w, http.StatusBadRequest, apitext.ContactMessageMissing)
		return
	}

	name := strings.TrimSpace(req.Name)
	hits := profanity.Find(req.Message + "\n" + name)
	if len(hits) > 0 {
		log.Printf("[contact] 욕설 의심 제출 (IP %s): %v", clientIP(r), hits)
	}
	mailer.SendContactMessage(name, strings.TrimSpace(req.Email), req.Message, clientIP(r), hits)

	writeMessage(w, http.StatusOK, apitext.ContactMessageSent)
}

// ---- 조회수 ----

func (h *handlers) clickIncrement(w http.ResponseWriter, r *http.Request) {
	site := r.PathValue("site")
	if !validSiteKeys[site] {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err := h.cfg.ClickStore.Increment(r.Context(), site); err != nil {
		log.Printf("[clicks] %s 증가 실패: %v", site, err)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *handlers) clickList(w http.ResponseWriter, r *http.Request) {
	counts, err := h.cfg.ClickStore.All(r.Context())
	if err != nil {
		log.Printf("[clicks] 목록 조회 실패: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, counts)
}
