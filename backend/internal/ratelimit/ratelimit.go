// Package ratelimit is a small in-memory fixed-window limiter, replacing
// express-rate-limit. Good enough for a single-instance low-traffic API;
// not meant to survive multiple server instances.
package ratelimit

import (
	"sync"
	"time"
)

type bucket struct {
	windowStart time.Time
	count       int
}

type Limiter struct {
	window time.Duration
	max    int

	mu      sync.Mutex
	buckets map[string]*bucket
}

func New(window time.Duration, max int) *Limiter {
	l := &Limiter{
		window:  window,
		max:     max,
		buckets: make(map[string]*bucket),
	}
	go l.sweepStale()
	return l
}

// Allow reports whether the request identified by key is within the limit.
func (l *Limiter) Allow(key string) bool {
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	b, ok := l.buckets[key]
	if !ok || now.Sub(b.windowStart) >= l.window {
		l.buckets[key] = &bucket{windowStart: now, count: 1}
		return true
	}

	if b.count >= l.max {
		return false
	}
	b.count++
	return true
}

// sweepStale periodically drops buckets whose window has long expired so
// the map doesn't grow unbounded over a long-running process.
func (l *Limiter) sweepStale() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		cutoff := time.Now().Add(-2 * l.window)
		l.mu.Lock()
		for key, b := range l.buckets {
			if b.windowStart.Before(cutoff) {
				delete(l.buckets, key)
			}
		}
		l.mu.Unlock()
	}
}
