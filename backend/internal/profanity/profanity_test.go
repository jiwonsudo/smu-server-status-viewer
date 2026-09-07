package profanity

import "testing"

func TestFind(t *testing.T) {
	clean := []string{
		"이캠퍼스 접속이 안 돼요",
		"수강신청 서버 추가해 주세요",
		"응답이 느린 것 같습니다",
		"",
	}
	for _, s := range clean {
		if hits := Find(s); len(hits) > 0 {
			t.Errorf("Find(%q) = %v, want none", s, hits)
		}
	}

	dirty := []string{
		"씨발 왜 안됨",
		"시 발 진짜",
		"이거 만든놈 병신이냐",
		"ㅅㅂ 개같네",
		"this site is shit",
	}
	for _, s := range dirty {
		if hits := Find(s); len(hits) == 0 {
			t.Errorf("Find(%q) = none, want a hit", s)
		}
	}
}
