// Package statuscache keeps the latest CheckServiceStatus result for each
// monitored site in memory, refreshed on a fixed interval by a background
// goroutine, so backend↔SMU traffic stays constant regardless of visitor
// count. Callers can Subscribe() to be notified when a refresh finishes.
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

// New starts the cache and returns immediately: the first check runs in the
// background goroutine, not inline. Until it lands (~1-2s) Get returns
// ok=false and callers fall back to their "pending" path.
func New(interval time.Duration, urls map[string]string) *Cache {
	c := &Cache{
		interval: interval,
		results:  make(map[string]statuschecker.Result, len(urls)),
		subs:     make(map[chan struct{}]struct{}),
	}
	go c.loop(interval, urls)
	return c
}

func (c *Cache) loop(interval time.Duration, urls map[string]string) {
	c.refreshAll(urls)
	c.notifySubscribers()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		c.refreshAll(urls)
		c.notifySubscribers()
	}
}

// refreshAll checks every site concurrently, so a cycle takes about as long
// as the single slowest site.
func (c *Cache) refreshAll(urls map[string]string) {
	var wg sync.WaitGroup
	for key, url := range urls {
		wg.Add(1)
		go func(key, url string) {
			defer wg.Done()
			// Slightly longer than statuschecker's own 10s client timeout so
			// this context doesn't mask the real timeout reason.
			ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
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

// NextUpdateAt estimates when the next background refresh will land.
func (c *Cache) NextUpdateAt() time.Time {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lastRefreshedAt.Add(c.interval)
}

// Subscribe registers a channel that receives a non-blocking signal every
// time a refresh cycle finishes. Call the returned cancel func when done.
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
		default: // previous signal not yet read — the next one carries the latest state
		}
	}
}
