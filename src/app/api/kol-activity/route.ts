import { NextResponse } from "next/server";

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
  timestamp: number;
  signature: string;
}

interface KolEntry {
  address: string;
  name: string;
  twitter: string;
  pfp: string;
}

let cache: { data: KolTrade[]; ts: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000;

const HELIUS_KEY = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY || "";
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

async function rpc(method: string, params: unknown) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "kol", method, params }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

async function fetchKolWallets(): Promise<KolEntry[]> {
  // Fetch from our own kol-wallets endpoint logic
  try {
    // Try kolscan scrape first
    const res = await fetch("https://kolscan.io/leaderboard", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", Accept: "text/html" },
    });
    if (res.ok) {
      const html = await res.text();
      const chunks = Array.from(html.matchAll(new RegExp('self\\.__next_f\\.push\\(\\[[\\d],\\s*"(.*?)"\\]\\)', "gs")));
      let fullPayload = "";
      for (const match of chunks) {
        if (match[1]) {
          fullPayload += match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        }
      }
      const jsonArrayMatches = fullPayload.match(/\[(?:\{[^[\]]*"(?:wallet_address|address|wallet)"[^[\]]*\}[,\s]*)+\]/g) || [];
      const kols: KolEntry[] = [];
      for (const jsonStr of jsonArrayMatches) {
        try {
          const arr = JSON.parse(jsonStr);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const addr = item.wallet_address || item.address || item.wallet || "";
              const name = item.name || item.username || item.label || "";
              if (addr && addr.length >= 32 && addr.length <= 44 && name) {
                kols.push({ address: addr, name, twitter: item.twitter || item.twitter_url || "", pfp: item.pfp || item.avatar || "" });
              }
            }
          }
        } catch { /* skip */ }
      }
      if (kols.length > 10) return kols;
    }
  } catch { /* fallback */ }

  // Fallback to third-party
  try {
    const res = await fetch("https://api.ai16x402.com/api/leaderboard?timeframe=daily&limit=100");
    if (res.ok) {
      const data = await res.json();
      const entries = Array.isArray(data) ? data : data.data || data.results || [];
      return entries
        .map((item: Record<string, string>) => ({
          address: item.wallet_address || item.address || item.wallet || "",
          name: item.name || item.username || "",
          twitter: item.twitter || "",
          pfp: item.pfp || "",
        }))
        .filter((e: KolEntry) => e.address && e.name);
    }
  } catch { /* empty */ }
  return [];
}

async function fetchWalletTrades(kol: KolEntry): Promise<KolTrade[]> {
  const trades: KolTrade[] = [];
  try {
    // Get recent signatures
    const sigs = await rpc("getSignaturesForAddress", [kol.address, { limit: 30 }]);
    if (!sigs || !Array.isArray(sigs)) return [];

    // Filter to successful txs only
    const successSigs = sigs.filter((s: { err: unknown }) => !s.err).slice(0, 8);
    if (successSigs.length === 0) return [];

    // Parse each transaction
    for (const sig of successSigs) {
      try {
        const tx = await rpc("getTransaction", [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
        if (!tx) continue;

        const meta = tx.meta;
        if (!meta) continue;

        const accountKeys = tx.transaction?.message?.accountKeys || [];
        const signerKey = typeof accountKeys[0] === "string" ? accountKeys[0] : accountKeys[0]?.pubkey || "";
        if (signerKey !== kol.address) continue;

        const preBalances = meta.preBalances || [];
        const postBalances = meta.postBalances || [];
        const solChange = (postBalances[0] - preBalances[0]) / 1e9;

        const preTokens = meta.preTokenBalances || [];
        const postTokens = meta.postTokenBalances || [];

        // Find token balance changes for the signer
        let tokenMint = "";
        let type: "buy" | "sell" = "buy";

        for (const pt of postTokens) {
          if (pt.owner !== kol.address) continue;
          const postAmt = parseFloat(pt.uiTokenAmount?.uiAmountString || "0");
          // Find matching pre balance
          let preAmt = 0;
          for (const prt of preTokens) {
            if (prt.owner === kol.address && prt.mint === pt.mint) {
              preAmt = parseFloat(prt.uiTokenAmount?.uiAmountString || "0");
              break;
            }
          }
          const tokenChange = postAmt - preAmt;
          if (Math.abs(tokenChange) > 0) {
            tokenMint = pt.mint;
            type = tokenChange > 0 ? "buy" : "sell";
            break;
          }
        }

        // Also check pre tokens that disappeared (full sell)
        if (!tokenMint) {
          for (const prt of preTokens) {
            if (prt.owner !== kol.address) continue;
            const preAmt = parseFloat(prt.uiTokenAmount?.uiAmountString || "0");
            if (preAmt <= 0) continue;
            const hasPost = postTokens.some(
              (pt: { owner: string; mint: string }) => pt.owner === kol.address && pt.mint === prt.mint
            );
            if (!hasPost) {
              // Token completely sold
              tokenMint = prt.mint;
              type = "sell";
              break;
            }
          }
        }

        if (!tokenMint) continue;

        const absSOL = Math.abs(solChange);
        if (absSOL < 0.01) continue; // Skip dust

        // Derive pfp
        let pfp = kol.pfp || "";
        if (!pfp && kol.twitter) {
          const handle = kol.twitter.replace(/^https?:\/\/(x\.com|twitter\.com)\//, "").replace(/\/.*$/, "");
          if (handle) pfp = `https://unavatar.io/twitter/${handle}`;
        }

        trades.push({
          kol: kol.name,
          kolTwitter: kol.twitter,
          kolPfp: pfp,
          type,
          tokenMint,
          tokenSymbol: "",
          tokenName: "",
          tokenImage: "",
          amountSOL: absSOL,
          timestamp: (sig.blockTime || Math.floor(Date.now() / 1000)) * 1000,
          signature: sig.signature,
        });
      } catch {
        // Skip individual tx errors
      }
    }
  } catch {
    // Silently fail for individual wallet
  }
  return trades;
}

async function enrichMetadata(trades: KolTrade[]) {
  const uniqueMints = [...new Set(trades.map((t) => t.tokenMint).filter(Boolean))];
  if (!HELIUS_KEY || uniqueMints.length === 0) return;

  const metaMap = new Map<string, { name: string; symbol: string; image: string }>();
  const batchSize = 20;

  for (let i = 0; i < Math.min(uniqueMints.length, 60); i += batchSize) {
    const batch = uniqueMints.slice(i, i + batchSize);
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "meta", method: "getAssetBatch", params: { ids: batch } }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result && Array.isArray(data.result)) {
          for (const asset of data.result) {
            if (asset?.id) {
              const content = asset.content || {};
              const meta = content.metadata || {};
              const links = content.links || {};
              metaMap.set(asset.id, {
                name: meta.name || "",
                symbol: meta.symbol || "",
                image: links.image || content.json_uri || "",
              });
            }
          }
        }
      }
    } catch { /* continue */ }
  }

  for (const trade of trades) {
    const m = metaMap.get(trade.tokenMint);
    if (m) {
      trade.tokenName = m.name;
      trade.tokenSymbol = m.symbol || trade.tokenMint.slice(0, 6) + "...";
      trade.tokenImage = m.image;
    } else if (!trade.tokenSymbol) {
      trade.tokenSymbol = trade.tokenMint.slice(0, 6) + "...";
    }
  }
}

export async function GET() {
  if (cache && cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  const kols = await fetchKolWallets();
  if (kols.length === 0) {
    return NextResponse.json([]);
  }

  // Query top 20 KOLs in parallel
  const topKols = kols.slice(0, 20);
  const results = await Promise.allSettled(topKols.map((k) => fetchWalletTrades(k)));

  const allTrades: KolTrade[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allTrades.push(...result.value);
    }
  }

  // Sort by timestamp descending
  allTrades.sort((a, b) => b.timestamp - a.timestamp);
  const trimmed = allTrades.slice(0, 100);

  // Enrich with token metadata
  await enrichMetadata(trimmed);

  if (trimmed.length > 0) {
    cache = { data: trimmed, ts: Date.now() };
  }

  return NextResponse.json(trimmed, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
