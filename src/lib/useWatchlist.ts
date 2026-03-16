"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "watchlist";

function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const persist = useCallback((next: string[]) => {
    setWatchlist(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full or unavailable
    }
  }, []);

  const isWatched = useCallback(
    (mint: string) => watchlist.includes(mint),
    [watchlist]
  );

  const toggle = useCallback(
    (mint: string) => {
      const next = watchlist.includes(mint)
        ? watchlist.filter((m) => m !== mint)
        : [...watchlist, mint];
      persist(next);
    },
    [watchlist, persist]
  );

  return { watchlist, isWatched, toggle };
}
