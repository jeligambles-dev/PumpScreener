"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePaidStatus } from "@/lib/usePaidStatus";
import TwitterHoverCard from "./TwitterHoverCard";

interface KolTrade {
  kol: string;
  kolTwitter: string;
  kolPfp: string;
  type: "buy" | "sell";
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  tokenImage: string;
  amountSOL: number;
  amountUSD: number;
  timestamp: number;
  signature: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function KolTable({ onSelectToken, isWatched, onToggleWatch }: { onSelectToken?: (mint: string) => void; isWatched?: (mint: string) => boolean; onToggleWatch?: (mint: string) => void }) {
  const [trades, setTrades] = useState<KolTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [solPrice, setSolPrice] = useState<number>(0);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/kol-activity");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setTrades(data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  useEffect(() => {
    async function fetchSol() {
      try {
        const res = await fetch("/api/sol-price");
        if (!res.ok) return;
        const data = await res.json();
        if (data.price) setSolPrice(data.price);
      } catch {}
    }
    fetchSol();
  }, []);

  const filtered = filter === "all" ? trades : trades.filter((t) => t.type === filter);
  const mintList = useMemo(() => [...new Set(trades.map((t) => t.tokenMint).filter(Boolean))], [trades]);
  const paidMap = usePaidStatus(mintList);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading KOL activity...</p>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground-secondary">No KOL activity found</p>
          <p className="text-xs text-muted mt-1">Check back later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 lg:px-6 py-2 border-b border-border">
        {(["all", "buy", "sell"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              filter === f
                ? f === "buy"
                  ? "bg-green/10 text-green"
                  : f === "sell"
                    ? "bg-red/10 text-red"
                    : "bg-accent-dim text-accent"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            {f === "all" ? "All" : f === "buy" ? "Buys" : "Sells"}
            <span className="ml-1 opacity-60">
              {f === "all" ? trades.length : trades.filter((t) => t.type === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Activity feed */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="text-[10px] text-muted uppercase tracking-wider">
              <th className="text-left px-4 lg:px-6 py-2 font-semibold">KOL</th>
              <th className="text-left px-2 py-2 font-semibold">Action</th>
              <th className="text-left px-2 py-2 font-semibold">Token</th>
              <th className="text-right px-2 py-2 font-semibold">Amount</th>
              <th className="text-center px-2 py-2 font-semibold">Paid</th>
              <th className="text-right px-4 lg:px-6 py-2 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((trade, i) => (
              <tr
                key={`${trade.signature}-${i}`}
                className="border-t border-border hover:bg-card-hover/50 transition-colors cursor-pointer group"
                onClick={() => {
                  if (trade.signature) {
                    window.open(`https://solscan.io/tx/${trade.signature}`, "_blank");
                  }
                }}
              >
                {/* KOL */}
                <td className="px-4 lg:px-6 py-3">
                  <div className="flex items-center gap-2.5">
                    {trade.kolPfp ? (
                      <img
                        src={trade.kolPfp}
                        alt={trade.kol}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center text-[11px] font-bold text-accent shrink-0">
                        {trade.kol.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate" title={trade.kol}>{trade.kol}</span>
                        {trade.kolTwitter && (
                          <TwitterHoverCard twitterUrl={trade.kolTwitter} tokenName={trade.kol} tokenImage={trade.kolPfp} isProfile>
                            <a
                              href={trade.kolTwitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-accent transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </a>
                          </TwitterHoverCard>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Action */}
                <td className="px-2 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                      trade.type === "buy"
                        ? "bg-green/10 text-green"
                        : "bg-red/10 text-red"
                    }`}
                  >
                    {trade.type === "buy" ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                    {trade.type === "buy" ? "BUY" : "SELL"}
                  </span>
                </td>

                {/* Token */}
                <td className="px-2 py-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (trade.tokenMint && onSelectToken) onSelectToken(trade.tokenMint);
                    }}
                  >
                    {trade.tokenImage ? (
                      <img
                        src={trade.tokenImage}
                        alt={trade.tokenSymbol}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-[9px] font-bold text-muted shrink-0">
                        {trade.tokenSymbol?.slice(0, 3)}
                      </div>
                    )}
                    {onToggleWatch && trade.tokenMint && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleWatch(trade.tokenMint); }}
                        className="shrink-0 hover:scale-110 transition-transform"
                        title={isWatched?.(trade.tokenMint) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isWatched?.(trade.tokenMint) ? "#facc15" : "none"} stroke={isWatched?.(trade.tokenMint) ? "#facc15" : "#6b7280"} strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate max-w-[120px]" title={trade.tokenSymbol || "???"}>
                        {trade.tokenSymbol || "???"}
                      </div>
                      {trade.tokenName && (
                        <div className="text-[10px] text-muted truncate max-w-[120px]" title={trade.tokenName}>{trade.tokenName}</div>
                      )}
                      <div className="text-[9px] text-muted/60 font-mono truncate max-w-[100px]">
                        {trade.tokenMint ? `${trade.tokenMint.slice(0, 4)}...${trade.tokenMint.slice(-4)}` : ""}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Amount */}
                <td className="px-2 py-3 text-right">
                  <div className="text-sm font-mono font-semibold text-foreground">
                    {trade.amountSOL.toFixed(2)} SOL
                  </div>
                  {solPrice > 0 && (
                    <div className="text-[10px] text-muted font-mono">
                      ${(trade.amountSOL * solPrice).toFixed(0)}
                    </div>
                  )}
                </td>

                {/* Paid */}
                <td className="px-2 py-3 text-center">
                  {paidMap[trade.tokenMint] ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#22c55e", backgroundColor: "#22c55e15" }}>PAID</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#f25461", backgroundColor: "#f2546115" }}>NOT PAID</span>
                  )}
                </td>

                {/* Time */}
                <td className="px-4 lg:px-6 py-3 text-right">
                  <span className="text-xs text-muted">{timeAgo(trade.timestamp)}</span>
                  <div className="text-[10px] text-muted/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    View tx →
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
