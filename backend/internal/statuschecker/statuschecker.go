// Package statuschecker checks whether an SMU web service responds with
// HTTP 200 within a short timeout.
package statuschecker

import (
	"context"
	"errors"
	"net"
	"net/http"
	"time"

	"smu-server-status-viewer/backend/internal/apitext"
)

// Result is the outcome of one check. ResponseTime is a number of
// milliseconds, except on timeout where it's the string "N/A". CheckedAt is
// not set here — statuscache.Cache fills it in when it stores the result.
type Result struct {
	Status       string    `json:"status"`
	ResponseTime any       `json:"responseTime"`
	Message      string    `json:"message"`
	Error        string    `json:"error,omitempty"`
	CheckedAt    time.Time `json:"checkedAt"`
}

const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const maxRedirects = 5

// httpClient's 10s timeout is deliberately generous: the SMU homepage has
// been measured taking ~8s while healthy.
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
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
			Message:      apitext.StatusConnectionFailed,
			Error:        err.Error(),
		}
	}
	req.Header.Set("User-Agent", browserUserAgent)

	resp, err := httpClient.Do(req)
	duration := int(time.Since(start).Milliseconds())

	if err != nil {
		if isTimeout(err) {
			return Result{Status: "timeout", ResponseTime: "N/A", Message: apitext.StatusTimeout, Error: err.Error()}
		}
		return Result{
			Status:       "error",
			ResponseTime: duration,
			Message:      apitext.StatusConnectionFailed,
			Error:        err.Error(),
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return Result{Status: "ok", ResponseTime: duration, Message: apitext.StatusOK}
	}
	return Result{
		Status:       "error",
		ResponseTime: duration,
		Message:      apitext.StatusHTTPError(resp.StatusCode),
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
