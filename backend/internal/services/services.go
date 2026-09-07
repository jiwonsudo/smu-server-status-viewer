// Package services is the one canonical list of SMU services SMUON monitors
// and alerts on. Two keys are in play across the codebase and this maps
// them: Key is the statuschecker.ServiceURL key (e.g. "ECAMPUS"), SiteKey
// is the short key used for clicks, Discord webhooks, and the frontend's
// SITE_INFOS (e.g. "ecampus").
//
// NOTICE is checked by the HTTP API (see cmd/server's statusRoutes) but is
// intentionally not in this list — the frontend doesn't show it and we
// don't alert on it.
package services

type Service struct {
	Key     string // statuschecker.ServiceURL key, e.g. "ECAMPUS"
	SiteKey string // short key, e.g. "ecampus"
}

// Monitored is every service the state monitor tracks for transitions and
// fires alerts / records incidents for.
var Monitored = []Service{
	{Key: "HOME", SiteKey: "home"},
	{Key: "SAMMUL", SiteKey: "sammul"},
	{Key: "ECAMPUS", SiteKey: "ecampus"},
	{Key: "CLOUD", SiteKey: "cloud"},
	{Key: "DORM_SEOUL", SiteKey: "dorm-seoul"},
	{Key: "SUGANG", SiteKey: "sugang"},
}

// SiteKey returns the short site key for a statuschecker service key, or ""
// if the service isn't monitored.
func SiteKey(serviceKey string) string {
	for _, s := range Monitored {
		if s.Key == serviceKey {
			return s.SiteKey
		}
	}
	return ""
}
