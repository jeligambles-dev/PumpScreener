"use client";

import { Token, formatPrice } from "@/lib/mockData";

export default function TickerBar({ tokens }: { tokens: Token[] }) {
  const top = tokens.slice(0, 15);
  const items = [...top, ...top]; // duplicate for seamless scroll

  return (
    <div className="border-b border-border bg-surface/30 overflow-hidden">
      <div className="ticker-scroll flex items-center gap-6 py-1.5 px-4 w-max">
        {items.map((token, i) => (
          <div key={`${token.id}-${i}`} className="flex items-center gap-2 text-xs shrink-0">
            <span className="font-medium text-foreground-secondary">{token.symbol}</span>
            <span className="font-mono text-foreground">${formatPrice(token.price)}</span>
            <span className={`font-mono ${token.priceChange24h >= 0 ? "text-green" : "text-red"}`}>
              {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
