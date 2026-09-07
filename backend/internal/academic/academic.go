// Package academic maps a calendar date to a coarse SMU academic-term
// context ("개강주" / "시험기간" / "평시"). It's a heuristic, not a real
// academic calendar: the exact weeks shift year to year, but outages
// cluster hard around the start of each semester and around exams, so even
// an approximate tag is a useful signal for the incident analysis.
//
// Semesters (서울캠 기준, 대략):
//
//	1학기 개강 ~ 3월 첫 주,  중간고사 ~ 4월 3주, 기말고사 ~ 6월 3주
//	2학기 개강 ~ 9월 첫 주,  중간고사 ~ 10월 3주, 기말고사 ~ 12월 3주
package academic

import "time"

const (
	TagFirstWeek = "개강주"
	TagExams     = "시험기간"
	TagRegular   = "평시"
)

// ContextTag returns the term context for t (evaluated in local time).
func ContextTag(t time.Time) string {
	m, d := t.Month(), t.Day()

	switch m {
	case time.March, time.September:
		if d <= 10 {
			return TagFirstWeek
		}
	case time.April, time.October:
		if d >= 14 && d <= 27 {
			return TagExams
		}
	case time.June, time.December:
		if d >= 10 && d <= 23 {
			return TagExams
		}
	}
	return TagRegular
}
