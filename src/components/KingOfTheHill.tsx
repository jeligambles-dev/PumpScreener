"use client";

import { useState, useEffect } from "react";
import { useKing } from "@/lib/useCoins";
import { formatAge } from "@/lib/pumpApi";

function formatUsd(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const THRONE_DURATION = 3 * 60; // 3 minutes in seconds

export default function KingOfTheHill({ onSelectCoin }: { onSelectCoin?: (coin: import("@/lib/pumpApi").PumpCoin) => void }) {
  const { king, loading, throneStart } = useKing();
  const [remaining, setRemaining] = useState(THRONE_DURATION);

  useEffect(() => {
    if (!king) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - throneStart) / 1000);
      setRemaining(Math.max(0, THRONE_DURATION - elapsed));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [king, throneStart]);

  if (loading && !king) {
    return (
      <div>
        <div className="rounded-xl border border-border bg-surface/30 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-surface rounded animate-pulse" />
            <div className="h-4 w-32 bg-surface rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!king) return null;

  const age = formatAge(king.created_timestamp);
  const urgency = remaining <= 30;

  return (
    <div>
      <div
        className="relative rounded-xl border overflow-hidden cursor-pointer hover:border-yellow-500/40 transition-colors"
        style={{
          borderColor: "rgba(234,179,8,0.2)",
          background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03), transparent)",
        }}
        onClick={() => onSelectCoin?.(king)}
      >
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Crown + avatar */}
          <div className="relative shrink-0">
            {king.image_uri ? (
              <img src={king.image_uri} alt={king.symbol} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "linear-gradient(135deg, #eab308, #f59e0b)" }}>
                👑
              </div>
            )}
            <div className="absolute -top-1.5 -left-1.5 text-sm">👑</div>
          </div>

          {/* King info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#eab308" }}>
                King of the Hill
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-foreground">{king.symbol}</span>
              <span className="text-xs text-muted truncate max-w-[120px]">{king.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                style={{ color: "#9945ff", borderColor: "#9945ff33", backgroundColor: "#9945ff11" }}>
                SOL
              </span>
            </div>
          </div>

          {/* Market Cap */}
          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-semibold">{formatUsd(king.usd_market_cap)}</div>
            <div className="text-[10px] text-muted">Market Cap</div>
          </div>

          {/* Age */}
          <div className="text-right shrink-0 hidden sm:block">
            <div className="text-xs text-foreground-secondary font-mono">{age}</div>
            <div className="text-[10px] text-muted">Age</div>
          </div>

          {/* Replies */}
          <div className="text-right shrink-0 hidden sm:block">
            <div className="text-xs text-foreground-secondary font-mono">{king.reply_count}</div>
            <div className="text-[10px] text-muted">Replies</div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border shrink-0" />

          {/* Countdown timer */}
          <div className="text-center shrink-0">
            <div
              className={`font-mono text-lg font-bold transition-colors ${urgency ? "text-red" : "text-foreground"}`}
              style={urgency ? { animation: "pulse 1s infinite" } : undefined}
            >
              {formatTime(remaining)}
            </div>
            <div className="text-[9px] text-muted uppercase tracking-wider">
              {remaining === 0 ? "Dethroning..." : "Dethrone In"}
            </div>
          </div>
        </div>

        {/* Progress bar showing time remaining */}
        <div className="h-0.5 bg-border/30">
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${(remaining / THRONE_DURATION) * 100}%`,
              background: urgency
                ? "linear-gradient(90deg, #ef4444, #f97316)"
                : "linear-gradient(90deg, #eab308, #f59e0b, transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
