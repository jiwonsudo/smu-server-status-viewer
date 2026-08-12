// Package statuscache keeps the latest CheckServiceStatus result for each
// monitored site in memory, refreshed on a fixed interval by a background
// goroutine — instead of hitting the SMU site live on every HTTP request.
//
// Without this, each visitor's page load (and each 60s client poll) used to
// trigger a fresh outbound check per site, so backend↔SMU traffic scaled
// with visitor count. With the cache, SMU traffic is constant (one check
// per site per interval) no matter how many people are looking at the page,
// and /status/* responses become near-instant in-memory reads.
package statuscache

import (
	"context"
	"sync"
	"time"

	"smu-server-status-viewer/backend/internal/statuschecker"
)

type Cache struct {
	mu      sync.RWMutex
	results map[string]statuschecker.Result
}

// New starts the cache: it fills every key with a real check before
// returning (so the first requests after boot aren't empty), then keeps
// refreshing all of them every interval in the background.
func New(interval time.Duration, urls map[string]string) *Cache {
	c := &Cache{results: make(map[string]statuschecker.Result, len(urls))}
	c.refreshAll(urls)
	go c.loop(interval, urls)
	return c
}

func (c *Cache) loop(interval time.Duration, urls map[string]string) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		c.refreshAll(urls)
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
}

func (c *Cache) Get(key string) (statuschecker.Result, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	result, ok := c.results[key]
	return result, ok
}
