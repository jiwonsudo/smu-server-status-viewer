// Package statusstore persists per-service status history to a JSON file
// so status transitions can be detected across separate runs (GitHub
// Actions checks out a fresh copy every run, so this file is git-tracked
// and committed back by the workflow when it changes).
package statusstore

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type Entry struct {
	Status        string `json:"status"`
	LastCheckedAt string `json:"lastCheckedAt"`
	LastChangedAt string `json:"lastChangedAt"`
}

type Store struct {
	path string
}

func New(path string) *Store {
	return &Store{path: path}
}

func (s *Store) load() map[string]Entry {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return map[string]Entry{}
	}
	var state map[string]Entry
	if err := json.Unmarshal(data, &state); err != nil {
		return map[string]Entry{}
	}
	return state
}

func (s *Store) save(state map[string]Entry) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0o644)
}

// ChangeResult reports whether the recorded status changed and, if a
// previous record existed, what it was.
type ChangeResult struct {
	Changed        bool
	PreviousStatus string
	HadPrevious    bool
}

// RecordStatus records the latest status for serviceName.
func (s *Store) RecordStatus(serviceName, status string) (ChangeResult, error) {
	state := s.load()
	previous, hadPrevious := state[serviceName]
	changed := !hadPrevious || previous.Status != status
	now := time.Now().UTC().Format(time.RFC3339)

	lastChangedAt := now
	if !changed {
		lastChangedAt = previous.LastChangedAt
	}

	state[serviceName] = Entry{
		Status:        status,
		LastCheckedAt: now,
		LastChangedAt: lastChangedAt,
	}

	if err := s.save(state); err != nil {
		return ChangeResult{}, err
	}

	result := ChangeResult{Changed: changed, HadPrevious: hadPrevious}
	if hadPrevious {
		result.PreviousStatus = previous.Status
	}
	return result, nil
}
