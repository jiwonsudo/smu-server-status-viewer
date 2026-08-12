// Package kakaoauth implements the pieces of Kakao Login + Kakao Message
// API this app needs: exchanging an OAuth code for tokens, fetching the
// logged-in user's profile, refreshing an expired access token, and
// sending a "나에게 보내기" (send-to-me) message with a valid access token.
//
// Reference: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
// and https://developers.kakao.com/docs/latest/ko/kakaotalk-message/rest-api
package kakaoauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	authorizeURL = "https://kauth.kakao.com/oauth/authorize"
	tokenURL     = "https://kauth.kakao.com/oauth/token"
	userInfoURL  = "https://kapi.kakao.com/v2/user/me"
	sendToMeURL  = "https://kapi.kakao.com/v2/api/talk/memo/default/send"
	unlinkURL    = "https://kapi.kakao.com/v1/user/unlink"

	// scope를 명시하면 카카오는 여기 나열한 항목만 요청한다(앱의 기본 동의항목으로
	// 자동으로 채워주지 않는다) — profile_nickname을 안 넣으면 닉네임이 아예
	// 안 넘어와서 FetchProfile이 항상 "카카오 사용자"로 폴백하게 된다.
	// profile_nickname: 닉네임. talk_message: 카카오톡 메시지(나에게 보내기) 전송.
	scope = "profile_nickname talk_message"
)

func clientID() string     { return os.Getenv("KAKAO_CLIENT_ID") }
func clientSecret() string { return os.Getenv("KAKAO_CLIENT_SECRET") }
func redirectURI() string  { return os.Getenv("KAKAO_REDIRECT_URI") }

// Configured reports whether the Kakao Login env vars are set.
func Configured() bool {
	return clientID() != "" && redirectURI() != ""
}

// AuthorizeURL builds the URL to redirect the browser to for login consent.
func AuthorizeURL(state string) string {
	q := url.Values{
		"client_id":     {clientID()},
		"redirect_uri":  {redirectURI()},
		"response_type": {"code"},
		"scope":         {scope},
		"state":         {state},
	}
	return authorizeURL + "?" + q.Encode()
}

type TokenResult struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	// Scope는 카카오가 실제로 부여한 동의항목 목록(공백 구분)이다. talk_message는
	// "이용 중 동의"라 로그인할 때 사용자가 거부했을 수 있으므로, 매 로그인/재동의
	// 때마다 이 값을 확인해서 실제로 나에게 보내기가 가능한지 판단해야 한다.
	Scope string
}

// HasTalkMessageScope reports whether scope(토큰 응답의 공백 구분 문자열)에
// talk_message(카카오톡 메시지 전송)가 포함돼 있는지 본다.
func HasTalkMessageScope(scope string) bool {
	for _, s := range strings.Fields(scope) {
		if s == "talk_message" {
			return true
		}
	}
	return false
}

type tokenResponse struct {
	AccessToken           string `json:"access_token"`
	RefreshToken          string `json:"refresh_token"`
	ExpiresIn             int    `json:"expires_in"`
	RefreshTokenExpiresIn int    `json:"refresh_token_expires_in"`
	Scope                 string `json:"scope"`
}

// ExchangeCode trades an OAuth authorization code for tokens.
func ExchangeCode(ctx context.Context, code string) (TokenResult, error) {
	form := url.Values{
		"grant_type":   {"authorization_code"},
		"client_id":    {clientID()},
		"redirect_uri": {redirectURI()},
		"code":         {code},
	}
	if secret := clientSecret(); secret != "" {
		form.Set("client_secret", secret)
	}
	return doTokenRequest(ctx, form)
}

// RefreshAccessToken uses a stored refresh token to get a fresh access
// token. Kakao only returns a new refresh_token if it decides to rotate
// it — callers should keep the old one when that field is empty.
func RefreshAccessToken(ctx context.Context, refreshToken string) (TokenResult, error) {
	form := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {clientID()},
		"refresh_token": {refreshToken},
	}
	if secret := clientSecret(); secret != "" {
		form.Set("client_secret", secret)
	}

	result, err := doTokenRequest(ctx, form)
	if err != nil {
		return TokenResult{}, err
	}
	if result.RefreshToken == "" {
		result.RefreshToken = refreshToken
	}
	return result, nil
}

func doTokenRequest(ctx context.Context, form url.Values) (TokenResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return TokenResult{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return TokenResult{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return TokenResult{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return TokenResult{}, fmt.Errorf("kakao token request failed (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var parsed tokenResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return TokenResult{}, err
	}

	return TokenResult{
		AccessToken:  parsed.AccessToken,
		RefreshToken: parsed.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(parsed.ExpiresIn) * time.Second),
		Scope:        parsed.Scope,
	}, nil
}

type KakaoProfile struct {
	ID       int64
	Nickname string
}

type userInfoResponse struct {
	ID           int64 `json:"id"`
	KakaoAccount struct {
		Profile struct {
			Nickname string `json:"nickname"`
		} `json:"profile"`
	} `json:"kakao_account"`
}

// FetchProfile looks up the logged-in user's Kakao id (and nickname, if
// the profile_nickname consent item happens to be granted too).
func FetchProfile(ctx context.Context, accessToken string) (KakaoProfile, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userInfoURL, nil)
	if err != nil {
		return KakaoProfile{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return KakaoProfile{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return KakaoProfile{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return KakaoProfile{}, fmt.Errorf("kakao user info request failed (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var parsed userInfoResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return KakaoProfile{}, err
	}

	nickname := parsed.KakaoAccount.Profile.Nickname
	if nickname == "" {
		nickname = "카카오 사용자"
	}
	return KakaoProfile{ID: parsed.ID, Nickname: nickname}, nil
}

// SendToMe posts a plain-text "나에게 보내기" message to the given user.
func SendToMe(ctx context.Context, accessToken, text, linkURL string) error {
	template := map[string]any{
		"object_type": "text",
		"text":        text,
		"link": map[string]string{
			"web_url":        linkURL,
			"mobile_web_url": linkURL,
		},
		"button_title": "상태 확인하러 가기",
	}
	templateJSON, err := json.Marshal(template)
	if err != nil {
		return err
	}

	form := url.Values{"template_object": {string(templateJSON)}}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sendToMeURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("kakao send-to-me failed (HTTP %d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// Unlink는 카카오 쪽 앱 연결 자체를 끊는다("연결 끊기") — 회원 탈퇴 때 우리
// DB만 지우고 끝내면 카카오 쪽엔 이 서비스와 연결된 계정이 그대로 남아있게
// 되므로, 탈퇴 처리의 일부로 반드시 같이 호출해야 한다.
func Unlink(ctx context.Context, accessToken string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, unlinkURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("kakao unlink failed (HTTP %d): %s", resp.StatusCode, string(body))
	}
	return nil
}
