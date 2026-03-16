"use client";

import React, { useState, useEffect, useDeferredValue, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import TokenTable from "@/components/TokenTable";
import ViralTable from "@/components/ViralTable";
import KolTable from "@/components/KolTable";
import TokenDetail from "@/components/TokenDetail";
import ViralDetail from "@/components/ViralDetail";
import KingOfTheHill from "@/components/KingOfTheHill";
import EnhancedTokenModal from "@/components/EnhancedTokenModal";
import BannerResizeModal from "@/components/BannerResizeModal";
import ThemePanel from "@/components/ThemePanel";
import FilterPanel, { Filters, defaultFilters } from "@/components/FilterPanel";
import { PumpCoin, GraduatedCoin } from "@/lib/pumpApi";
import { useTheme } from "@/lib/useTheme";
import { useCoins, useGraduated, View } from "@/lib/useCoins";
import { filterPumpCoins, filterGraduatedCoins } from "@/lib/applyFilters";
import { usePaidStatus } from "@/lib/usePaidStatus";
import { useWatchlist } from "@/lib/useWatchlist";
import { readUrlState, useUrlSync } from "@/lib/useUrlSync";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center p-8 rounded-lg border border-border max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-muted mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 text-sm font-medium rounded-md bg-accent text-foreground hover:opacity-80 transition-opacity"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SkeletonBar({ width = "w-16" }: { width?: string }) {
  return <div className={`h-3 ${width} rounded bg-surface animate-pulse`} />;
}

function SkeletonRows({ isViral }: { isViral: boolean }) {
  const rows = Array.from({ length: 10 });

  if (isViral) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">#</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">MCap</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">Token</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Trending</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Volume</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">TXNs</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Holders</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Graduated</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Socials</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Chart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, i) => (
              <tr key={i} className="border-b border-border/30" style={{ opacity: 1 - i * 0.08 }}>
                <td className="px-3 py-3.5"><SkeletonBar width="w-6" /></td>
                <td className="px-3 py-3.5"><SkeletonBar width="w-16" /></td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-surface animate-pulse shrink-0" />
                    <div className="space-y-2">
                      <SkeletonBar width="w-20" />
                      <SkeletonBar width="w-28" />
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3.5 text-center"><SkeletonBar width="w-7 mx-auto" /></td>
                <td className="px-3 py-3.5"><SkeletonBar width="w-14 ml-auto" /></td>
                <td className="px-3 py-3.5"><SkeletonBar width="w-12 ml-auto" /></td>
                <td className="px-3 py-3.5"><SkeletonBar width="w-10 ml-auto" /></td>
                <td className="px-3 py-3.5"><SkeletonBar width="w-10 ml-auto" /></td>
                <td className="px-3 py-3.5">
                  <div className="flex justify-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-surface animate-pulse" />
                    <div className="w-5 h-5 rounded-full bg-surface animate-pulse" />
                  </div>
                </td>
                <td className="px-3 py-3.5"><SkeletonBar width="w-16 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">#</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">Market Cap</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-left">Token</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Price</th>
            <th className="hidden sm:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Liquidity</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Age</th>
            <th className="hidden md:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Replies</th>
            <th className="hidden sm:table-cell px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Last Trade</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Socials</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-center">Status</th>
            <th className="px-3 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Chart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((_, i) => (
            <tr key={i} className="border-b border-border/30" style={{ opacity: 1 - i * 0.08 }}>
              <td className="px-3 py-3.5"><SkeletonBar width="w-6" /></td>
              <td className="px-3 py-3.5"><SkeletonBar width="w-16" /></td>
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-surface animate-pulse shrink-0" />
                  <div className="space-y-2">
                    <SkeletonBar width="w-20" />
                    <SkeletonBar width="w-28" />
                  </div>
                </div>
              </td>
              <td className="px-3 py-3.5"><SkeletonBar width="w-16 ml-auto" /></td>
              <td className="hidden sm:table-cell px-3 py-3.5"><SkeletonBar width="w-14 ml-auto" /></td>
              <td className="px-3 py-3.5"><SkeletonBar width="w-10 ml-auto" /></td>
              <td className="hidden md:table-cell px-3 py-3.5"><SkeletonBar width="w-8 ml-auto" /></td>
              <td className="hidden sm:table-cell px-3 py-3.5"><SkeletonBar width="w-10 ml-auto" /></td>
              <td className="px-3 py-3.5">
                <div className="flex justify-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-surface animate-pulse" />
                  <div className="w-5 h-5 rounded-full bg-surface animate-pulse" />
                </div>
              </td>
              <td className="px-3 py-3.5">
                <div className="flex justify-center">
                  <SkeletonBar width="w-12" />
                </div>
              </td>
              <td className="px-3 py-3.5"><SkeletonBar width="w-16 ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  // Read URL params once to initialise view & filters
  const [activeView, setActiveView] = useState<View>(() => {
    const { view } = readUrlState();
    return view ?? "viral";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedCoin, setSelectedCoin] = useState<PumpCoin | null>(null);
  const [selectedIsKing, setSelectedIsKing] = useState(false);
  const [selectedViral, setSelectedViral] = useState<GraduatedCoin | null>(null);
  const [showEnhance, setShowEnhance] = useState(false);
  const [showBannerResize, setShowBannerResize] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => {
    const { filters: urlFilters } = readUrlState();
    return urlFilters ? { ...defaultFilters, ...urlFilters } : defaultFilters;
  });
  const theme = useTheme();
  const { watchlist, isWatched, toggle: toggleWatch } = useWatchlist();

  // Keep URL in sync with view & filter state
  useUrlSync(activeView, filters);

  const hasActiveFilters = Object.entries(filters).some(([, val]) => {
    if (typeof val === "boolean") return val === true;
    return val !== "";
  });

  const updateFilter = (key: keyof Filters, val: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleSelectByMint = useCallback(async (mint: string) => {
    try {
      const res = await fetch(`/api/coin?mint=${encodeURIComponent(mint)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.mint) {
        setSelectedCoin(data);
        setSelectedIsKing(false);
      }
    } catch { /* ignore */ }
  }, []);

  const { coins, loading, error } = useCoins(activeView, deferredSearch);
  const { coins: graduatedCoins, loading: gradLoading, error: gradError } = useGraduated(activeView === "viral");

  // Paid status for filtering
  const allMints = React.useMemo(() => {
    const pumpMints = coins.map((c) => c.mint);
    const gradMints = graduatedCoins.map((c) => c.coinMint);
    return [...pumpMints, ...gradMints];
  }, [coins, graduatedCoins]);
  const paidMap = usePaidStatus(allMints);

  const isViral = activeView === "viral";
  const isKol = activeView === "kolActivity";
  const isWatchlist = activeView === "watchlist";

  // Fetch watched coins individually when watchlist view is active
  const [watchlistCoins, setWatchlistCoins] = useState<PumpCoin[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    if (!isWatchlist || watchlist.length === 0) {
      setWatchlistCoins([]);
      return;
    }
    let cancelled = false;
    setWatchlistLoading(true);
    Promise.all(
      watchlist.map((mint) =>
        fetch(`/api/coin?mint=${encodeURIComponent(mint)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) {
        setWatchlistCoins(results.filter((r): r is PumpCoin => r && r.mint));
        setWatchlistLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [isWatchlist, watchlist]);

  const currentLoading = isViral ? gradLoading : isWatchlist ? watchlistLoading : loading;
  const currentError = isViral ? gradError : isWatchlist ? null : error;

  const filteredCoins = hasActiveFilters ? filterPumpCoins(coins, filters, paidMap) : coins;
  const filteredGraduated = hasActiveFilters ? filterGraduatedCoins(graduatedCoins, filters, paidMap) : graduatedCoins;
  const displayCoins = isWatchlist ? watchlistCoins : filteredCoins;
  const currentCount = isViral ? filteredGraduated.length : displayCoins.length;

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-screen overflow-hidden">
      <Header searchQuery={searchQuery} onSearch={setSearchQuery} onEnhanceToken={() => setShowEnhance(true)} onBannerResize={() => setShowBannerResize(true)} onTheme={() => setShowTheme(true)} onSelectCoin={(coin) => { setSelectedCoin(coin); setSelectedIsKing(false); }} onSelectByMint={handleSelectByMint} />
      <div className="flex justify-center px-4 lg:px-6 py-2">
        <div className="w-full max-w-2xl">
          <KingOfTheHill onSelectCoin={(coin) => { setSelectedCoin(coin); setSelectedIsKing(true); }} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            activeView={activeView}
            onViewChange={setActiveView}
            tokenCount={currentCount}
            onFilter={() => setShowFilters(true)}
            hasActiveFilters={hasActiveFilters}
            pumpCoins={displayCoins}
            graduatedCoins={filteredGraduated}
          />

          <div className="flex-1 overflow-auto">
            {isKol ? (
              <KolTable onSelectToken={handleSelectByMint} isWatched={isWatched} onToggleWatch={toggleWatch} />
            ) : isWatchlist && watchlist.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground-secondary">Your watchlist is empty</p>
                  <p className="text-xs text-muted mt-1">Star tokens to add them here</p>
                </div>
              </div>
            ) : currentLoading && currentCount === 0 ? (
              <SkeletonRows isViral={isViral} />
            ) : currentError && currentCount === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm font-medium text-red">Failed to load</p>
                  <p className="text-xs text-muted mt-1">{currentError}</p>
                </div>
              </div>
            ) : currentCount > 0 ? (
              isViral ? (
                <ViralTable coins={filteredGraduated} onSelectCoin={setSelectedViral} isWatched={isWatched} onToggleWatch={toggleWatch} />
              ) : (
                <TokenTable coins={displayCoins} onSelectCoin={(coin) => { setSelectedCoin(coin); setSelectedIsKing(false); }} isWatched={isWatched} onToggleWatch={toggleWatch} />
              )
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground-secondary">No tokens found</p>
                  <p className="text-xs text-muted mt-1">Try adjusting your filters</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedCoin && (
        <TokenDetail coin={selectedCoin} onClose={() => { setSelectedCoin(null); setSelectedIsKing(false); }} isKing={selectedIsKing} />
      )}
      {selectedViral && (
        <ViralDetail coin={selectedViral} onClose={() => setSelectedViral(null)} />
      )}
      {showEnhance && (
        <EnhancedTokenModal onClose={() => setShowEnhance(false)} />
      )}
      {showBannerResize && (
        <BannerResizeModal onClose={() => setShowBannerResize(false)} />
      )}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={updateFilter}
          onReset={() => setFilters(defaultFilters)}
          onClose={() => setShowFilters(false)}
          isViral={isViral}
        />
      )}
      {showTheme && (
        <ThemePanel
          mode={theme.mode}
          setMode={theme.setMode}
          customColors={theme.customColors}
          updateCustomColor={theme.updateCustomColor}
          resetCustom={theme.resetCustom}
          onClose={() => setShowTheme(false)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
