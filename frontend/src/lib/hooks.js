'use client';

import { useEffect, useState } from 'react';

// useNow returns a millisecond timestamp that updates every second, or null
// until the first client tick. It starts null so server and hydration render
// the same thing (calling Date.now() during render mismatches).
export function useNow() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// useFooterVisible reports whether the page footer is on screen — used to
// hide the fixed cache badge so it doesn't cover the footer at full scroll.
export function useFooterVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  return visible;
}

// usePersistentSet is a string set backed by localStorage under `key`. It's
// read after mount (browser-only) to avoid a hydration mismatch, and every
// write is mirrored back. Returns [items, toggle].
export function usePersistentSet(key) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // no stored value / unavailable — start empty
    }
  }, [key]);

  const toggle = (value) => {
    setItems((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // still works for this session
      }
      return next;
    });
  };

  return [items, toggle];
}
