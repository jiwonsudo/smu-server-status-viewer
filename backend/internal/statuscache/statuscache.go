// Package statuscache keeps the latest CheckServiceStatus result for each
// monitored site in memory, refreshed on a fixed interval by a background
// goroutine — instead of hitting the SMU site live on every HTTP request.
//
// Without this, each visitor's page load (and each client poll) used to
// trigger a fresh outbound check per site, so backend↔SMU traffic scaled
// with visitor count. With the cache, SMU traffic is constant (one check
// per site per interval) no matter how many people are looking at the page.
//
// Cache also lets callers Subscribe() to be notified exactly when a refresh
// finishes, so the SSE handler (see cmd/server/main.go's statusStreamHandler)
// can push updates the instant they happen instead of the frontend polling
// on its own clock and drifting out of sync with the backend's.
package statuscache

import (
	"context"
	"sync"
	"time"

	"smu-server-status-viewer/backend/internal/statuschecker"
)

type Cache struct {
	interval time.Duration

	mu              sync.RWMutex
	results         map[string]statuschecker.Result
	lastRefreshedAt time.Time

	subsMu sync.Mutex
	subs   map[chan struct{}]struct{}
}

// New starts the cache: it fills every key with a real check before
// returning (so the first requests after boot aren't empty), then keeps
// refreshing all of them every interval in the background.
func New(interval time.Duration, urls map[string]string) *Cache {
	c := &Cache{
		interval: interval,
		results:  make(map[string]statuschecker.Result, len(urls)),
		subs:     make(map[chan struct{}]struct{}),
	}
	c.refreshAll(urls)
	go c.loop(interval, urls)
	return c
}

func (c *Cache) loop(interval time.Duration, urls map[string]string) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		c.refreshAll(urls)
		c.notifySubscribers()
	}
}

// refreshAll checks every site concurrently so the whole cycle takes about
// as long as the single slowest site, not the sum of all of them.
func (c *Cache) refreshAll(urls map[string]string) {
	var wg sync.WaitGroup
	for key, url := range urls {
		wg.Add(1)
		go func(key, url string) {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
			defer cancel()
			result := statuschecker.CheckServiceStatus(ctx, url)
			result.CheckedAt = time.Now()
			c.mu.Lock()
			c.results[key] = result
			c.mu.Unlock()
		}(key, url)
	}
	wg.Wait()

	c.mu.Lock()
	c.lastRefreshedAt = time.Now()
	c.mu.Unlock()
}

func (c *Cache) Get(key string) (statuschecker.Result, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	result, ok := c.results[key]
	return result, ok
}

// Snapshot returns a copy of every cached result, keyed the same as Get.
func (c *Cache) Snapshot() map[string]statuschecker.Result {
	c.mu.RLock()
	defer c.mu.RUnlock()
	snapshot := make(map[string]statuschecker.Result, len(c.results))
	for k, v := range c.results {
		snapshot[k] = v
	}
	return snapshot
}

// NextUpdateAt estimates when the next background refresh will land, so
// clients can show an accurate "다음 업데이트까지 N초" countdown instead of
// guessing from their own poll timer.
func (c *Cache) NextUpdateAt() time.Time {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lastRefreshedAt.Add(c.interval)
}

// Subscribe registers a channel that receives a (non-blocking, best-effort)
// signal every time a refresh cycle finishes. Call the returned cancel func
// when done (e.g. when the SSE connection closes) to stop leaking the chan.
func (c *Cache) Subscribe() (<-chan struct{}, func()) {
	ch := make(chan struct{}, 1)
	c.subsMu.Lock()
	c.subs[ch] = struct{}{}
	c.subsMu.Unlock()

	cancel := func() {
		c.subsMu.Lock()
		if _, ok := c.subs[ch]; ok {
			delete(c.subs, ch)
			close(ch)
		}
		c.subsMu.Unlock()
	}
	return ch, cancel
}

func (c *Cache) notifySubscribers() {
	c.subsMu.Lock()
	defer c.subsMu.Unlock()
	for ch := range c.subs {
		select {
		case ch <- struct{}{}:
		default: // 아직 이전 신호를 못 읽었으면 건너뜀 — 어차피 다음 신호가 최신 상태를 담고 있음
		}
	}
}
