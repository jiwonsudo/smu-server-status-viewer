package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"smu-server-status-viewer/backend/internal/apitext"
	"smu-server-status-viewer/backend/internal/clickstore"
	"smu-server-status-viewer/backend/internal/db"
	"smu-server-status-viewer/backend/internal/kakaoauth"
	"smu-server-status-viewer/backend/internal/mailer"
	"smu-server-status-viewer/backend/internal/ratelimit"
	"smu-server-status-viewer/backend/internal/statuscache"
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

// statusRefreshInterval은 statusCache 백그라운드 갱신 주기이자, SSE로
// 프론트에 알려주는 "다음 업데이트까지" 계산의 기준이 되는 값이다.
const statusRefreshInterval = 15 * time.Second

// statusRoutes maps each public status-check path to the ServiceURL key it checks.
var statusRoutes = map[string]string{
	"/status/home":       "HOME",
	"/status/notice":     "NOTICE",
	"/status/sammul":     "SAMMUL",
	"/status/ecampus":    "ECAMPUS",
	"/status/career":     "CAREER",
	"/status/cloud":      "CLOUD",
	"/status/dorm-seoul": "DORM_SEOUL",
}

// validSiteKeys is the set of site keys the frontend is allowed to record a
// click for or subscribe to — matches statusRoutes' path suffixes
// (frontend's SITE_INFOS).
var validSiteKeys = map[string]bool{
	"home": true, "ecampus": true, "sammul": true, "career": true,
	"cloud": true, "dorm-seoul": true,
}

func main() {
	_ = godotenv.Load() // .env가 없어도(배포 환경) 조용히 넘어감

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	limiter := ratelimit.New(time.Minute, 20)

	// /status/*는 이제 캐시를 읽기만 해서 비용이 거의 0이고, 방문자 수와
	// SMU 쪽 트래픽이 완전히 분리됐다(아래 statusCache 참고). 그런데 주
	// 이용자가 캠퍼스 와이파이(NAT) 뒤에 있어서 여러 학생이 같은 공인
	// IP를 공유하는 경우가 흔하다 — 실제 장애로 다 같이 몰려서 새로고침
	// 하는, 가장 막으면 안 되는 순간에 20/분에 걸릴 수 있다는 뜻이다.
	// 그래서 이 라우트만 사실상 무제한에 가깝게 훨씬 넉넉하게 둔다.
	// 이메일 발송/DB 쓰기가 있는 나머지 라우트는 기존 20/분을 유지한다.
	statusLimiter := ratelimit.New(time.Minute, 1200)

	// 요청이 올 때마다 SMU 사이트를 라이브로 찔러보면 방문자 수만큼
	// SMU 쪽 트래픽이 그대로 늘어난다. 대신 백그라운드에서 15초마다
	// 한 번만 전체 사이트를 확인해 캐시해두고, /status/* 요청은 그
	// 캐시를 즉시 읽기만 한다 — 방문자가 몇 명이든 SMU로 나가는 요청은
	// 항상 15초에 한 번, 6개로 고정된다.
	statusCache := statuscache.New(statusRefreshInterval, statuschecker.ServiceURL)

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
	// Render 무료 티어는 트래픽이 없으면 프로세스를 재운다 — 그러면 위
	// statusCache의 백그라운드 갱신도 같이 멈춘다. .github/workflows/
	// monitor.yml이 5분마다 이 경로를 찔러서(Render의 유휴 판정 기준인
	// 15분보다 훨씬 짧게) 서버가 계속 깨어있게 만든다.
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	for path, serviceKey := range statusRoutes {
		mux.HandleFunc(path, statusHandler(statusCache, serviceKey))
	}
	// 프론트가 자기 타이머로 폴링하면 백엔드의 15초 갱신 주기랑 자연히
	// 어긋나서(두 개의 독립된 시계) 표시되는 "N초 전" 값이 튀는 문제가
	// 생긴다. 대신 SSE로 캐시가 갱신되는 그 순간 값을 그대로 밀어준다 —
	// 시계가 백엔드 하나뿐이라 어긋날 일 자체가 없다.
	mux.HandleFunc("GET /status/stream", statusStreamHandler(statusCache))
	mux.HandleFunc("/contact", contactHandler)
	mux.HandleFunc("POST /clicks/{site}", clickIncrementHandler(clickStore))
	mux.HandleFunc("GET /clicks", clickListHandler(clickStore))

	mux.HandleFunc("GET /auth/kakao/login", kakaoLoginHandler)
	mux.HandleFunc("GET /auth/kakao/callback", kakaoCallbackHandler(userStore))
	mux.HandleFunc("GET /auth/me", authMeHandler(userStore))
	mux.HandleFunc("POST /auth/logout", logoutHandler(userStore))
	mux.HandleFunc("POST /auth/withdraw", withdrawHandler(userStore))

	mux.HandleFunc("GET /subscriptions", subscriptionsListHandler(userStore))
	mux.HandleFunc("PUT /subscriptions/{site}", subscribeHandler(userStore))
	mux.HandleFunc("DELETE /subscriptions/{site}", unsubscribeHandler(userStore))

	handler := rateLimitMiddleware(limiter, statusLimiter, corsMiddleware(mux))

	log.Printf("Server running at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func statusHandler(cache *statuscache.Cache, serviceKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		result, ok := cache.Get(serviceKey)
		if !ok {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"message": apitext.StatusCheckPending})
			return
		}
		json.NewEncoder(w).Encode(result)
	}
}

// statusStreamPayload is one SSE "data:" event's JSON body. Sites is keyed
// by the same path the frontend already uses for statusData (e.g.
// "/status/home"), so the client can drop this straight into that map.
type statusStreamPayload struct {
	Sites        map[string]statuschecker.Result `json:"sites"`
	NextUpdateAt time.Time                       `json:"nextUpdateAt"`
}

func buildStatusStreamPayload(cache *statuscache.Cache) statusStreamPayload {
	snapshot := cache.Snapshot()
	sites := make(map[string]statuschecker.Result, len(statusRoutes))
	for path, serviceKey := range statusRoutes {
		if result, ok := snapshot[serviceKey]; ok {
			sites[path] = result
		}
	}
	return statusStreamPayload{Sites: sites, NextUpdateAt: cache.NextUpdateAt()}
}

// statusStreamHandler pushes the full status snapshot over Server-Sent
// Events every time statusCache finishes a refresh, instead of making the
// frontend poll on its own timer and drift out of sync with the backend's.
func statusStreamHandler(cache *statuscache.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
			payload, err := json.Marshal(buildStatusStreamPayload(cache))
			if err != nil {
				return false
			}
			if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
				return false
			}
			flusher.Flush()
			return true
		}

		if !writeEvent() { // 연결 직후 지금 상태를 바로 한 번 보내준다
			return
		}

		updates, cancel := cache.Subscribe()
		defer cancel()

		for {
			select {
			case <-r.Context().Done(): // 클라이언트가 연결을 끊음
				return
			case _, ok := <-updates:
				if !ok || !writeEvent() {
					return
				}
			}
		}
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
		http.Error(w, apitext.KakaoNotConfigured, http.StatusServiceUnavailable)
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
			http.Error(w, apitext.InvalidLoginRequest, http.StatusBadRequest)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name: oauthStateCookieName, Value: "", Path: "/", MaxAge: -1,
		})

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, apitext.MissingAuthCode, http.StatusBadRequest)
			return
		}

		tokens, err := kakaoauth.ExchangeCode(r.Context(), code)
		if err != nil {
			log.Printf("[auth] 토큰 교환 실패: %v", err)
			http.Error(w, apitext.LoginProcessingError, http.StatusBadGateway)
			return
		}

		profile, err := kakaoauth.FetchProfile(r.Context(), tokens.AccessToken)
		if err != nil {
			log.Printf("[auth] 프로필 조회 실패: %v", err)
			http.Error(w, apitext.LoginProcessingError, http.StatusBadGateway)
			return
		}

		if err := userStore.UpsertUser(r.Context(), userstore.User{
			KakaoID:       profile.ID,
			Nickname:      profile.Nickname,
			AccessToken:   tokens.AccessToken,
			RefreshToken:  tokens.RefreshToken,
			ExpiresAt:     tokens.ExpiresAt,
			NotifyConsent: kakaoauth.HasTalkMessageScope(tokens.Scope),
		}); err != nil {
			log.Printf("[auth] 사용자 저장 실패: %v", err)
			http.Error(w, apitext.LoginProcessingError, http.StatusInternalServerError)
			return
		}

		sessionToken, err := userStore.CreateSession(r.Context(), profile.ID, sessionTTL)
		if err != nil {
			log.Printf("[auth] 세션 생성 실패: %v", err)
			http.Error(w, apitext.LoginProcessingError, http.StatusInternalServerError)
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
			"notifyConsent":   user.NotifyConsent,
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

// withdrawHandler는 회원 탈퇴다 — 로그아웃과 다르게 세션만 지우는 게 아니라
// 카카오 쪽 연결도 끊고(Unlink) DB의 계정/세션/구독 전부를 즉시 삭제한다.
// 되돌릴 수 없다.
func withdrawHandler(userStore *userstore.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := currentUser(r, userStore)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if err := kakaoauth.Unlink(r.Context(), user.AccessToken); err != nil {
			// 카카오 쪽 연결 끊기가 실패해도(토큰 만료 등) 우리 쪽 데이터는
			// 반드시 지워야 한다 — 탈퇴 요청 자체를 막을 이유는 아니다.
			log.Printf("[auth] 유저 %d 카카오 연결 끊기 실패: %v", user.KakaoID, err)
		}

		if err := userStore.DeleteUser(r.Context(), user.KakaoID); err != nil {
			log.Printf("[auth] 유저 %d 탈퇴 처리 실패: %v", user.KakaoID, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
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
		if !user.NotifyConsent {
			// talk_message 동의 없이는 나에게 보내기 자체가 불가능하니, 프론트가
			// 어떻게 요청하든 서버에서도 한 번 더 막는다 (프론트 체크는 우회 가능하므로).
			log.Printf("[subscriptions] 유저 %d: notify_consent 없어서 %s 구독 요청 거부(403)", user.KakaoID, site)
			w.WriteHeader(http.StatusForbidden)
			return
		}
		if err := userStore.Subscribe(r.Context(), user.KakaoID, site); err != nil {
			log.Printf("[subscriptions] %s 구독 실패: %v", site, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		log.Printf("[subscriptions] 유저 %d: %s 구독 성공, 확인 알림 발송 시작", user.KakaoID, site)
		go notifyUser(userStore, user, apitext.SubscribeConfirm(apitext.SiteName(site)))
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
		if user.NotifyConsent {
			go notifyUser(userStore, user, apitext.UnsubscribeConfirm(apitext.SiteName(site)))
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// notifyUser는 구독 on/off 확인 메시지처럼, HTTP 응답을 막지 않아도 되는
// 카카오톡 발송을 백그라운드로 보낸다. 액세스 토큰이 곧 만료될 것 같으면
// (checkstatus의 알림 로직과 공유하는) kakaoauth.EnsureFreshToken이 먼저 갱신한다.
func notifyUser(userStore *userstore.Store, user userstore.User, message string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	accessToken, err := kakaoauth.EnsureFreshToken(ctx, user.AccessToken, user.RefreshToken, user.ExpiresAt, func(t kakaoauth.TokenResult) error {
		return userStore.UpdateTokens(ctx, user.KakaoID, t.AccessToken, t.RefreshToken, t.ExpiresAt)
	})
	if err != nil {
		log.Printf("[kakao] 유저 %d 토큰 갱신 실패: %v", user.KakaoID, err)
		return
	}

	if err := kakaoauth.SendToMe(ctx, accessToken, message, "https://issmuok.site"); err != nil {
		log.Printf("[kakao] 유저 %d 알림 발송 실패: %v", user.KakaoID, err)
		return
	}
	log.Printf("[kakao] 유저 %d 알림 발송 성공", user.KakaoID)
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
		json.NewEncoder(w).Encode(map[string]string{"message": apitext.InvalidRequestFormat})
		return
	}

	if req.Website != "" {
		// Silently pretend success to a bot so it doesn't learn to adapt.
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": apitext.ContactMessageSent})
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": apitext.ContactMessageMissing})
		return
	}

	mailer.SendContactMessage(strings.TrimSpace(req.Name), strings.TrimSpace(req.Email), req.Message)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": apitext.ContactMessageSent})
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

// rateLimitMiddleware applies a per-IP rate limit: statusLimiter (very
// generous, see where it's constructed) for /status/*, limiter (20/min) for
// everything else. Client IP is read from X-Forwarded-For since Render sits
// in front as a reverse proxy (equivalent of Express's
// `app.set('trust proxy', 1)`) — and since the frontend's SSR fetch now
// forwards the real visitor IP too (see StatusDashboardServer.js), this
// actually identifies individual visitors instead of lumping all SSR
// traffic under one shared IP.
func rateLimitMiddleware(limiter, statusLimiter *ratelimit.Limiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		activeLimiter := limiter
		if strings.HasPrefix(r.URL.Path, "/status/") {
			activeLimiter = statusLimiter
		}
		if !activeLimiter.Allow(clientIP(r)) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{"message": apitext.RateLimited})
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
