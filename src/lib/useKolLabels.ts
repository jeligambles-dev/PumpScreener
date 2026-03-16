"use client";

import { useState, useEffect } from "react";

export interface KolInfo {
  name: string;
  twitter: string;
  pfp: string;
}

// Shared singleton so all components use the same data
let globalKolMap: Map<string, KolInfo> | null = null;
let fetchPromise: Promise<void> | null = null;

async function loadKols() {
  if (globalKolMap) return;
  try {
    const res = await fetch("/api/kol-wallets");
    if (!res.ok) return;
    const data = await res.json();
    const map = new Map<string, KolInfo>();
    for (const entry of data) {
      // Derive avatar from Twitter handle if pfp is empty
      let pfp = entry.pfp || "";
      if (!pfp && entry.twitter) {
        const handle = entry.twitter.replace(/^https?:\/\/(x\.com|twitter\.com)\//, "").replace(/\/.*$/, "");
        if (handle) {
          pfp = `https://unavatar.io/twitter/${handle}`;
        }
      }
      map.set(entry.address, {
        name: entry.name,
        twitter: entry.twitter,
        pfp,
      });
    }
    globalKolMap = map;
  } catch {
    // Silently fail
  }
}

export function useKolLabels(): Map<string, KolInfo> {
  const [, setReady] = useState(false);

  useEffect(() => {
    if (globalKolMap) {
      setReady(true);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = loadKols();
    }
    fetchPromise.then(() => setReady(true));
  }, []);

  return globalKolMap || new Map();
}

export function getKolLabel(address: string): KolInfo | undefined {
  return globalKolMap?.get(address);
}
