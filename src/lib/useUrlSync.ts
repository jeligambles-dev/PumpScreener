"use client";

import { useEffect, useRef } from "react";
import { Filters, defaultFilters } from "@/components/FilterPanel";
import { View } from "@/lib/useCoins";

const VALID_VIEWS: View[] = [
  "viral",
  "trending",
  "topMc",
  "newPairs",
  "losers",
  "kolActivity",
  "watchlist",
];

const BOOL_FILTER_KEYS = (Object.keys(defaultFilters) as (keyof Filters)[]).filter(
  (k) => typeof defaultFilters[k] === "boolean"
);
const STRING_FILTER_KEYS = (Object.keys(defaultFilters) as (keyof Filters)[]).filter(
  (k) => typeof defaultFilters[k] === "string"
);

// ---------------------------------------------------------------------------
// Read URL → initial state
// ---------------------------------------------------------------------------

export function readUrlState(): {
  view: View | null;
  filters: Partial<Filters> | null;
} {
  if (typeof window === "undefined") return { view: null, filters: null };

  const params = new URLSearchParams(window.location.search);

  // View
  const rawView = params.get("view");
  const view =
    rawView && VALID_VIEWS.includes(rawView as View)
      ? (rawView as View)
      : null;

  // Filters
  let hasFilter = false;
  const filters: Partial<Filters> = {};

  for (const key of BOOL_FILTER_KEYS) {
    const val = params.get(key);
    if (val !== null) {
      (filters as Record<string, boolean>)[key] = val === "1";
      hasFilter = true;
    }
  }

  for (const key of STRING_FILTER_KEYS) {
    const val = params.get(key);
    if (val !== null) {
      (filters as Record<string, string>)[key] = val;
      hasFilter = true;
    }
  }

  return { view, filters: hasFilter ? filters : null };
}

// ---------------------------------------------------------------------------
// Write state → URL  (replaceState, no history spam)
// ---------------------------------------------------------------------------

function writeUrl(view: View, filters: Filters) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();

  if (view !== "viral") {
    params.set("view", view);
  }

  for (const key of BOOL_FILTER_KEYS) {
    const val = filters[key];
    if (val === true) {
      params.set(key, "1");
    }
  }

  for (const key of STRING_FILTER_KEYS) {
    const val = filters[key];
    if (typeof val === "string" && val !== "") {
      params.set(key, val);
    }
  }

  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

  if (newUrl !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, "", newUrl);
  }
}

// ---------------------------------------------------------------------------
// Hook: keep URL in sync whenever view or filters change
// ---------------------------------------------------------------------------

export function useUrlSync(view: View, filters: Filters) {
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    writeUrl(view, filters);
  }, [view, filters]);
}
