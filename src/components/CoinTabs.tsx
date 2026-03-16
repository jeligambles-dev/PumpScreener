"use client";

import { useState, useEffect } from "react";
import { useKolLabels, type KolInfo } from "@/lib/useKolLabels";

type Tab = "txns" | "traders" | "holders" | "bubblemap" | "cabalspy";

interface Transaction {
  signature: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  wallet: string;
  timestamp: number;
}

interface Holder {
  address: string;
  amount: string;
  percentage: number;
  label?: string;
}

interface Trader {
  address: string;
  buys: number;
  sells: number;
  totalSol: number;
}

function shortAddr(addr: string): string {
  if (!addr) return "—";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatSol(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  if (val >= 1) return val.toFixed(2);
  return val.toFixed(3);
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-xs text-muted">{msg}</p>
    </div>
  );
}

function KolBadge({ kol }: { kol: KolInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5 ml-1.5">
      {kol.pfp ? (
        <img src={kol.pfp} alt={kol.name} className="w-5 h-5 rounded-full object-cover border border-yellow-400/40" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-[8px] font-bold text-yellow-400">
          {kol.name.charAt(0)}
        </div>
      )}
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
        {kol.name}
      </span>
      {kol.twitter && (
        <a
          href={kol.twitter.startsWith("http") ? kol.twitter : `https://x.com/${kol.twitter}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted hover:text-foreground-secondary transition-colors"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      )}
    </span>
  );
}

function WalletCell({ address, kolMap }: { address: string; kolMap: Map<string, KolInfo> }) {
  const kol = kolMap.get(address);
  return (
    <div className="flex items-center flex-wrap">
      <a
        href={`https://solscan.io/account/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
        className="font-mono text-accent hover:text-accent-bright text-[11px]"
      >
        {shortAddr(address)}
      </a>
      {kol && <KolBadge kol={kol} />}
    </div>
  );
}

// Aggregate traders from transaction list
function aggregateTraders(txns: Transaction[]): Trader[] {
  const map = new Map<string, Trader>();
  for (const tx of txns) {
    if (!tx.wallet) continue;
    const existing = map.get(tx.wallet) || { address: tx.wallet, buys: 0, sells: 0, totalSol: 0 };
    if (tx.type === "buy") existing.buys++;
    else existing.sells++;
    existing.totalSol += tx.solAmount;
    map.set(tx.wallet, existing);
  }
  return [...map.values()].sort((a, b) => b.totalSol - a.totalSol);
}

export default function CoinTabs({
  mint,
  devAddress,
}: {
  mint: string;
  devAddress?: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("txns");
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [holderLoading, setHolderLoading] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [holderError, setHolderError] = useState("");
  const kolMap = useKolLabels();

  // Fetch transactions
  useEffect(() => {
    if (activeTab !== "txns" && activeTab !== "traders") return;
    if (txns.length > 0) return;
    setTxnLoading(true);
    setTxnError("");
    fetch(`/api/transactions?mint=${mint}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.transactions)) setTxns(data.transactions);
        else setTxnError("No transactions found");
      })
      .catch(() => setTxnError("Failed to load transactions"))
      .finally(() => setTxnLoading(false));
  }, [activeTab, mint, txns.length]);

  // Fetch holders
  useEffect(() => {
    if (activeTab !== "holders" && activeTab !== "bubblemap") return;
    if (holders.length > 0) return;
    setHolderLoading(true);
    setHolderError("");
    fetch(`/api/holders?mint=${mint}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.holders)) setHolders(data.holders);
        else setHolderError("No holder data found");
      })
      .catch(() => setHolderError("Failed to load holders"))
      .finally(() => setHolderLoading(false));
  }, [activeTab, mint, holders.length]);

  const traders = aggregateTraders(txns);

  const tabs: { id: Tab; label: string }[] = [
    { id: "txns", label: "Latest TXNs" },
    { id: "traders", label: "Top Traders" },
    { id: "holders", label: "Holders" },
    { id: "bubblemap", label: "Bubblemaps" },
    { id: "cabalspy", label: "CabalSpy" },
  ];

  return (
    <div className="mt-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-accent-dim text-accent"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {activeTab === "txns" && (
          txnLoading ? <Spinner /> :
          txnError ? <ErrorMsg msg={txnError} /> :
          txns.length === 0 ? <ErrorMsg msg="No transactions found" /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">SOL</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Tokens</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">Wallet</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Time</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">TXN</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((tx, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-card-hover transition-colors">
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        tx.type === "buy" ? "bg-green-dim text-green" : "bg-red-dim text-red"
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{formatSol(tx.solAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{formatCompact(tx.tokenAmount)}</td>
                    <td className="px-3 py-2">
                      <WalletCell address={tx.wallet} kolMap={kolMap} />
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{timeAgo(tx.timestamp)}</td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={`https://solscan.io/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-bright text-[10px]"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "traders" && (
          txnLoading ? <Spinner /> :
          txnError ? <ErrorMsg msg={txnError} /> :
          traders.length === 0 ? <ErrorMsg msg="No trader data" /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">Wallet</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Buys</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Sells</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Total TXNs</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Volume (SOL)</th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-card-hover transition-colors">
                    <td className="px-3 py-2 text-muted font-mono">{i + 1}</td>
                    <td className="px-3 py-2">
                      <WalletCell address={t.address} kolMap={kolMap} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-green">{t.buys}</td>
                    <td className="px-3 py-2 text-right font-mono text-red">{t.sells}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{t.buys + t.sells}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{formatSol(t.totalSol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "holders" && (
          holderLoading ? <Spinner /> :
          holderError ? <ErrorMsg msg={holderError} /> :
          holders.length === 0 ? <ErrorMsg msg="No holder data" /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">Address</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider">Holding %</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted uppercase tracking-wider w-28"></th>
                </tr>
              </thead>
              <tbody>
                {holders.map((h, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-card-hover transition-colors">
                    <td className="px-3 py-2 text-muted font-mono">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {h.label ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                              {h.label}
                            </span>
                            <span className="text-[10px] font-mono text-muted" title={h.address}>
                              {h.address.slice(0, 4)}...{h.address.slice(-4)}
                            </span>
                          </div>
                        ) : (
                          <WalletCell address={h.address} kolMap={kolMap} />
                        )}
                        {i === 0 && !h.label && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-dim text-accent font-bold">TOP</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{formatCompact(parseFloat(h.amount))}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground-secondary">{h.percentage.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <div className="w-24 h-2 rounded-full bg-border/30 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, h.percentage)}%`,
                              background: h.percentage > 10
                                ? "linear-gradient(90deg, #ef4444, #f97316)"
                                : h.percentage > 5
                                  ? "linear-gradient(90deg, #eab308, #f59e0b)"
                                  : "linear-gradient(90deg, #22c55e, #4ade80)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "bubblemap" && (
          <BubbleMapsEmbed mint={mint} />
        )}

        {activeTab === "cabalspy" && (
          <CabalSpyEmbed mint={mint} />
        )}
      </div>
    </div>
  );
}

function BubbleMapsEmbed({ mint }: { mint: string }) {
  const [source, setSource] = useState<"bubblemaps" | "faster100x">("bubblemaps");

  return (
    <div>
      {/* Source toggle */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-[10px] text-muted uppercase tracking-wider font-semibold mr-1">Source:</span>
        <button
          onClick={() => setSource("bubblemaps")}
          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
            source === "bubblemaps" ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
          }`}
        >
          Bubblemaps
        </button>
        <button
          onClick={() => setSource("faster100x")}
          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
            source === "faster100x" ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
          }`}
        >
          Faster100x
        </button>
        <a
          href={source === "bubblemaps"
            ? `https://app.bubblemaps.io/sol/token/${mint}`
            : `https://faster100x.com/en?tokenAddress=${mint}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[10px] text-accent hover:text-accent/80 transition-colors"
        >
          Open full view ↗
        </a>
      </div>

      {source === "bubblemaps" ? (
        <iframe
          src={`https://iframe.bubblemaps.io/map?chain=solana&address=${mint}&partnerId=demo`}
          className="w-full border-0"
          style={{ height: "500px" }}
          allow="clipboard-write; clipboard-read"
          title="Bubblemaps"
        />
      ) : (
        <iframe
          src={`https://faster100x.com/en/embedded?tokenAddress=${mint}`}
          className="w-full border-0"
          style={{ height: "500px" }}
          allow="clipboard-write; clipboard-read"
          title="Faster100x Holder Map"
        />
      )}
    </div>
  );
}

function CabalSpyEmbed({ mint }: { mint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">KOL &amp; Smart Money Tracking</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
            CabalSpy
          </span>
        </div>
        <a
          href={`https://www.cabalspy.xyz/visualization.php?address=${mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-accent hover:text-accent/80 transition-colors"
        >
          Open on CabalSpy ↗
        </a>
      </div>

      {/* Clip the iframe to hide the CabalSpy header/search bar, show only the visualization */}
      <div className="relative overflow-hidden" style={{ height: "500px" }}>
        <iframe
          src={`https://www.cabalspy.xyz/visualization.php?address=${mint}`}
          className="w-full border-0 absolute"
          style={{ height: "900px", top: "-320px" }}
          allow="clipboard-write; clipboard-read"
          title="CabalSpy"
        />
      </div>
    </div>
  );
}
