package httpapi

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"smu-server-status-viewer/backend/internal/incidentstore"
)

// incidentAnalysisResponse feeds the detail modal's outage-history section.
// The LLM never runs here — this only reads what the state monitor stored.
// AnalysisPending is true while the verdict for an ongoing outage is still
// being computed.
type incidentAnalysisResponse struct {
	HasData         bool                           `json:"hasData"`
	AnalysisPending bool                           `json:"analysisPending"`
	Incident        *incidentstore.Incident        `json:"incident,omitempty"`
	History         *incidentstore.Stats           `json:"history,omitempty"`
	Recent          []incidentstore.RecentIncident `json:"recent,omitempty"`
	Summary         *incidentstore.Summary         `json:"summary,omitempty"`
}

func (h *handlers) incidentAnalysis(w http.ResponseWriter, r *http.Request) {
	site := r.PathValue("site")
	if !validSiteKeys[site] {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	store := h.cfg.IncidentStore
	latest, err := store.Latest(r.Context(), site)
	if err != nil {
		log.Printf("[incidents] %s 분석 조회 실패: %v", site, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp := incidentAnalysisResponse{}
	if summary, err := store.GetSummary(r.Context(), site); err == nil && summary != nil {
		resp.Summary = summary
	}

	if latest == nil {
		// No outages recorded — still a valid answer when a summary exists
		// ("rock solid since monitoring began").
		resp.HasData = resp.Summary != nil
		writeJSON(w, http.StatusOK, resp)
		return
	}

	// Empty verdict + recent start = still analyzing; empty verdict + old
	// start = analysis failed or no key, so drop pending and let the
	// frontend skip the verdict card.
	resp.HasData = true
	resp.AnalysisPending = latest.Verdict == "" && time.Since(latest.StartedAt) < 10*time.Minute
	resp.Incident = latest
	if stats, err := store.Stats(r.Context(), latest.ServiceKey, time.Now()); err == nil {
		resp.History = &stats
	}
	if recent, err := store.Recent(r.Context(), site, 5); err == nil {
		resp.Recent = recent
	}
	writeJSON(w, http.StatusOK, resp)
}

// incidentReanalyze re-runs the AI analysis for one incident. Blocked like a
// 404 when ADMIN_TOKEN is unset.
func (h *handlers) incidentReanalyze(w http.ResponseWriter, r *http.Request) {
	if h.cfg.AdminToken == "" || r.Header.Get("X-Admin-Token") != h.cfg.AdminToken {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	verdict, err := h.cfg.IncidentSvc.Reanalyze(r.Context(), id)
	if err != nil {
		log.Printf("[incidents] #%d 재분석 실패: %v", id, err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"verdict": verdict})
}
