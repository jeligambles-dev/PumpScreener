"use client";

import { useState, useEffect, useCallback } from "react";
import { PumpCoin, GraduatedCoin } from "./pumpApi";

export type View = "viral" | "trending" | "topMc" | "newPairs" | "losers" | "kolActivity" | "watchlist";

const viewToSort: Record<Exclude<View, "viral" | "kolActivity" | "watchlist">, { sort: string; order: string }> = {
  trending: { sort: "bump_order", order: "DESC" },
  topMc: { sort: "market_cap", order: "DESC" },
  newPairs: { sort: "created_timestamp", order: "DESC" },
  losers: { sort: "last_trade_timestamp", order: "DESC" },
};

export function useCoins(view: View, searchQuery: string) {
  const [coins, setCoins] = useState<PumpCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoins = useCallback(async () => {
    if (view === "viral" || view === "kolActivity" || view === "watchlist") return; // handled separately
    setLoading(true);
    setError(null);

    try {
      const { sort, order } = viewToSort[view];
      const params = new URLSearchParams({
        sort,
        order,
        limit: "50",
        offset: "0",
        includeNsfw: "false",
      });

      if (searchQuery) {
        params.set("searchTerm", searchQuery);
      }

      const res = await fetch(`/api/coins?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      setCoins(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }, [view, searchQuery]);

  useEffect(() => {
    if (view === "viral" || view === "kolActivity" || view === "watchlist") return;
    fetchCoins();
    const interval = setInterval(fetchCoins, 15000);
    return () => clearInterval(interval);
  }, [fetchCoins, view]);

  return { coins, loading, error, refetch: fetchCoins };
}

export function useGraduated(active: boolean) {
  const [coins, setCoins] = useState<GraduatedCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraduated = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/graduated");
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      if (data && Array.isArray(data.coins)) {
        setCoins(data.coins);
      } else {
        setCoins([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch graduated");
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    fetchGraduated();
    const interval = setInterval(fetchGraduated, 15000);
    return () => clearInterval(interval);
  }, [fetchGraduated, active]);

  return { coins, loading, error, refetch: fetchGraduated };
}

const THRONE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export function useKing() {
  const [king, setKing] = useState<PumpCoin | null>(null);
  const [nextKing, setNextKing] = useState<PumpCoin | null>(null);
  const [throneStart, setThroneStart] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);

  // Fetch candidates from API
  useEffect(() => {
    async function fetchKing() {
      try {
        const res = await fetch("/api/king");
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.king && data.king.mint) {
          // Store as next king — don't replace current king mid-reign
          setNextKing(data.king);
          // If no current king yet, set immediately
          setKing((prev) => {
            if (!prev) {
              setThroneStart(Date.now());
              return data.king;
            }
            return prev;
          });
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchKing();
    const interval = setInterval(fetchKing, 10000);
    return () => clearInterval(interval);
  }, []);

  // Rotate king when 3 minutes expire
  useEffect(() => {
    if (!king) return;

    const remaining = THRONE_DURATION_MS - (Date.now() - throneStart);
    if (remaining <= 0) {
      // Time's up — swap in next king if available
      if (nextKing && nextKing.mint !== king.mint) {
        setKing(nextKing);
      }
      setThroneStart(Date.now());
      return;
    }

    const timer = setTimeout(() => {
      if (nextKing && nextKing.mint !== king.mint) {
        setKing(nextKing);
      }
      setThroneStart(Date.now());
    }, remaining);

    return () => clearTimeout(timer);
  }, [king, nextKing, throneStart]);

  return { king, loading, throneStart };
}
