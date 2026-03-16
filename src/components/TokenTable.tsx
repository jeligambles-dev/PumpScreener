"use client";

import { useState, useMemo } from "react";
import { PumpCoin, derivePriceSOL, formatAge } from "@/lib/pumpApi";
import { calculateRiskScore } from "@/lib/riskScore";
import { usePaidStatus } from "@/lib/usePaidStatus";
import MiniChart from "./MiniChart";
import TwitterHoverCard from "./TwitterHoverCard";

type SortField = "rank" | "usd_market_cap" | "created_timestamp" | "last_trade_timestamp" | "reply_count" | "real_sol_reserves";
type SortDir = "asc" | "desc";

function formatUsd(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatSol(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K SOL`;
  return `${sol.toFixed(1)} SOL`;
}

function formatPrice(price: number): string {
  if (price === 0) return "$0";
  if (price < 0.00000001) return `$${price.toExponential(2)}`;
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  align = "right",
  className = "",
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <th
      className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap select-none ${
        align === "left" ? "text-left" : "text-right"
      } ${isActive ? "text-accent" : "text-muted hover:text-foreground-secondary"} ${className}`}
      onClick={() => onSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        {isActive && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            {currentDir === "asc" ? (
              <path d="M5.293 9.707l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 7.414l-3.293 3.293a1 1 0 01-1.414-1.414z" />
            ) : (
              <path d="M14.707 10.293l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 12.586l3.293-3.293a1 1 0 111.414 1.414z" />
            )}
          </svg>
        )}
      </span>
    </th>
  );
}

export default function TokenTable({ coins, onSelectCoin, isWatched, onToggleWatch }: { coins: PumpCoin[]; onSelectCoin?: (coin: PumpCoin) => void; isWatched?: (mint: string) => boolean; onToggleWatch?: (mint: string) => void }) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const mintList = useMemo(() => coins.map((c) => c.mint), [coins]);
  const paidMap = usePaidStatus(mintList);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const indexed = coins.map((c, i) => ({ coin: c, rank: i + 1 }));

  const sorted = [...indexed].sort((a, b) => {
    if (sortField === "rank") {
      return sortDir === "asc" ? a.rank - b.rank : b.rank - a.rank;
    }
    const aVal = (a.coin[sortField] as number) || 0;
    const bVal = (b.coin[sortField] as number) || 0;
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            <SortHeader label="#" field="rank" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Market Cap" field="usd_market_cap" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="left" />
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">Token</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Price</th>
            <SortHeader label="Liquidity" field="real_sol_reserves" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            <SortHeader label="Age" field="created_timestamp" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Replies" field="reply_count" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            <SortHeader label="Last Trade" field="last_trade_timestamp" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            <th className="hidden md:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Socials</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Status</th>
            <th className="hidden sm:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Chart</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ coin, rank }, index) => {
            const priceSOL = derivePriceSOL(coin);
            const age = formatAge(coin.created_timestamp);
            const isNew = Date.now() - coin.created_timestamp < 3600000; // < 1 hour
            const isGraduated = coin.complete;
            const isLive = coin.is_currently_live;

            return (
              <tr
                key={coin.mint}
                className="border-b border-border/30 hover:bg-card-hover transition-all duration-150 cursor-pointer group row-animate"
                style={{ animationDelay: `${index * 15}ms` }}
                onClick={() => onSelectCoin?.(coin)}
              >
                {/* Rank */}
                <td className="px-3 py-3.5">
                  <span className="text-xs font-mono text-muted">{rank}</span>
                </td>

                {/* Market Cap */}
                <td className="px-3 py-3.5">
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {coin.usd_market_cap ? formatUsd(coin.usd_market_cap) : "—"}
                  </span>
                </td>

                {/* Token info */}
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {coin.image_uri ? (
                        <img
                          src={coin.image_uri}
                          alt={coin.symbol}
                          className="w-20 h-20 rounded-full object-cover bg-surface"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0 ${coin.image_uri ? "hidden" : ""}`}
                        style={{ background: "linear-gradient(135deg, #9945ff88, #9945ff33)" }}>
                        {coin.symbol?.slice(0, 2) || "??"}
                      </div>
                      {isLive && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red border-2 border-background live-dot" />
                      )}
                      {isNew && !isLive && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green border-2 border-background" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {onToggleWatch && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleWatch(coin.mint); }}
                            className="shrink-0 hover:scale-110 transition-transform"
                            title={isWatched?.(coin.mint) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWatched?.(coin.mint) ? "#facc15" : "none"} stroke={isWatched?.(coin.mint) ? "#facc15" : "#6b7280"} strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        )}
                        <span className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors truncate max-w-[140px]" title={coin.symbol || "???"}>
                          {coin.symbol || "???"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                          style={{ color: "#9945ff", borderColor: "#9945ff33", backgroundColor: "#9945ff11" }}>
                          SOL
                        </span>
                      </div>
                      <span className="text-xs text-muted truncate max-w-[160px] block mt-0.5" title={coin.name || "Unknown"}>{coin.name || "Unknown"}</span>
                    </div>
                  </div>
                </td>

                {/* Price */}
                <td className="px-3 py-3.5 text-right">
                  <span className="font-mono text-sm font-medium">
                    {coin.usd_market_cap && coin.total_supply
                      ? formatPrice(coin.usd_market_cap / (coin.total_supply / 1e6))
                      : priceSOL > 0 ? `${priceSOL.toExponential(2)} SOL` : "—"}
                  </span>
                </td>

                {/* Liquidity */}
                <td className="hidden sm:table-cell px-3 py-3.5 text-right">
                  <span className="text-sm font-mono text-foreground-secondary">
                    {coin.real_sol_reserves ? formatSol(coin.real_sol_reserves) : "—"}
                  </span>
                </td>

                {/* Age */}
                <td className="px-3 py-3.5 text-right">
                  <span className="text-sm font-mono text-foreground-secondary">{age}</span>
                </td>

                {/* Replies */}
                <td className="hidden md:table-cell px-3 py-3.5 text-right">
                  <span className="text-sm font-mono text-foreground-secondary">{coin.reply_count || 0}</span>
                </td>

                {/* Last Trade */}
                <td className="hidden sm:table-cell px-3 py-3.5 text-right">
                  <span className="text-xs text-muted">
                    {coin.last_trade_timestamp ? formatAge(coin.last_trade_timestamp) : "—"}
                  </span>
                </td>

                {/* Socials */}
                <td className="hidden md:table-cell px-3 py-3.5">
                  <div className="flex items-center justify-center gap-1.5">
                    {coin.twitter && (
                      <TwitterHoverCard
                        twitterUrl={coin.twitter}
                        tokenName={coin.name || coin.symbol}
                        tokenImage={coin.image_uri}
                        age={formatAge(coin.created_timestamp)}
                        tokenDescription={coin.description}
                      >
                        <div className="w-5 h-5 rounded-full bg-surface flex items-center justify-center hover:bg-[#1d9bf0]/20 transition-colors" title="Twitter">
                          <svg className="w-2.5 h-2.5 text-foreground-secondary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </div>
                      </TwitterHoverCard>
                    )}
                    {coin.website && (
                      <a href={coin.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded-full bg-surface flex items-center justify-center hover:bg-accent/20 transition-colors" title="Website">
                        <svg className="w-2.5 h-2.5 text-foreground-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
                        </svg>
                      </a>
                    )}
                    {coin.telegram && (
                      <a href={coin.telegram} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded-full bg-surface flex items-center justify-center hover:bg-accent/20 transition-colors" title="Telegram">
                        <svg className="w-2.5 h-2.5 text-foreground-secondary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.02-.14-.05-.18-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                      </a>
                    )}
                    {!coin.twitter && !coin.website && !coin.telegram && (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {isGraduated && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-accent-dim text-accent">GRAD</span>
                    )}
                    {isNew && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-green-dim text-green">NEW</span>
                    )}
                    {isLive && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-red-dim text-red">LIVE</span>
                    )}
                    {coin.is_cashback_enabled && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#22c55e", backgroundColor: "#22c55e15" }}>$</span>
                    )}
                    {coin.tokenized_agent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#a78bfa", backgroundColor: "#a78bfa15" }} title="Tokenized Agent">🤖</span>
                    )}
                    {paidMap[coin.mint] ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#22c55e", backgroundColor: "#22c55e15" }}>PAID</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#f25461", backgroundColor: "#f2546115" }}>NOT PAID</span>
                    )}
                    {(() => {
                      const risk = calculateRiskScore(coin);
                      return (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1"
                          style={{ color: risk.color, backgroundColor: risk.bgColor }}
                          title={`Rug-pull risk: ${risk.score}/100`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: risk.dotColor }} />
                          {risk.label}
                        </span>
                      );
                    })()}
                  </div>
                </td>

                {/* Mini chart */}
                <td className="hidden sm:table-cell px-3 py-3.5 text-right">
                  <div className="flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                    <MiniChart seed={coin.mint} positive={(coin.usd_market_cap ?? 0) > 5000} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
