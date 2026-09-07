package statemonitor

import (
	"context"
	"testing"

	"smu-server-status-viewer/backend/internal/services"
	"smu-server-status-viewer/backend/internal/servicestate"
	"smu-server-status-viewer/backend/internal/statuschecker"
)

// newTestMonitor wires a Monitor with a disabled (no-op) store and a
// synchronous dispatch that records every confirmed transition.
func newTestMonitor(t *testing.T, confirmations int) (*Monitor, *[]Transition) {
	t.Helper()
	store, _ := servicestate.New(nil)
	m := New(Config{State: store, Confirmations: confirmations})
	var got []Transition
	m.dispatch = func(_ services.Service, tr Transition) { got = append(got, tr) }
	return m, &got
}

func snap(status string) map[string]statuschecker.Result {
	return map[string]statuschecker.Result{"ECAMPUS": {Status: status}}
}

func feed(m *Monitor, statuses ...string) {
	for _, s := range statuses {
		m.evaluate(context.Background(), snap(s))
	}
}

func TestFirstObservationIsSilentBaseline(t *testing.T) {
	m, got := newTestMonitor(t, 2)
	feed(m, "ok")
	if len(*got) != 0 {
		t.Fatalf("first observation should not alert, got %v", *got)
	}
	if c := m.confirmed["ECAMPUS"]; !c.known || c.status != "ok" {
		t.Fatalf("baseline not seeded: %+v", c)
	}
}

func TestTransitionNeedsConfirmations(t *testing.T) {
	m, got := newTestMonitor(t, 2)
	feed(m, "ok")      // baseline
	feed(m, "timeout") // 1st bad check — pending, no alert
	if len(*got) != 0 {
		t.Fatalf("single bad check should not alert yet, got %v", *got)
	}
	feed(m, "timeout") // 2nd consecutive — confirmed
	if len(*got) != 1 {
		t.Fatalf("expected 1 transition after %d confirmations, got %d", 2, len(*got))
	}
	if tr := (*got)[0]; tr.PreviousStatus != "ok" || tr.CurrentStatus != "timeout" {
		t.Fatalf("wrong transition payload: %+v", tr)
	}
}

func TestBlipBelowConfirmationsIsIgnored(t *testing.T) {
	m, got := newTestMonitor(t, 2)
	feed(m, "ok")      // baseline
	feed(m, "timeout") // blip (1 check)
	feed(m, "ok")      // recovered before confirmation
	feed(m, "ok")
	if len(*got) != 0 {
		t.Fatalf("a sub-threshold blip must not alert, got %v", *got)
	}
}

func TestErrorToTimeoutDoesNotReAlert(t *testing.T) {
	m, got := newTestMonitor(t, 2)
	feed(m, "ok")
	feed(m, "error", "error")     // confirmed down → 1 alert
	feed(m, "timeout", "timeout") // still down, different raw status → no new alert
	if len(*got) != 1 {
		t.Fatalf("down→down status change must not re-alert, got %d transitions", len(*got))
	}
	if c := m.confirmed["ECAMPUS"]; c.status != "timeout" {
		t.Fatalf("recorded status should follow the raw value, got %q", c.status)
	}
}

func TestRecoveryAlerts(t *testing.T) {
	m, got := newTestMonitor(t, 2)
	feed(m, "ok")
	feed(m, "error", "error") // down (alert 1)
	feed(m, "ok", "ok")       // up (alert 2)
	if len(*got) != 2 {
		t.Fatalf("expected down + recovery alerts, got %d", len(*got))
	}
	if (*got)[1].CurrentStatus != "ok" {
		t.Fatalf("second alert should be the recovery: %+v", (*got)[1])
	}
}

func TestSeededBaselineFromStore(t *testing.T) {
	m, got := newTestMonitor(t, 2)
	m.confirmed["ECAMPUS"] = confirmedStatus{status: "ok", known: true} // as Start would seed
	feed(m, "error", "error")
	if len(*got) != 1 {
		t.Fatalf("seeded baseline should let the first real transition alert, got %d", len(*got))
	}
}
