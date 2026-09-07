package incidentai

import "testing"

func TestParseVerdict(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		want    string
		wantErr bool
	}{
		{"plain", `{"verdict":"일시적","confidence":0.7,"eta":"30분 내","reasoning":"과거 3건 평균 31분"}`, "일시적", false},
		{"fenced", "```json\n{\"verdict\":\"지속적\",\"confidence\":0.9,\"eta\":\"\",\"reasoning\":\"x\"}\n```", "지속적", false},
		{"prose around", `여기 결과입니다: {"verdict":"판단보류","confidence":0.2,"eta":"","reasoning":"데이터 부족"} 이상.`, "판단보류", false},
		{"bad verdict", `{"verdict":"maybe","confidence":0.5,"eta":"","reasoning":"x"}`, "", true},
		{"not json", `일시적일 것 같습니다`, "", true},
		{"confidence clamped", `{"verdict":"일시적","confidence":1.7,"eta":"","reasoning":"x"}`, "일시적", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			v, err := parseVerdict(c.in)
			if c.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %+v", v)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if v.Verdict != c.want {
				t.Fatalf("verdict = %q, want %q", v.Verdict, c.want)
			}
			if v.Confidence < 0 || v.Confidence > 1 {
				t.Fatalf("confidence not clamped: %v", v.Confidence)
			}
		})
	}
}

func TestBuildUserPromptOmitsEmptyBlocks(t *testing.T) {
	// No history → the prompt should still be well-formed and not print
	// "중앙값 0분" style noise.
	p := buildUserPrompt(Input{SiteName: "상명대학교 이캠퍼스", DownStatus: "timeout", HistoryCount: 0})
	if contains(p, "복구시간: 중앙값") {
		t.Fatalf("empty-history prompt leaked a median line:\n%s", p)
	}
	if !contains(p, "총 장애 0건") {
		t.Fatalf("prompt missing the history count line:\n%s", p)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
