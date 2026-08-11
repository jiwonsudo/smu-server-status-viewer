package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"smu-server-status-viewer/backend/internal/clickstore"
	"smu-server-status-viewer/backend/internal/db"
	"smu-server-status-viewer/backend/internal/kakaoauth"
	"smu-server-status-viewer/backend/internal/mailer"
	"smu-server-status-viewer/backend/internal/ratelimit"
	"smu-server-status-viewer/backend/internal/statuschecker"
	"smu-server-status-viewer/backend/internal/userstore"
)

// allowedOrigins lists every frontend origin allowed to call this API with
// credentials (cookies). Includes the old Vercel domain during the move to
// the custom issmuok.site domain, plus localhost for local dev.
var allowedOrigins = map[string]bool{
	"https://issmuok.site":                        true,
	"https://www.issmuok.site":                    true,
	"https://smu-server-status-viewer.vercel.app": true,
	"http://localhost:3000":                       true,
}

const sessionCookieName = "smu_session"
const oauthStateCookieName = "smu_oauth_state"
const sessionTTL = 30 * 24 * time.Hour

// statusRoutes maps each public status-check path to the ServiceURL key it checks.
var statusRoutes = map[string]string{
	"/status/home":       "HOME",
	"/status/notice":     "NOTICE",
	"/status/sammul":     "SAMMUL",
	"/status/ecampus":    "ECAMPUS",
	"/status/career":     "CAREER",
	"/status/cloud":      "CLOUD",
	"/status/dorm-seoul": "DORM_SEOUL",
	"/status/lib-seoul":  "LIB_SEOUL",
}

// validSiteKeys is the set of site keys the frontend is allowed to record a
// click for or subscribe to — matches statusRoutes' path suffixes
// (frontend's SITE_INFOS).
var validSiteKeys = map[string]bool{
	"home": true, "ecampus": true, "sammul": true, "career": true,
	"cloud": true, "dorm-seoul": true, "lib-seoul": true,
}

func main() {
	_ = godotenv.Load() // .env가 없어도(배포 환경) 조용히 넘어감

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	limiter := ratelimit.New(time.Minute, 20)

	conn, err := db.Open(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Printf("[db] DATABASE_URL이 설정됐지만 연결에 실패해서 DB 없이 계속합니다: %v", err)
		conn = nil
	}

	clickStore, err := clickstore.New(conn)
	if err != nil {
		log.Fatalf("[clicks] 스키마 준비 실패: %v", err)
	}
	if !clickStore.Enabled() {
		log.Println("[clicks] DATABASE_URL이 없어 조회수를 기록하지 않습니다.")
	}

	userStore, err := userstore.New(conn)
	if err != nil {
		log.Fatalf("[auth] 스키마 준비 실패: %v", err)
	}
	if !userStore.Enabled() {
		log.Println("[auth] DATABASE_URL이 없어 카카오 로그인을 쓸 수 없습니다.")
	}
	if !kakaoauth.Configured() {
		log.Println("[auth] KAKAO_CLIENT_ID/KAKAO_REDIRECT_URI가 없어 카카오 로그인이 비활성화됩니다.")
	}

	mux := http.NewServeMux()
	for path, serviceKey := range statusRoutes {
		mux.HandleFunc(path, statusHandler(statuschecker.ServiceURL[serviceKey]))
	}
	mux.HandleFunc("/contact", contactHandler)
	mux.HandleFunc("POST /clicks/{site}", clickIncrementHandler(clickStore))
	mux.HandleFunc("GET /clicks", clickListHandler(clickStore))

	mux.HandleFunc("GET /auth/kakao/login", kakaoLoginHandler)
	mux.HandleFunc("GET /auth/kakao/callback", kakaoCallbackHandler(userStore))
	mux.HandleFunc("GET /auth/me", authMeHandler(userStore))
	mux.HandleFunc("POST /auth/logout", logoutHandler(userStore))

	mux.HandleFunc("GET /subscriptions", subscriptionsListHandler(userStore))
	mux.HandleFunc("PUT /subscriptions/{site}", subscribeHandler(userStore))
	mux.HandleFunc("DELETE /subscriptions/{site}", unsubscribeHandler(userStore))

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

func clickIncrementHandler(store *clickstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		site := r.PathValue("site")
		if !validSiteKeys[site] {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if err := store.Increment(r.Context(), site); err != nil {
			log.Printf("[clicks] %s 증가 실패: %v", site, err)
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func clickListHandler(store *clickstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		counts, err := store.All(r.Context())
		if err != nil {
			log.Printf("[clicks] 목록 조회 실패: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(counts)
	}
}

// ---- 카카오 로그인 ----

func cookieDomain() string { return os.Getenv("COOKIE_DOMAIN") } // e.g. ".issmuok.site" in prod, empty locally

func cookiesSecure() bool { return cookieDomain() != "" }

func frontendURL() string {
	if u := os.Getenv("FRONTEND_URL"); u != "" {
		return u
	}
	return "http://localhost:3000"
}

func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Domain:   cookieDomain(),
		Expires:  time.Now().Add(sessionTTL),
		HttpOnly: true,
		Secure:   cookiesSecure(),
		SameSite: http.SameSiteLaxMode,
	})
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Domain:   cookieDomain(),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cookiesSecure(),
		SameSite: http.SameSiteLaxMode,
	})
}

func randomState() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func kakaoLoginHandler(w http.ResponseWriter, r *http.Request) {
	if !kakaoauth.Configured() {
		http.Error(w, "카카오 로그인이 아직 설정되지 않았습니다.", http.StatusServiceUnavailable)
		return
	}

	state, err := randomState()
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		Secure:   cookiesSecure(),
		SameSite: http.SameSiteLaxMode,
	})

	http.Redirect(w, r, kakaoauth.AuthorizeURL(state), http.StatusFound)
}

func kakaoCallbackHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stateCookie, err := r.Cookie(oauthStateCookieName)
		if err != nil || stateCookie.Value == "" || stateCookie.Value != r.URL.Query().Get("state") {
			http.Error(w, "잘못된 로그인 요청입니다.", http.StatusBadRequest)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name: oauthStateCookieName, Value: "", Path: "/", MaxAge: -1,
		})

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "인가 코드가 없습니다.", http.StatusBadRequest)
			return
		}

		tokens, err := kakaoauth.ExchangeCode(r.Context(), code)
		if err != nil {
			log.Printf("[auth] 토큰 교환 실패: %v", err)
			http.Error(w, "로그인 처리 중 오류가 발생했습니다.", http.StatusBadGateway)
			return
		}

		profile, err := kakaoauth.FetchProfile(r.Context(), tokens.AccessToken)
		if err != nil {
			log.Printf("[auth] 프로필 조회 실패: %v", err)
			http.Error(w, "로그인 처리 중 오류가 발생했습니다.", http.StatusBadGateway)
			return
		}

		if err := userStore.UpsertUser(r.Context(), userstore.User{
			KakaoID:      profile.ID,
			Nickname:     profile.Nickname,
			AccessToken:  tokens.AccessToken,
			RefreshToken: tokens.RefreshToken,
			ExpiresAt:    tokens.ExpiresAt,
		}); err != nil {
			log.Printf("[auth] 사용자 저장 실패: %v", err)
			http.Error(w, "로그인 처리 중 오류가 발생했습니다.", http.StatusInternalServerError)
			return
		}

		sessionToken, err := userStore.CreateSession(r.Context(), profile.ID, sessionTTL)
		if err != nil {
			log.Printf("[auth] 세션 생성 실패: %v", err)
			http.Error(w, "로그인 처리 중 오류가 발생했습니다.", http.StatusInternalServerError)
			return
		}

		setSessionCookie(w, sessionToken)
		http.Redirect(w, r, frontendURL(), http.StatusFound)
	}
}

func currentUser(r *http.Request, userStore *userstore.Store) (userstore.User, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return userstore.User{}, false
	}
	user, ok, err := userStore.SessionUser(r.Context(), cookie.Value)
	if err != nil {
		log.Printf("[auth] 세션 조회 실패: %v", err)
		return userstore.User{}, false
	}
	return user, ok
}

func authMeHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := currentUser(r, userStore)
		if !ok {
			json.NewEncoder(w).Encode(map[string]any{
				"loggedIn":        false,
				"kakaoConfigured": kakaoauth.Configured(),
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"loggedIn":        true,
			"nickname":        user.Nickname,
			"kakaoConfigured": kakaoauth.Configured(),
		})
	}
}

func logoutHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if cookie, err := r.Cookie(sessionCookieName); err == nil {
			_ = userStore.DeleteSession(r.Context(), cookie.Value)
		}
		clearSessionCookie(w)
		w.WriteHeader(http.StatusNoContent)
	}
}

// ---- 사이트별 알림 구독 ----

func subscriptionsListHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := currentUser(r, userStore)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		keys, err := userStore.Subscriptions(r.Context(), user.KakaoID)
		if err != nil {
			log.Printf("[subscriptions] 조회 실패: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(keys)
	}
}

func subscribeHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := currentUser(r, userStore)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		site := r.PathValue("site")
		if !validSiteKeys[site] {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if err := userStore.Subscribe(r.Context(), user.KakaoID, site); err != nil {
			log.Printf("[subscriptions] %s 구독 실패: %v", site, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func unsubscribeHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := currentUser(r, userStore)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		site := r.PathValue("site")
		if err := userStore.Unsubscribe(r.Context(), user.KakaoID, site); err != nil {
			log.Printf("[subscriptions] %s 구독 해제 실패: %v", site, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// ---- 문의/건의사항 ----

const maxContactMessageBytes = 1 << 12 // 4KB, plenty for a suggestion form

type contactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
	// Website is a honeypot field: real users never see or fill it (hidden
	// in the form via CSS), so a non-empty value means a bot filled every
	// field it could find.
	Website string `json:"website"`
}

func contactHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req contactRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxContactMessageBytes)).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "요청 형식이 올바르지 않습니다."})
		return
	}

	if req.Website != "" {
		// Silently pretend success to a bot so it doesn't learn to adapt.
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "전송되었습니다."})
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "문의 내용을 입력해주세요."})
		return
	}

	mailer.SendContactMessage(strings.TrimSpace(req.Name), strings.TrimSpace(req.Email), req.Message)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "전송되었습니다."})
}

// ---- 미들웨어 ----

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
