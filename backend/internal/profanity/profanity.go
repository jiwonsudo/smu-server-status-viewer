// Package profanity does a lightweight Korean profanity check on contact
// form submissions — just enough to flag the obvious cases for triage.
// Matching is substring-based on a normalized copy of the text (whitespace
// and common separators stripped) so "ㅅ ㅂ" and "시-발" still hit.
package profanity

import "strings"

// stems covers the common Korean profanity roots.
var stems = []string{
	"씨발", "씨빨", "시발", "시팔", "씨팔", "슈발", "쓰발", "씨바", "시바", "ㅅㅂ", "ㅄ",
	"병신", "븅신", "빙신", "ㅂㅅ",
	"개새끼", "개색끼", "개세끼", "새끼", "쉐끼", "썌끼",
	"지랄", "지럴", "ㅈㄹ",
	"좆", "좃", "존나", "졸라", "ㅈㄴ",
	"닥쳐", "닥치", "꺼져", "꺼저",
	"미친놈", "미친년", "또라이", "돌아이",
	"엿먹", "염병", "옘병",
	"fuck", "shit", "bitch", "asshole",
}

var separators = strings.NewReplacer(
	" ", "", "\t", "", "\n", "", "-", "", "_", "", ".", "", ",", "", "*", "",
	"~", "", "|", "", "/", "", "\\", "", "ㅡ", "",
)

// Find returns the profanity stems present in text (nil if clean).
func Find(text string) []string {
	norm := separators.Replace(strings.ToLower(text))
	var hits []string
	seen := map[string]bool{}
	for _, s := range stems {
		if !seen[s] && strings.Contains(norm, s) {
			seen[s] = true
			hits = append(hits, s)
		}
	}
	return hits
}
