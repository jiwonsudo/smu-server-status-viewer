// Package httpapi builds the HTTP handler for the status API: routing,
// middleware (CORS + per-IP rate limiting), and the JSON response helpers
// shared by every handler. cmd/server wires the dependencies and calls New.
package httpapi

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/clickstore"
	"smu-server-status-viewer/backend/internal/incidents"
	"smu-server-status-viewer/backend/internal/incidentstore"
	"smu-server-status-viewer/backend/internal/ratelimit"
	"smu-server-status-viewer/backend/internal/services"
	"smu-server-status-viewer/backend/internal/statuscache"
)

// Config holds everything New needs. Callers set every field.
type Config struct {
	Cache         *statuscache.Cache
	ClickStore    *clickstore.Store
	IncidentStore *incidentstore.Store
	IncidentSvc   *incidents.Service
	AdminToken    string // empty disables the reanalyze route
}

// allowedOrigins is the set of frontend origins allowed to call this API
// with credentials.
var allowedOrigins = map[string]bool{
	"https://issmuok.site":                        true,
	"https://www.issmuok.site":                    true,
	"https://smu-server-status-viewer.vercel.app": true,
	"http://localhost:3000":                       true,
}

// statusRoutes maps each public "/status/<siteKey>" path to the status cache
// key it serves, derived from the service registry.
var statusRoutes = func() map[string]string {
	m := make(map[string]string, len(services.All))
	for _, s := range services.All {
		m["/status/"+s.SiteKey] = s.Key
	}
	return m
}()

// validSiteKeys is the set of site keys the frontend may record a click or
// request incident analysis for — the monitored services.
var validSiteKeys = func() map[string]bool {
	m := make(map[string]bool, len(services.Monitored))
	for _, s := range services.Monitored {
		m[s.SiteKey] = true
	}
	return m
}()

// New returns the fully wired HTTP handler.
func New(cfg Config) http.Handler {
	h := &handlers{cfg: cfg}

	mux := http.NewServeMux()
	// Hit by an external uptime pinger to keep the Render free-tier process
	// awake so the background refresh and transition alerts keep running.
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	for path, serviceKey := range statusRoutes {
		mux.HandleFunc(path, h.status(serviceKey))
	}
	mux.HandleFunc("GET /status/stream", h.statusStream)
	mux.HandleFunc("GET /api/incidents/{site}/analysis", h.incidentAnalysis)
	mux.HandleFunc("POST /api/incidents/{id}/reanalyze", h.incidentReanalyze)
	mux.HandleFunc("/contact", h.contact)
	mux.HandleFunc("POST /clicks/{site}", h.clickIncrement)
	mux.HandleFunc("GET /clicks", h.clickList)

	// /status/* and /api/incidents/* GET are cheap reads and are hit hardest
	// during a real outage (many students behind the campus NAT share one
	// public IP), so they get a much higher limit.
	limiter := ratelimit.New(time.Minute, 20)
	statusLimiter := ratelimit.New(time.Minute, 1200)
	return rateLimitMiddleware(limiter, statusLimiter, corsMiddleware(mux))
}

type handlers struct {
	cfg Config
}

// ---- JSON response helpers ----

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeMessage writes {"message": msg} with the given status.
func writeMessage(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"message": msg})
}

// ---- middleware ----

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// rateLimitMiddleware applies a per-IP rate limit: statusLimiter (generous)
// for the read-only status and incident-analysis GET routes, limiter for
// everything else. Client IP is read from X-Forwarded-For (Render sits in
// front as a reverse proxy).
func rateLimitMiddleware(limiter, statusLimiter *ratelimit.Limiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		activeLimiter := limiter
		if strings.HasPrefix(r.URL.Path, "/status/") ||
			(r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/incidents/")) {
			activeLimiter = statusLimiter
		}
		if !activeLimiter.Allow(clientIP(r)) {
			writeMessage(w, http.StatusTooManyRequests, apitext.RateLimited)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if first := strings.TrimSpace(strings.Split(xff, ",")[0]); first != "" {
			return first
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
