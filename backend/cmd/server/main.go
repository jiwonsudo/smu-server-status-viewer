package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"smu-uptime/backend/internal/ratelimit"
	"smu-uptime/backend/internal/statuschecker"
)

const allowedOrigin = "https://smu-server-status-viewer.vercel.app"

func main() {
	_ = godotenv.Load() // .env가 없어도(배포 환경) 조용히 넘어감

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	limiter := ratelimit.New(time.Minute, 20)

	mux := http.NewServeMux()
	mux.HandleFunc("/status/home", statusHandler(statuschecker.ServiceURL["HOME"]))
	mux.HandleFunc("/status/notice", statusHandler(statuschecker.ServiceURL["NOTICE"]))
	mux.HandleFunc("/status/sammul", statusHandler(statuschecker.ServiceURL["SAMMUL"]))
	mux.HandleFunc("/status/ecampus", statusHandler(statuschecker.ServiceURL["ECAMPUS"]))

	handler := rateLimitMiddleware(limiter, corsMiddleware(mux))

	log.Printf("Server running at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func statusHandler(url string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result := statuschecker.CheckServiceStatus(r.Context(), url)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// rateLimitMiddleware mirrors the old express-rate-limit config: 20
// requests per minute per client IP. Client IP is read from
// X-Forwarded-For since Render sits in front as a reverse proxy
// (equivalent of Express's `app.set('trust proxy', 1)`).
func rateLimitMiddleware(limiter *ratelimit.Limiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !limiter.Allow(clientIP(r)) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"message": "Too many requests from this IP, please try again a minute later.",
			})
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
