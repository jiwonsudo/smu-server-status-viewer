// Package incidentai asks an LLM to judge whether an in-progress outage
// looks transient or sustained, grounded only in the historical stats the
// caller passes in. Raw HTTPS POST to the OpenAI Chat Completions API (no
// SDK, same style as internal/mailer) — one provider for both this and the
// embeddings in internal/embed, so one OPENAI_API_KEY covers the whole
// incident-analysis feature. The model never runs at request time: the
// server calls this once when an outage is confirmed and stores the
// verdict (see internal/incidents).
package incidentai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const apiURL = "https://api.openai.com/v1/chat/completions"

// Model is a const so it's a one-line swap. gpt-4o-mini is plenty for a
// short grounded JSON judgment ($0.15/$0.60 per 1M tokens ≈ $0.0005 per
// call) and only fires on a real outage.
const Model = "gpt-4o-mini"

// ErrDisabled means OPENAI_API_KEY isn't configured.
var ErrDisabled = errors.New("incidentai: OPENAI_API_KEY not set")

// Input is everything the prompt needs. History* fields come from
// incidentstore.Stats; the caller maps them over.
type Input struct {
	SiteName       string
	DownStatus     string // "error" | "timeout"
	StartedAt      time.Time
	ContextTag     string // "개강주" | "시험기간" | "평시"
	OngoingMinutes int

	HistoryCount      int
	HistoryResolved   int
	MedianMinutes     int
	MinMinutes        int
	MaxMinutes        int
	SameHourCount     int
	SameHourMedian    int
	SameWeekdayCount  int
	SameContextCount  int
	SameContextMedian int
	Flapping24hCount  int
}

// Verdict is the parsed analysis.
type Verdict struct {
	Verdict    string  `json:"verdict"`    // "일시적" | "지속적" | "판단보류"
	Confidence float64 `json:"confidence"` // 0..1
	ETA        string  `json:"eta"`        // human phrase, may be ""
	Reasoning  string  `json:"reasoning"`  // one or two sentences, cites the numbers
}

const systemPrompt = `너는 상명대학교 웹서비스 장애 분석기다.
지금 진행 중인 장애가 "일시적"(곧 자연 복구될 가능성이 높음)인지 "지속적"(오래 갈 가능성이 높음)인지, 주어진 "과거 통계"의 수치만 근거로 판정하라.

규칙:
- 통계에 없는 원인이나 수치를 지어내지 마라. 로그 내용, 서버 내부 상태 등은 모른다.
- 과거 데이터가 거의 없으면(예: 총 3건 미만) verdict를 "판단보류"로 하고 그 이유를 밝혀라.
- reasoning은 한국어 1~2문장. 반드시 구체적 수치를 인용하라 (예: "이 시간대 장애 3건, 평균 31분").
- eta는 과거 복구시간 분포에 근거한 한국어 표현. 근거가 없으면 빈 문자열.
- 아래 형태의 JSON 객체 하나만 출력하라.

{"verdict": "일시적" | "지속적" | "판단보류", "confidence": 0.0~1.0, "eta": "문자열", "reasoning": "문자열"}`

// Analyze calls the model and returns the parsed verdict.
func Analyze(ctx context.Context, in Input) (Verdict, error) {
	key := os.Getenv("OPENAI_API_KEY")
	if key == "" {
		return Verdict{}, ErrDisabled
	}

	reqBody, err := json.Marshal(map[string]any{
		"model":           Model,
		"max_tokens":      500,
		"temperature":     0.3,
		"response_format": map[string]any{"type": "json_object"},
		"messages": []any{
			map[string]any{"role": "system", "content": systemPrompt},
			map[string]any{"role": "user", "content": buildUserPrompt(in)},
		},
	})
	if err != nil {
		return Verdict{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(reqBody))
	if err != nil {
		return Verdict{}, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return Verdict{}, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return Verdict{}, fmt.Errorf("openai chat completions failed (HTTP %d): %s", resp.StatusCode, string(raw))
	}

	var parsed struct {
		Choices []struct {
			FinishReason string `json:"finish_reason"`
			Message      struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return Verdict{}, err
	}
	if len(parsed.Choices) == 0 {
		return Verdict{}, fmt.Errorf("openai returned no choices")
	}
	content := parsed.Choices[0].Message.Content

	v, err := parseVerdict(content)
	if err != nil {
		return Verdict{}, fmt.Errorf("%w — raw: %s", err, content)
	}
	return v, nil
}

func parseVerdict(s string) (Verdict, error) {
	s = strings.TrimSpace(s)
	// Be lenient about a stray ```json fence or prose around the object.
	if i := strings.IndexByte(s, '{'); i >= 0 {
		if j := strings.LastIndexByte(s, '}'); j > i {
			s = s[i : j+1]
		}
	}
	var v Verdict
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return Verdict{}, fmt.Errorf("verdict JSON parse: %w", err)
	}
	switch v.Verdict {
	case "일시적", "지속적", "판단보류":
	default:
		return Verdict{}, fmt.Errorf("unexpected verdict value %q", v.Verdict)
	}
	if v.Confidence < 0 {
		v.Confidence = 0
	} else if v.Confidence > 1 {
		v.Confidence = 1
	}
	return v, nil
}

func buildUserPrompt(in Input) string {
	var b strings.Builder
	fmt.Fprintf(&b, "## 현재 상황\n")
	fmt.Fprintf(&b, "- 대상: %s\n", in.SiteName)
	fmt.Fprintf(&b, "- 발생: %s (%s, %s)\n",
		in.StartedAt.Format("2006-01-02 15:04"), weekdayKo(in.StartedAt), orTag(in.ContextTag))
	fmt.Fprintf(&b, "- 증상: %s\n", downStatusKo(in.DownStatus))
	fmt.Fprintf(&b, "- 현재까지 지속: %d분\n", in.OngoingMinutes)

	fmt.Fprintf(&b, "\n## 과거 통계 (이 서비스, 기록된 전체)\n")
	fmt.Fprintf(&b, "- 총 장애 %d건 (복구 완료 %d건)\n", in.HistoryCount, in.HistoryResolved)
	if in.HistoryResolved > 0 {
		fmt.Fprintf(&b, "- 복구시간: 중앙값 %d분 (최소 %d분, 최대 %d분)\n", in.MedianMinutes, in.MinMinutes, in.MaxMinutes)
	}
	if in.SameHourCount > 0 {
		fmt.Fprintf(&b, "- 같은 시간대(±1시간) 장애 %d건, 복구시간 중앙값 %d분\n", in.SameHourCount, in.SameHourMedian)
	}
	if in.SameWeekdayCount > 0 {
		fmt.Fprintf(&b, "- 같은 요일(%s) 장애 %d건\n", weekdayKo(in.StartedAt), in.SameWeekdayCount)
	}
	if in.SameContextCount > 0 {
		fmt.Fprintf(&b, "- 같은 학사맥락(%s) 장애 %d건, 복구시간 중앙값 %d분\n", orTag(in.ContextTag), in.SameContextCount, in.SameContextMedian)
	}
	fmt.Fprintf(&b, "- 최근 24시간 내 이 서비스 장애 발생 횟수: %d회\n", in.Flapping24hCount)
	return b.String()
}

func orTag(tag string) string {
	if tag == "" {
		return "평시"
	}
	return tag
}

func downStatusKo(s string) string {
	switch s {
	case "timeout":
		return "응답 없음(타임아웃)"
	case "error":
		return "오류 응답 / 연결 실패"
	default:
		return s
	}
}

func weekdayKo(t time.Time) string {
	return [...]string{"일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"}[t.Weekday()]
}
