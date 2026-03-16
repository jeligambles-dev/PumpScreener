"use client";

import { ReactNode, useState, useEffect } from "react";

type View = "viral" | "trending" | "topMc" | "newPairs" | "losers" | "kolActivity" | "watchlist";

const navItems: { id: View; label: string; icon: ReactNode }[] = [
  {
    id: "viral",
    label: "Viral",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: "trending",
    label: "Trending",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    id: "newPairs",
    label: "New Pairs",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    id: "topMc",
    label: "Top MC",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: "losers",
    label: "Top Losers",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
  },
  {
    id: "kolActivity",
    label: "KOL Activity",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: "watchlist",
    label: "Watchlist",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
}) {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solChange, setSolChange] = useState<number | null>(null);
  const [totalVolume, setTotalVolume] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch("/api/sol-price");
        if (!res.ok) return;
        const data = await res.json();
        if (data.price) setSolPrice(data.price);
        if (data.change24h != null) setSolChange(data.change24h);
      } catch {}
    }
    async function fetchVolume() {
      try {
        const res = await fetch("/api/volume");
        if (!res.ok) return;
        const data = await res.json();
        if (data.totalVolume) setTotalVolume(data.totalVolume);
      } catch {}
    }
    fetchPrice();
    fetchVolume();
    const priceInterval = setInterval(fetchPrice, 30000);
    const volInterval = setInterval(fetchVolume, 60000);
    return () => { clearInterval(priceInterval); clearInterval(volInterval); };
  }, []);

  return (
    <aside className="w-52 border-r border-border bg-surface/50 hidden lg:flex flex-col shrink-0">
      <nav className="py-4 px-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-3 mb-3">
          Screener
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeView === item.id
                ? "bg-accent-dim text-accent glow-accent"
                : "text-foreground-secondary hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <span className={activeView === item.id ? "text-accent" : "text-muted"}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-border mx-3 my-1" />

      <div className="px-3 py-4">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card-hover/50">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <linearGradient id="sol-a" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -25)"><stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
              <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol-a)"/>
              <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol-a)"/>
              <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol-a)"/>
            </svg>
            <span className="text-sm font-medium text-foreground">Solana</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-semibold text-foreground">
              {solPrice ? `$${solPrice.toFixed(2)}` : "..."}
            </span>
            {solChange != null && (
              <div className={`text-[10px] font-mono ${solChange >= 0 ? "text-green" : "text-red"}`}>
                {solChange >= 0 ? "+" : ""}{solChange.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Axiom Extension */}
      <div className="px-3 pb-2 relative group/ext">
        <a
          href="/extension.zip"
          download
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border border-accent/30 text-sm font-medium text-foreground hover:bg-accent-dim transition-all duration-200"
          style={{ background: "linear-gradient(135deg, rgba(129,140,248,0.06), rgba(129,140,248,0.02))" }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z" fill="none"/>
            <path d="M24 4c5.5 0 10.5 2.2 14.1 5.9H24v.1c-3.3 0-6.3 1.4-8.5 3.6L9.8 3.5C13.5 1.3 18.6 0 24 4z" fill="#EA4335" transform="translate(0,2)"/>
            <path d="M4 24c0-4.8 1.7-9.2 4.5-12.7l5.7 9.9c-.1.9-.2 1.8-.2 2.8 0 3 1 5.7 2.7 7.9L11 41.8C6.7 37.9 4 31.3 4 24z" fill="#FBBC05"/>
            <path d="M24 44c-5.2 0-10-1.9-13.7-5l5.7-9.9c2.1 1.8 4.8 2.9 7.8 2.9 2.7 0 5.2-1 7.2-2.5l5.7 9.9C33.2 42.3 28.8 44 24 44z" fill="#34A853"/>
            <path d="M44 24c0 5.2-1.9 10-5 13.7l-5.7-9.9c1.2-1.9 1.9-4.1 1.9-6.5 0-1-.1-2-.4-2.9H24v-7.8h18.7C43.5 13.2 44 18.5 44 24z" fill="#4285F4"/>
            <circle cx="24" cy="24" r="8" fill="#fff"/>
            <circle cx="24" cy="24" r="5.5" fill="#4285F4"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Axiom Extension</span>
            <span className="text-[10px] text-muted font-normal">Download for Chrome</span>
          </div>
          <svg className="w-3.5 h-3.5 ml-auto shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>

        {/* Hover card with preview + install instructions */}
        <div className="absolute left-full top-0 ml-2 w-72 opacity-0 invisible group-hover/ext:opacity-100 group-hover/ext:visible transition-all duration-200 z-50 pointer-events-none group-hover/ext:pointer-events-auto">
          <div className="rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
            {/* Axiom preview mockup */}
            <div className="p-3 border-b border-border" style={{ background: "#18191B" }}>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">Preview on Axiom</p>
              <div className="rounded-lg border border-[#2c2e3a] overflow-hidden" style={{ background: "#111113" }}>
                {/* Mock banner */}
                <div className="w-full h-12 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #818cf820, #a78bfa15)" }}>
                  <span className="text-[9px] text-[#9492b5]">Token Banner Image</span>
                </div>
                {/* Mock stat cards row */}
                <div className="flex gap-1.5 p-2">
                  {/* Holders card */}
                  <div className="flex-1 rounded border border-[#2c2e3a]/50 px-1.5 py-1">
                    <span className="text-[9px] font-medium text-[#9492b5]">111</span>
                    <p className="text-[7px] text-[#605c70]">Holders</p>
                  </div>
                  {/* Pro Traders card */}
                  <div className="flex-1 rounded border border-[#2c2e3a]/50 px-1.5 py-1">
                    <span className="text-[9px] font-medium text-[#9492b5]">86</span>
                    <p className="text-[7px] text-[#605c70]">Pro Traders</p>
                  </div>
                  {/* Dex Paid card - highlighted */}
                  <div className="flex-1 rounded border border-accent/30 px-1.5 py-1 relative" style={{ background: "rgba(129,140,248,0.08)" }}>
                    <span className="text-[9px] font-semibold text-green">Paid</span>
                    <p className="text-[7px] text-[#605c70]">Dex Paid</p>
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
                  </div>
                </div>
              </div>
              {/* NOT PAID example */}
              <div className="mt-2 rounded-lg border border-[#2c2e3a] overflow-hidden" style={{ background: "#111113" }}>
                <div className="w-full h-10 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(44,46,58,0.3), rgba(29,29,37,0.8))" }}>
                  <span className="text-[10px] font-semibold" style={{ color: "#f25461" }}>NOT PAID</span>
                </div>
              </div>
            </div>

            {/* Install steps */}
            <div className="p-3">
              <p className="text-[10px] font-semibold text-foreground mb-2">How to install</p>
              <ol className="space-y-2 text-[10px] text-foreground-secondary leading-relaxed">
                <li className="flex gap-2">
                  <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-accent-dim text-accent text-[8px] font-bold flex items-center justify-center">1</span>
                  <span>Download and unzip the file</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-accent-dim text-accent text-[8px] font-bold flex items-center justify-center">2</span>
                  <span>Go to <code className="px-1 py-0.5 rounded bg-background text-accent text-[9px]">chrome://extensions</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-accent-dim text-accent text-[8px] font-bold flex items-center justify-center">3</span>
                  <span>Enable <strong className="text-foreground">Developer mode</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-accent-dim text-accent text-[8px] font-bold flex items-center justify-center">4</span>
                  <span>Click <strong className="text-foreground">Load unpacked</strong> → select folder</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom card */}
      <div className="p-3 mt-auto">
        <div className="rounded-xl p-3 border border-border" style={{ background: "linear-gradient(135deg, rgba(129,140,248,0.08), rgba(192,132,252,0.05))" }}>
          <p className="text-xs font-medium text-foreground-secondary">Total Volume (24h)</p>
          <p className="text-lg font-bold gradient-text mt-0.5">
            {totalVolume !== null
              ? totalVolume >= 1e9
                ? `$${(totalVolume / 1e9).toFixed(2)}B`
                : totalVolume >= 1e6
                  ? `$${(totalVolume / 1e6).toFixed(2)}M`
                  : `$${(totalVolume / 1e3).toFixed(1)}K`
              : "..."}
          </p>
          <p className="text-[10px] text-muted mt-1">on pump.fun</p>
        </div>
      </div>
    </aside>
  );
}
