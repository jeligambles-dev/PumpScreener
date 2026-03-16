"use client";

import { useState, useEffect } from "react";
import { PumpCoin, derivePriceSOL, formatAge } from "@/lib/pumpApi";
import { calculateRiskScore } from "@/lib/riskScore";
import PumpChart from "./PumpChart";
import CoinTabs from "./CoinTabs";
import TwitterHoverCard from "./TwitterHoverCard";
import WebsiteHoverCard from "./WebsiteHoverCard";

function formatUsd(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatSol(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K SOL`;
  return `${sol.toFixed(2)} SOL`;
}

function formatPrice(price: number): string {
  if (price === 0) return "$0";
  if (price < 0.00000001) return `$${price.toExponential(2)}`;
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function shortAddr(addr: string): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function TokenDetail({
  coin,
  onClose,
  isKing,
}: {
  coin: PumpCoin;
  onClose: () => void;
  isKing?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [devInfo, setDevInfo] = useState<{
    holdsTokens: boolean;
    tokenBalance: string;
    recentTxCount: number;
  } | null>(null);
  const [devInfoLoading, setDevInfoLoading] = useState(false);

  useEffect(() => {
    if (!coin.creator || !coin.mint) return;
    setDevInfoLoading(true);
    fetch(`/api/dev-info?creator=${encodeURIComponent(coin.creator)}&mint=${encodeURIComponent(coin.mint)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDevInfo(data);
      })
      .catch(() => {})
      .finally(() => setDevInfoLoading(false));
  }, [coin.creator, coin.mint]);

  const chainColor = "#9945ff";
  const priceSOL = derivePriceSOL(coin);
  const estimatedPrice = coin.usd_market_cap && coin.total_supply
    ? coin.usd_market_cap / (coin.total_supply / 1e6)
    : 0;

  const stats = [
    { label: "Market Cap", value: coin.usd_market_cap ? formatUsd(coin.usd_market_cap) : "—" },
    { label: "MC (SOL)", value: coin.market_cap ? `${coin.market_cap.toFixed(2)} SOL` : "—" },
    { label: "Liquidity", value: coin.real_sol_reserves ? formatSol(coin.real_sol_reserves) : "—" },
    { label: "Virtual Reserves", value: coin.virtual_sol_reserves ? formatSol(coin.virtual_sol_reserves) : "—" },
    { label: "Replies", value: String(coin.reply_count || 0) },
    { label: "Age", value: formatAge(coin.created_timestamp) },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[92vh] bg-background border border-border-bright rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in">
        {/* Banner */}
        <div className="relative w-full shrink-0 overflow-hidden" style={{ maxHeight: "220px" }}>
          <div className="w-full flex items-center justify-center"
            style={{
              aspectRatio: "1500 / 500",
              maxHeight: "220px",
              background: `linear-gradient(135deg, ${chainColor}18, ${chainColor}08 40%, rgba(9,9,11,0.95))`,
            }}>
            <div className="absolute top-8 left-1/4 w-60 h-60 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: chainColor }} />
            <div className="absolute bottom-0 right-1/3 w-80 h-40 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: chainColor }} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(9,9,11,0.8))]" />

            <div className="relative flex flex-col items-center gap-2 text-center">
              {coin.image_uri ? (
                <img src={coin.image_uri} alt={coin.symbol} className="w-20 h-20 rounded-2xl object-cover shadow-2xl" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${chainColor}, ${chainColor}88)` }}>
                  {coin.symbol?.slice(0, 2)}
                </div>
              )}
              <span className="text-xs text-muted/40 mt-1">1500 x 500 Banner</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />

          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-background/60 border border-border-bright flex items-center justify-center text-muted hover:text-foreground hover:bg-background transition-all z-10 backdrop-blur-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Token header */}
        <div className="relative -mt-10 px-6 pb-2 z-10 shrink-0">
          <div className="flex items-end gap-4">
            {coin.image_uri ? (
              <img src={coin.image_uri} alt={coin.symbol}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-background shadow-xl shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white border-2 border-background shadow-xl shrink-0"
                style={{ background: `linear-gradient(135deg, ${chainColor}, ${chainColor}88)` }}>
                {coin.symbol?.slice(0, 2)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-foreground">{coin.symbol}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border inline-flex items-center gap-1"
                  style={{ color: chainColor, borderColor: `${chainColor}44`, backgroundColor: `${chainColor}15` }}>
                  <svg className="w-2.5 h-2.5" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <linearGradient id="sol-td" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -25)"><stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
                    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol-td)"/>
                    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol-td)"/>
                    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol-td)"/>
                  </svg>
                  Solana
                </span>
                {isKing && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                    style={{ color: "#eab308", borderColor: "#eab30844", backgroundColor: "#eab30815", border: "1px solid #eab30844" }}>
                    <span>👑</span> King of the Hill
                  </span>
                )}
                {coin.complete && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-accent-dim text-accent">
                    Graduated
                  </span>
                )}
                {coin.is_currently_live && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-dim text-red flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red live-dot" />LIVE
                  </span>
                )}
                {coin.is_cashback_enabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                    style={{ color: "#22c55e", borderColor: "#22c55e44", backgroundColor: "#22c55e15", border: "1px solid #22c55e44" }}>
                    <span>$</span> Buyback
                  </span>
                )}
                {coin.tokenized_agent && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                    style={{ color: "#a78bfa", borderColor: "#a78bfa44", backgroundColor: "#a78bfa15", border: "1px solid #a78bfa44" }}>
                    <span>🤖</span> Tokenized Agent
                  </span>
                )}
                {(() => {
                  const risk = calculateRiskScore(coin);
                  return (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                      style={{ color: risk.color, borderColor: `${risk.color}44`, backgroundColor: risk.bgColor, border: `1px solid ${risk.color}44` }}
                      title={`Rug-pull risk score: ${risk.score}/100`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: risk.dotColor }} />
                      {risk.label} ({risk.score})
                    </span>
                  );
                })()}
              </div>
              <p className="text-sm text-foreground-secondary mt-0.5">{coin.name}</p>
            </div>
          </div>
        </div>

        {/* Social links bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border shrink-0 flex-wrap">
          {coin.twitter && (
            <TwitterHoverCard
              twitterUrl={coin.twitter}
              tokenName={coin.name || coin.symbol}
              tokenImage={coin.image_uri}
              tokenDescription={coin.description}
              age={formatAge(coin.created_timestamp)}
            >
              <a href={coin.twitter} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </a>
            </TwitterHoverCard>
          )}
          {coin.website && (
            <WebsiteHoverCard websiteUrl={coin.website}>
              <a href={coin.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </a>
            </WebsiteHoverCard>
          )}
          {coin.telegram && (
            <a href={coin.telegram} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              Telegram
            </a>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(coin.mint);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                copied
                  ? "border-green/40 text-green bg-green-dim"
                  : "border-border text-muted hover:text-foreground hover:border-border-bright"
              }`}>
              {copied ? "Copied!" : "Copy CA"}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row">
            {/* Chart section */}
            <div className="flex-1 p-4 lg:p-6 min-w-0">
              {/* Price header */}
              <div className="flex items-end gap-3 mb-4">
                <span className="text-3xl font-bold font-mono">
                  {estimatedPrice > 0 ? formatPrice(estimatedPrice) : `${priceSOL.toExponential(2)} SOL`}
                </span>
                {coin.usd_market_cap && (
                  <span className="text-sm text-muted mb-0.5">MC: {formatUsd(coin.usd_market_cap)}</span>
                )}
              </div>

              <PumpChart basePrice={estimatedPrice > 0 ? estimatedPrice : priceSOL * 130} baseMcap={coin.usd_market_cap || 10000} />

              {/* Description */}
              {coin.description && (
                <div className="mt-4 p-3 bg-surface rounded-xl border border-border">
                  <p className="text-xs text-foreground-secondary leading-relaxed">{coin.description}</p>
                </div>
              )}

              <CoinTabs mint={coin.mint} devAddress={coin.creator} />
            </div>

            {/* Stats sidebar */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border p-4 lg:p-5 shrink-0">
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">Token Info</h3>
              <div className="space-y-0.5">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between py-2.5 border-b border-border/30">
                    <span className="text-xs text-muted">{stat.label}</span>
                    <span className="text-sm font-mono font-medium text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Contract */}
              <div className="mt-5">
                <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">Contract</h3>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground-secondary">{shortAddr(coin.mint)}</span>
                    <button onClick={() => navigator.clipboard.writeText(coin.mint)}
                      className="text-muted hover:text-accent transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Creator */}
              <div className="mt-4">
                <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">Creator</h3>
                <div className="bg-background rounded-lg p-3 border border-border space-y-2.5">
                  <span className="text-xs font-mono text-foreground-secondary">{shortAddr(coin.creator)}</span>

                  {devInfoLoading && (
                    <div className="text-[11px] text-muted animate-pulse">Loading dev info...</div>
                  )}

                  {devInfo && (
                    <div className="space-y-2 pt-1 border-t border-border/30">
                      {/* Holds tokens indicator */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            devInfo.holdsTokens ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="text-xs text-foreground-secondary">
                          {devInfo.holdsTokens
                            ? `Holds tokens (${devInfo.tokenBalance})`
                            : "Sold all"}
                        </span>
                      </div>

                      {/* Recent transaction count */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {devInfo.recentTxCount} recent txns
                        </span>
                        {devInfo.recentTxCount > 50 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              color: "#f97316",
                              backgroundColor: "#f9731615",
                              border: "1px solid #f9731644",
                            }}
                          >
                            Serial deployer
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bonding Curve */}
              <div className="mt-4">
                <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">Bonding Curve</h3>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted">Status</span>
                    <span className={`text-xs font-semibold ${coin.complete ? "text-accent" : "text-green"}`}>
                      {coin.complete ? "Complete" : "Active"}
                    </span>
                  </div>
                  {!coin.complete && coin.virtual_sol_reserves && (
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div className="h-full rounded-full bg-green transition-all"
                        style={{ width: `${Math.min(100, (coin.real_sol_reserves / (85 * 1_000_000_000)) * 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
