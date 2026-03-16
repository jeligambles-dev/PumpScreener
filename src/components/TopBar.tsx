"use client";

import { PumpCoin, GraduatedCoin, derivePriceSOL, formatAge } from "@/lib/pumpApi";

type View = "viral" | "trending" | "topMc" | "newPairs" | "losers" | "kolActivity" | "watchlist";

const tabs: { id: View; label: string }[] = [
  { id: "viral", label: "Viral" },
  { id: "trending", label: "Trending" },
  { id: "newPairs", label: "New Pairs" },
  { id: "topMc", label: "Top MC" },
  { id: "losers", label: "Losers" },
  { id: "kolActivity", label: "KOL" },
  { id: "watchlist", label: "Watchlist" },
];

function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export default function TopBar({
  activeView,
  onViewChange,
  tokenCount,
  onFilter,
  hasActiveFilters,
  pumpCoins,
  graduatedCoins,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
  tokenCount: number;
  onFilter: () => void;
  hasActiveFilters: boolean;
  pumpCoins: PumpCoin[];
  graduatedCoins: GraduatedCoin[];
}) {
  const isViral = activeView === "viral";

  const handleExport = () => {
    if (isViral) {
      const headers = ["Ticker", "Name", "Mint", "Market Cap", "Volume", "Holders", "Transactions", "Graduated Date"];
      const rows = graduatedCoins.map((c) => [
        c.ticker,
        c.name,
        c.coinMint,
        formatUsd(c.marketCap),
        formatUsd(c.volume),
        String(c.numHolders),
        String(c.transactions),
        c.graduationDate ? new Date(c.graduationDate).toISOString() : "",
      ]);
      exportToCsv("viral_tokens.csv", headers, rows);
    } else {
      const headers = ["Symbol", "Name", "Mint", "Market Cap (USD)", "Price (SOL)", "Liquidity", "Age", "Replies", "Twitter", "Website"];
      const rows = pumpCoins.map((c) => [
        c.symbol,
        c.name,
        c.mint,
        formatUsd(c.usd_market_cap),
        derivePriceSOL(c).toFixed(12),
        formatUsd(c.real_sol_reserves * 2),
        formatAge(c.created_timestamp),
        String(c.reply_count),
        c.twitter || "",
        c.website || "",
      ]);
      exportToCsv("pump_tokens.csv", headers, rows);
    }
  };
  return (
    <div className="flex items-center justify-between border-b border-border px-4 lg:px-6 py-2.5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              activeView === tab.id
                ? "bg-accent-dim text-accent shadow-sm"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/* Export CSV button */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface text-muted hover:text-foreground-secondary hover:border-border-bright transition-all"
          title="Export CSV"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>

        {/* Filter button */}
        <button
          onClick={onFilter}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            hasActiveFilters
              ? "border-accent/50 bg-accent-dim text-accent"
              : "border-border bg-surface text-muted hover:text-foreground-secondary hover:border-border-bright"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-mono text-foreground-secondary">{tokenCount}</span>
          <span>pairs</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
          </span>
          <span className="text-green font-medium">Live</span>
        </div>
      </div>
    </div>
  );
}
