"use client";

import { useState, useEffect, useRef } from "react";

type PaidMap = Record<string, boolean>;

export function usePaidStatus(mints: string[]): PaidMap {
  const [paidMap, setPaidMap] = useState<PaidMap>({});
  const prevKey = useRef("");

  useEffect(() => {
    const sorted = [...mints].sort();
    const key = sorted.join(",");
    if (!key || key === prevKey.current) return;
    prevKey.current = key;

    async function fetchBatch() {
      try {
        const res = await fetch(`/api/paid-status?mints=${encodeURIComponent(key)}`);
        if (!res.ok) return;
        const data = await res.json();
        const map: PaidMap = {};
        for (const mint of sorted) {
          map[mint] = data[mint]?.isPaid ?? false;
        }
        setPaidMap(map);
      } catch {}
    }

    fetchBatch();
  }, [mints]);

  return paidMap;
}
