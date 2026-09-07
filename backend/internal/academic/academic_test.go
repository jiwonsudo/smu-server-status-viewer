package academic

import (
	"testing"
	"time"
)

func TestContextTag(t *testing.T) {
	d := func(m time.Month, day int) time.Time { return time.Date(2026, m, day, 10, 0, 0, 0, time.Local) }
	cases := []struct {
		t    time.Time
		want string
	}{
		{d(time.March, 3), TagFirstWeek},
		{d(time.September, 8), TagFirstWeek},
		{d(time.March, 20), TagRegular},
		{d(time.April, 18), TagExams},
		{d(time.October, 20), TagExams},
		{d(time.June, 15), TagExams},
		{d(time.December, 15), TagExams},
		{d(time.July, 1), TagRegular},
		{d(time.January, 15), TagRegular},
	}
	for _, c := range cases {
		if got := ContextTag(c.t); got != c.want {
			t.Errorf("ContextTag(%s) = %q, want %q", c.t.Format("01-02"), got, c.want)
		}
	}
}
