// Package statuschecker checks whether an SMU web service responds with
// HTTP 200 within a short timeout, mirroring the shape the frontend already
// expects (see frontend/src/components/StatusDashboard.jsx).
package statuschecker

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"time"
)

// Result matches the JSON shape the Node/Express version returned.
// ResponseTime is a number of milliseconds, except for the "timeout"
// case where the JS version sent the string "N/A" — kept as `any` here
// so the frontend doesn't need to change.
type Result struct {
	Status       string `json:"status"`
	ResponseTime any    `json:"responseTime"`
	Message      string `json:"message"`
	Error        string `json:"error,omitempty"`
}

// 상명대 서울캠퍼스 대상 서비스만 관리한다 (천안캠퍼스 전용 사이트 제외).
var ServiceURL = map[string]string{
	"HOME":       "https://www.smu.ac.kr/kor/index.do",
	"NOTICE":     "https://www.smu.ac.kr/kor/life/notice.do",
	"SAMMUL":     "https://smul.smu.ac.kr/",
	"ECAMPUS":    "https://ecampus.smu.ac.kr/",
	"CAREER":     "https://smcareer.smu.ac.kr/",
	"CLOUD":      "https://cloud.smu.ac.kr/",
	"DORM_SEOUL": "https://dormitory.smu.ac.kr/dormi/index.do",
}

const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const maxRedirects = 5

var httpClient = &http.Client{
	Timeout: 5 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= maxRedirects {
			return errors.New("stopped after too many redirects")
		}
		return nil
	},
}

// CheckServiceStatus performs a single GET request and classifies the result.
func CheckServiceStatus(ctx context.Context, url string) Result {
	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Result{
			Status:       "error",
			ResponseTime: int(time.Since(start).Milliseconds()),
			Message:      "서비스 접속 실패",
			Error:        err.Error(),
		}
	}
	req.Header.Set("User-Agent", browserUserAgent)

	resp, err := httpClient.Do(req)
	duration := int(time.Since(start).Milliseconds())

	if err != nil {
		if isTimeout(err) {
			return Result{Status: "timeout", ResponseTime: "N/A", Message: "매우 느림(비정상)", Error: err.Error()}
		}
		return Result{
			Status:       "error",
			ResponseTime: duration,
			Message:      "서비스 접속 실패",
			Error:        err.Error(),
		}
	}
	defer resp.Body.Close() // 응답 바디는 필요 없으므로 읽지 않고 즉시 종료

	if resp.StatusCode == http.StatusOK {
		return Result{Status: "ok", ResponseTime: duration, Message: "정상 서비스"}
	}
	return Result{
		Status:       "error",
		ResponseTime: duration,
		Message:      fmt.Sprintf("서비스 비정상: %d", resp.StatusCode),
	}
}

func isTimeout(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return netErr.Timeout()
	}
	return false
}
