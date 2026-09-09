// Package services is the single registry of SMU web services this app
// knows about. Everything else derives from it: the URLs statuschecker
// probes, the /status/* routes, the site keys accepted for clicks and
// incident analysis, the display names used in alerts, and which services
// the state monitor tracks.
package services

// Service is one SMU web service.
type Service struct {
	Key         string // status cache / checker key, e.g. "ECAMPUS"
	SiteKey     string // short key for routes, clicks, Discord webhooks, frontend, e.g. "ecampus"
	URL         string // URL to probe
	DisplayName string // Korean name shown in alerts
	Purpose     string // what students use it for — feeds the AI stability blurb so advice matches the site
	Monitored   bool   // tracked for transitions, alerts, and incident history
}

// All is every known service, monitored or not.
var All = []Service{
	{Key: "HOME", SiteKey: "home", URL: "https://www.smu.ac.kr/kor/index.do", DisplayName: "상명대학교 홈페이지", Purpose: "학교 홈페이지·공지·학사 안내 조회", Monitored: true},
	{Key: "NOTICE", SiteKey: "notice", URL: "https://www.smu.ac.kr/kor/life/notice.do", DisplayName: "상명대학교 공지사항", Purpose: "학교 공지사항 조회", Monitored: false},
	{Key: "SAMMUL", SiteKey: "sammul", URL: "https://smul.smu.ac.kr/", DisplayName: "상명대학교 샘물(통합정보시스템)", Purpose: "수강신청·성적 조회·증명서 발급 등 학사행정", Monitored: true},
	{Key: "ECAMPUS", SiteKey: "ecampus", URL: "https://ecampus.smu.ac.kr/", DisplayName: "상명대학교 이캠퍼스", Purpose: "온라인 강의 수강·강의자료 확인·과제 및 시험 제출", Monitored: true},
	{Key: "CLOUD", SiteKey: "cloud", URL: "https://cloud.smu.ac.kr/", DisplayName: "Office 365 (클라우드메일)", Purpose: "학교 메일(Office 365) 확인·발송", Monitored: true},
	{Key: "DORM_SEOUL", SiteKey: "dorm-seoul", URL: "https://dormitory.smu.ac.kr/dormi/index.do", DisplayName: "학생생활관", Purpose: "생활관(기숙사) 입사 신청·조회", Monitored: true},
	{Key: "SUGANG", SiteKey: "sugang", URL: "https://sugang.smu.ac.kr", DisplayName: "상명대학교 수강신청", Purpose: "수강신청", Monitored: true},
}

// Monitored is the subset of All tracked for transitions and alerts.
var Monitored = filter(func(s Service) bool { return s.Monitored })

// URLByKey maps each service's checker key to its URL (for statuscache).
func URLByKey() map[string]string {
	m := make(map[string]string, len(All))
	for _, s := range All {
		m[s.Key] = s.URL
	}
	return m
}

// ByKey looks up a service by its checker key (e.g. "ECAMPUS").
func ByKey(key string) (Service, bool) { return find(func(s Service) bool { return s.Key == key }) }

// BySiteKey looks up a service by its short site key (e.g. "ecampus").
func BySiteKey(siteKey string) (Service, bool) {
	return find(func(s Service) bool { return s.SiteKey == siteKey })
}

// DisplayName returns the Korean display name for a site key, or the site
// key itself if it's unknown.
func DisplayName(siteKey string) string {
	if s, ok := BySiteKey(siteKey); ok {
		return s.DisplayName
	}
	return siteKey
}

// Purpose returns the "what students use it for" phrase for a site key, or ""
// if unknown.
func Purpose(siteKey string) string {
	if s, ok := BySiteKey(siteKey); ok {
		return s.Purpose
	}
	return ""
}

func filter(pred func(Service) bool) []Service {
	var out []Service
	for _, s := range All {
		if pred(s) {
			out = append(out, s)
		}
	}
	return out
}

func find(pred func(Service) bool) (Service, bool) {
	for _, s := range All {
		if pred(s) {
			return s, true
		}
	}
	return Service{}, false
}
