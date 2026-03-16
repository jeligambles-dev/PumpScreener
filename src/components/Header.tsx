"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PumpCoin } from "@/lib/pumpApi";

function formatMcap(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export default function Header({
  searchQuery,
  onSearch,
  onEnhanceToken,
  onBannerResize,
  onTheme,
  onSelectCoin,
  onSelectByMint,
}: {
  searchQuery: string;
  onSearch: (query: string) => void;
  onEnhanceToken: () => void;
  onBannerResize: () => void;
  onTheme: () => void;
  onSelectCoin: (coin: PumpCoin) => void;
  onSelectByMint: (mint: string) => void;
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<PumpCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [clipboardCA, setClipboardCA] = useState("");
  const [clipboardCoin, setClipboardCoin] = useState<{ symbol: string; name: string; image: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastClipboardCA = useRef("");

  // Check clipboard for a Solana CA on focus/visibility
  const checkClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
        setClipboardCA(trimmed);
        // Fetch token info if it's a new CA
        if (trimmed !== lastClipboardCA.current) {
          lastClipboardCA.current = trimmed;
          setClipboardCoin(null);
          try {
            const res = await fetch(`/api/token-metadata?mint=${trimmed}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.symbol || data?.name) {
                setClipboardCoin({ symbol: data.symbol || "", name: data.name || "", image: data.image || "" });
              }
            }
          } catch { /* ignore */ }
        }
      } else {
        setClipboardCA("");
        setClipboardCoin(null);
        lastClipboardCA.current = "";
      }
    } catch {
      // Clipboard permission denied
    }
  }, []);

  useEffect(() => {
    checkClipboard();
    const onFocus = () => checkClipboard();
    window.addEventListener("focus", onFocus);
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkClipboard();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkClipboard]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(coin: PumpCoin) {
    setShowDropdown(false);
    onSearch("");
    onSelectCoin(coin);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border glass">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white"
              style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}>
              PS
            </div>
            <div className="absolute -inset-1 rounded-xl opacity-30 blur-sm"
              style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }} />
          </div>
          <span className="text-base font-bold tracking-tight hidden sm:block gradient-text">
            PumpScreener
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-4 flex items-center gap-2" ref={dropdownRef}>
          <div className={`relative flex-1 min-w-0 transition-all duration-300 ${searchFocused ? "scale-[1.02]" : ""}`}>
            <svg
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                searchFocused ? "text-accent" : "text-muted"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tokens by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              onBlur={() => setSearchFocused(false)}
              className={`w-full bg-surface border rounded-xl pl-10 pr-14 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none transition-all duration-200 ${
                searchFocused ? "border-accent/50 glow-accent" : "border-border hover:border-border-bright"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {loading ? (
                <div className="w-3.5 h-3.5 border border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <kbd className="text-[10px] text-muted/50 bg-background/50 px-1.5 py-0.5 rounded-md border border-border font-mono hidden sm:inline">
                  /
                </kbd>
              )}
            </div>

            {/* Predictive dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border-bright rounded-xl shadow-2xl overflow-hidden z-[60]">
                {suggestions.map((coin, i) => (
                  <button
                    key={coin.mint}
                    onMouseDown={() => handleSelect(coin)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-card-hover transition-colors ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    {coin.image_uri ? (
                      <img src={coin.image_uri} alt={coin.symbol} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                        {coin.symbol?.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{coin.symbol}</span>
                        <span className="text-xs text-muted truncate">{coin.name}</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono truncate">{coin.mint}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-semibold text-foreground">{formatMcap(coin.usd_market_cap)}</div>
                      <div className="text-[10px] text-muted">MCap</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showDropdown && suggestions.length === 0 && searchQuery.length >= 2 && !loading && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border-bright rounded-xl shadow-2xl overflow-hidden z-[60] p-4 text-center">
                <p className="text-xs text-muted">No tokens found for &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>

          {/* Clipboard CA pill */}
          {clipboardCA && !searchQuery && (
            <button
              onClick={() => {
                onSelectByMint(clipboardCA);
                setClipboardCA("");
                setClipboardCoin(null);
              }}
              className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-accent/40 transition-all group"
              title={`Search: ${clipboardCA}`}
            >
              {clipboardCoin?.image ? (
                <img src={clipboardCoin.image} alt="" className="w-5 h-5 rounded-md object-cover shrink-0" />
              ) : (
                <svg className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
              <div className="text-left">
                {clipboardCoin ? (
                  <>
                    <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground transition-colors block leading-tight">
                      {clipboardCoin.symbol}
                    </span>
                    <span className="text-[9px] text-muted truncate block max-w-[80px] leading-tight">
                      {clipboardCoin.name}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-mono text-foreground-secondary group-hover:text-foreground transition-colors">
                    {clipboardCA.slice(0, 4)}...{clipboardCA.slice(-4)}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Theme button */}
          <button
            onClick={onTheme}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-border-bright transition-all"
            title="Theme settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>

          {/* Banner resize button */}
          <button
            onClick={onBannerResize}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all"
            title="Resize image to banner (1500x500)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Resize</span>
          </button>

          {/* Enhance token button */}
          <button
            onClick={onEnhanceToken}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Enhance</span>
          </button>

          {/* Solana badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <linearGradient id="sol-h" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -25)"><stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
              <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol-h)"/>
              <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol-h)"/>
              <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol-h)"/>
            </svg>
            <span className="text-sm font-medium text-foreground-secondary">Solana</span>
          </div>
        </div>
      </div>
    </header>
  );
}
