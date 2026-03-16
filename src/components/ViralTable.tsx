"use client";

import { useState, useMemo } from "react";
import { GraduatedCoin } from "@/lib/pumpApi";
import { usePaidStatus } from "@/lib/usePaidStatus";
import MiniChart from "./MiniChart";
import TwitterHoverCard from "./TwitterHoverCard";
import { useKolLabels } from "@/lib/useKolLabels";

type SortField = "rank" | "marketCap" | "volume" | "transactions" | "numHolders" | "creationTime" | "graduationDate";
type SortDir = "asc" | "desc";
type TrendingTimeframe = "5m" | "1h" | "6h" | "24h";

function formatUsd(num: number): string {
  if (!num) return "—";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatCompact(num: number): string {
  if (!num) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatAge(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Score coins for trending rank per timeframe
// Weights recency vs volume/txns differently per timeframe
function computeTrendingScores(coins: GraduatedCoin[], timeframe: TrendingTimeframe): Map<string, number> {
  const now = Date.now();
  const tfMs: Record<TrendingTimeframe, number> = {
    "5m": 5 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };
  const window = tfMs[timeframe];

  // Weight: how much recency matters vs raw volume
  const recencyWeight: Record<TrendingTimeframe, number> = {
    "5m": 0.8,
    "1h": 0.5,
    "6h": 0.3,
    "24h": 0.1,
  };
  const rw = recencyWeight[timeframe];

  // Normalize values
  const maxVol = Math.max(...coins.map((c) => c.volume || 1), 1);
  const maxTxns = Math.max(...coins.map((c) => c.transactions || 1), 1);

  const scores = new Map<string, number>();
  for (const coin of coins) {
    // Recency: how recently the coin graduated relative to the timeframe window
    const age = now - (coin.graduationDate || coin.creationTime || now);
    const recency = Math.max(0, 1 - age / window);

    // Activity score from volume + txns
    const volScore = (coin.volume || 0) / maxVol;
    const txnScore = (coin.transactions || 0) / maxTxns;
    const activityScore = volScore * 0.6 + txnScore * 0.4;

    const total = rw * recency + (1 - rw) * activityScore;
    scores.set(coin.coinMint, total);
  }
  return scores;
}

function RankBadge({ rank }: { rank: number }) {
  let color = "text-muted";
  let bg = "";
  if (rank <= 3) { color = "text-green"; bg = "bg-green-dim"; }
  else if (rank <= 10) { color = "text-accent"; bg = "bg-accent-dim"; }
  else if (rank <= 25) { color = "text-foreground-secondary"; bg = "bg-surface"; }

  return (
    <span className={`inline-flex items-center justify-center w-7 text-center text-[11px] font-mono font-bold rounded-md px-1 py-0.5 ${color} ${bg}`}>
      {rank}
    </span>
  );
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

export default function ViralTable({ coins, onSelectCoin, isWatched, onToggleWatch }: { coins: GraduatedCoin[]; onSelectCoin?: (coin: GraduatedCoin) => void; isWatched?: (mint: string) => boolean; onToggleWatch?: (mint: string) => void }) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeTimeframe, setActiveTimeframe] = useState<TrendingTimeframe>("1h");
  const kolMap = useKolLabels();
  const mintList = useMemo(() => coins.map((c) => c.coinMint), [coins]);
  const paidMap = usePaidStatus(mintList);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Compute trending scores and rank for the active timeframe
  const trendingScores = computeTrendingScores(coins, activeTimeframe);
  const rankedMints = [...trendingScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([mint]) => mint);
  const trendingRankMap = new Map(rankedMints.map((mint, i) => [mint, i + 1]));

  const indexed = coins.map((c, i) => ({
    coin: c,
    rank: i + 1,
    trendingRank: trendingRankMap.get(c.coinMint) || i + 1,
  }));

  const sorted = [...indexed].sort((a, b) => {
    if (sortField === "rank") {
      // Sort by trending rank when sorting by #
      return sortDir === "asc" ? a.trendingRank - b.trendingRank : b.trendingRank - a.trendingRank;
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
            <SortHeader label="MCap" field="marketCap" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="left" />
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">Token</th>

            {/* Trending rank columns */}
            <th className="px-2 py-3 text-center">
              <div className="flex items-center justify-center gap-0.5 bg-surface rounded-lg p-0.5 mx-auto w-fit">
                {(["5m", "1h", "6h", "24h"] as TrendingTimeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-all ${
                      activeTimeframe === tf ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </th>

            <SortHeader label="Volume" field="volume" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="TXNs" field="transactions" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            <SortHeader label="Holders" field="numHolders" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            <SortHeader label="Graduated" field="graduationDate" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Paid</th>
            <th className="hidden md:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Socials</th>
            <th className="hidden sm:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Chart</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ coin, rank, trendingRank }, index) => {
            const isKol = coin.numKolsTraded > 0;
            const isMayhem = coin.isMayhemMode;

            return (
              <tr
                key={coin.coinMint}
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
                    {formatUsd(coin.marketCap)}
                  </span>
                </td>

                {/* Token info */}
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {coin.imageUrl ? (
                        <img src={coin.imageUrl} alt={coin.ticker} className="w-20 h-20 rounded-full object-cover bg-surface" />
                      ) : (
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-base font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #9945ff88, #9945ff33)" }}>
                          {coin.ticker?.slice(0, 2) || "??"}
                        </div>
                      )}
                      {isKol && (
                        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 border-2 border-background flex items-center justify-center" title={`${coin.numKolsTraded} KOL${coin.numKolsTraded > 1 ? "s" : ""} traded`}>
                          <span className="text-[7px] font-black text-black leading-none">{coin.numKolsTraded}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {onToggleWatch && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleWatch(coin.coinMint); }}
                            className="shrink-0 hover:scale-110 transition-transform"
                            title={isWatched?.(coin.coinMint) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWatched?.(coin.coinMint) ? "#facc15" : "none"} stroke={isWatched?.(coin.coinMint) ? "#facc15" : "#6b7280"} strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        )}
                        <span className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors truncate max-w-[130px]" title={coin.ticker || "???"}>
                          {coin.ticker || "???"}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-accent-dim text-accent">
                          VIRAL
                        </span>
                        {isMayhem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-red-dim text-red">
                            MAYHEM
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted truncate max-w-[150px] block mt-0.5" title={coin.name || "Unknown"}>{coin.name || "Unknown"}</span>
                      {/* KOL profile pics */}
                      {isKol && kolMap.size > 0 && (() => {
                        const kolEntries = Array.from(kolMap.entries()).filter(([, v]) => v.pfp).slice(0, 3);
                        if (kolEntries.length === 0) return null;
                        return (
                          <div className="flex items-center mt-1 -space-x-1.5">
                            {kolEntries.map(([addr, kol]) => (
                              <img
                                key={addr}
                                src={kol.pfp}
                                alt={kol.name}
                                title={kol.name}
                                className="w-4 h-4 rounded-full border border-background object-cover"
                              />
                            ))}
                            {coin.numKolsTraded > kolEntries.length && (
                              <span className="text-[8px] text-yellow-400 font-bold ml-1.5">+{coin.numKolsTraded - kolEntries.length}</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </td>

                {/* Trending rank for selected timeframe */}
                <td className="px-2 py-3.5 text-center">
                  <RankBadge rank={trendingRank} />
                </td>

                {/* Volume */}
                <td className="px-3 py-3.5 text-right">
                  <span className="text-sm font-mono text-foreground-secondary">{formatUsd(coin.volume)}</span>
                </td>

                {/* TXNs */}
                <td className="hidden md:table-cell px-3 py-3.5 text-right">
                  <div className="text-sm font-mono text-foreground-secondary">{formatCompact(coin.transactions)}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] font-mono text-green">{formatCompact(coin.buyTransactions)}</span>
                    <span className="text-[10px] text-muted/30">/</span>
                    <span className="text-[10px] font-mono text-red">{formatCompact(coin.sellTransactions)}</span>
                  </div>
                </td>

                {/* Holders */}
                <td className="hidden sm:table-cell px-3 py-3.5 text-right">
                  <div className="text-sm font-mono text-foreground-secondary">{formatCompact(coin.numHolders)}</div>
                  {coin.devHoldingsPercentage > 0 && (
                    <div className="text-[10px] text-muted mt-0.5">Dev: {coin.devHoldingsPercentage.toFixed(1)}%</div>
                  )}
                </td>

                {/* Graduated */}
                <td className="hidden sm:table-cell px-3 py-3.5 text-right">
                  <span className="text-xs text-foreground-secondary font-mono">
                    {coin.graduationDate ? formatAge(coin.graduationDate) : "—"}
                  </span>
                </td>

                {/* Paid */}
                <td className="px-3 py-3.5 text-center">
                  {paidMap[coin.coinMint] ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#22c55e", backgroundColor: "#22c55e15" }}>PAID</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: "#f25461", backgroundColor: "#f2546115" }}>NOT PAID</span>
                  )}
                </td>

                {/* Socials */}
                <td className="hidden md:table-cell px-3 py-3.5">
                  <div className="flex items-center justify-center gap-1.5">
                    {coin.hasTwitter && (
                      <TwitterHoverCard
                        twitterUrl={coin.twitter}
                        tokenName={coin.name || coin.ticker}
                        tokenImage={coin.imageUrl}
                        age={coin.graduationDate ? formatAge(coin.graduationDate) : undefined}
                      >
                        <div className="w-5 h-5 rounded-full bg-surface flex items-center justify-center hover:bg-[#1d9bf0]/20 transition-colors" title="Twitter">
                          <svg className="w-2.5 h-2.5 text-foreground-secondary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </div>
                      </TwitterHoverCard>
                    )}
                    {coin.hasWebsite && (
                      <div className="w-4 h-4 rounded-full bg-surface flex items-center justify-center" title="Website">
                        <svg className="w-2.5 h-2.5 text-foreground-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
                        </svg>
                      </div>
                    )}
                    {coin.hasTelegram && (
                      <div className="w-4 h-4 rounded-full bg-surface flex items-center justify-center" title="Telegram">
                        <svg className="w-2.5 h-2.5 text-foreground-secondary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.02-.14-.05-.18-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                      </div>
                    )}
                    {!coin.hasSocial && <span className="text-[10px] text-muted">—</span>}
                  </div>
                </td>

                {/* Mini chart */}
                <td className="hidden sm:table-cell px-3 py-3.5 text-right">
                  <div className="flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                    <MiniChart seed={coin.coinMint} positive={coin.marketCap > (coin.allTimeHighMarketCap * 0.5)} />
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
