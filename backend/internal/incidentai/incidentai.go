// Package incidentai asks an LLM to judge whether an in-progress outage
// looks transient or sustained, grounded only in the historical stats the
// caller passes in. Raw HTTPS POST to the OpenAI Chat Completions API (no
// SDK). Called once when an outage is confirmed; the verdict is then stored.
package incidentai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"smu-server-status-viewer/backend/internal/httpx"
)

const apiURL = "https://api.openai.com/v1/chat/completions"

// Model for the verdict. gpt-4o-mini is enough for a short grounded JSON
// judgment and only fires on a real outage.
const Model = "gpt-4o-mini"

// ErrDisabled means OPENAI_API_KEY isn't configured.
var ErrDisabled = errors.New("incidentai: OPENAI_API_KEY not set")

// Enabled reports whether an OpenAI key is configured. Callers check this
// before consuming a spend-budget unit so a keyless deploy doesn't churn it.
func Enabled() bool { return os.Getenv("OPENAI_API_KEY") != "" }

// Input is everything the prompt needs. History* fields come from
// incidentstore.Stats.
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

	raw, err := httpx.PostJSON(ctx, apiURL,
		map[string]string{"Authorization": "Bearer " + key}, 60*time.Second,
		map[string]any{
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

// parseVerdict is lenient about a stray ```json fence or prose around the object.
func parseVerdict(s string) (Verdict, error) {
	s = strings.TrimSpace(s)
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

// --- 평상시 요약문 (service stability blurb) ---

// SummaryInput is the grounded number set for the "current stability" blurb.
// The LLM only rephrases these; it must not introduce anything else.
type SummaryInput struct {
	SiteName            string
	Purpose             string // 이 서비스로 학생이 하는 일 (services.Service.Purpose)
	Level               string // solid | mostly-stable | shaky | down
	ObservedDays        int
	Incidents7d         int
	Incidents30d        int
	Uptime30dPercent    float64 // -1 if not yet observable
	LastIncidentDaysAgo int     // -1 if never
	MedianRecoveryMin   int
	CurrentStatus       string // ok | slow | down | unknown
	CurrentResponseMs   int
}

const summarySystemPrompt = `너는 상명대학교 웹서비스 "서버 안정성 확인" 문구 작성기다.
주어진 수치만 근거로, 이 서비스에 안정적으로 접속될 가능성을 학생이 감으로 알 수 있게 한국어 2~3문장으로 정리하라.

규칙:
- 순서: (1) 안정적 접속 확률 → (2) 최근 접속 오류 이력 → (3) 현재 상태.
- (1)은 주어진 "최근 30일 정상 접속 비율" 수치를 그대로 확률처럼 제시하라 (예: "관측 기록상 약 99.7% 확률로 안정적으로 접속됩니다"). 이 수치가 없으면(관측 부족) 확률을 지어내지 말고 "아직 관측 기간이 짧아 수치로 말하기 이르다"고 밝혀라.
- 수치에 없는 원인·서버 내부 상태·미래 예측을 지어내지 마라.
- "접속하세요 / 다시 시도하세요" 같은 조언·명령조는 넣지 마라. 상태를 알려주는 담담한 톤.
- 불안정하거나 느릴 때 영향받는 작업을 언급한다면, 반드시 주어진 "이 서비스 용도"에 맞춰라 (예: 이캠퍼스면 과제 제출, 샘물이면 성적 조회). 용도와 무관한 예시(수강신청 등)를 임의로 붙이지 마라.
- 딱딱한 통계 나열이 아니라 사람이 읽는 문장. JSON·마크다운 없이 문장만 출력.`

// Summarize returns the natural-language stability blurb, or ErrDisabled if
// no key. One short chat call.
func Summarize(ctx context.Context, in SummaryInput) (string, error) {
	key := os.Getenv("OPENAI_API_KEY")
	if key == "" {
		return "", ErrDisabled
	}

	raw, err := httpx.PostJSON(ctx, apiURL,
		map[string]string{"Authorization": "Bearer " + key}, 30*time.Second,
		map[string]any{
			"model":       Model,
			"max_tokens":  260,
			"temperature": 0.4,
			"messages": []any{
				map[string]any{"role": "system", "content": summarySystemPrompt},
				map[string]any{"role": "user", "content": buildSummaryPrompt(in)},
			},
		})
	if err != nil {
		return "", err
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}
	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

func buildSummaryPrompt(in SummaryInput) string {
	var b strings.Builder
	fmt.Fprintf(&b, "- 서비스: %s\n", in.SiteName)
	if in.Purpose != "" {
		fmt.Fprintf(&b, "- 이 서비스 용도: %s\n", in.Purpose)
	}
	fmt.Fprintf(&b, "- 안정성 등급(내부 판정): %s\n", in.Level)
	fmt.Fprintf(&b, "- 관측 기간: %d일\n", in.ObservedDays)
	fmt.Fprintf(&b, "- 현재 상태: %s", currentStatusKo(in.CurrentStatus))
	if in.CurrentStatus == "slow" && in.CurrentResponseMs > 0 {
		fmt.Fprintf(&b, " (응답 %dms)", in.CurrentResponseMs)
	}
	b.WriteByte('\n')
	fmt.Fprintf(&b, "- 최근 7일 접속 오류: %d건\n", in.Incidents7d)
	fmt.Fprintf(&b, "- 최근 30일 접속 오류: %d건\n", in.Incidents30d)
	if in.Uptime30dPercent >= 0 {
		fmt.Fprintf(&b, "- 최근 30일 정상 접속 비율: 약 %.0f%%\n", in.Uptime30dPercent)
	}
	if in.LastIncidentDaysAgo >= 0 {
		fmt.Fprintf(&b, "- 마지막 접속 오류: %d일 전\n", in.LastIncidentDaysAgo)
	} else {
		fmt.Fprintf(&b, "- 마지막 접속 오류: 관측 이후 없음\n")
	}
	if in.MedianRecoveryMin > 0 {
		fmt.Fprintf(&b, "- 과거 오류의 평소 복구 시간(중앙값): %d분\n", in.MedianRecoveryMin)
	}
	return b.String()
}

func currentStatusKo(s string) string {
	switch s {
	case "ok":
		return "정상"
	case "slow":
		return "정상이지만 느림"
	case "down":
		return "접속 오류"
	default:
		return "확인 중"
	}
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
