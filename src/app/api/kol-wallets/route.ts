import { NextResponse } from "next/server";

interface KolEntry {
  address: string;
  name: string;
  twitter: string;
  pfp: string;
}

// In-memory cache (persists across requests in the same server process)
let cache: { data: KolEntry[]; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function scrapeKols(): Promise<KolEntry[]> {
  const kols: KolEntry[] = [];

  try {
    // Fetch the leaderboard page which has embedded KOL data
    const res = await fetch("https://kolscan.io/leaderboard", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) return kols;
    const html = await res.text();

    // Extract serialized data from Next.js RSC payload
    // The data is in self.__next_f.push([...]) calls
    const chunks = Array.from(html.matchAll(new RegExp('self\\.__next_f\\.push\\(\\[[\\d],\\s*"(.*?)"\\]\\)', 'gs')));

    let fullPayload = "";
    for (const match of chunks) {
      if (match[1]) {
        fullPayload += match[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }
    }

    // Find JSON arrays that look like KOL data - look for wallet addresses (base58, 32-44 chars)
    const jsonArrayMatches = fullPayload.match(/\[(?:\{[^[\]]*"(?:wallet_address|address|wallet)"[^[\]]*\}[,\s]*)+\]/g) || [];

    for (const jsonStr of jsonArrayMatches) {
      try {
        const arr = JSON.parse(jsonStr);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const addr = item.wallet_address || item.address || item.wallet || "";
            const name = item.name || item.username || item.label || "";
            if (addr && addr.length >= 32 && addr.length <= 44 && name) {
              kols.push({
                address: addr,
                name,
                twitter: item.twitter || item.twitter_url || "",
                pfp: item.pfp || item.avatar || item.profile_image || "",
              });
            }
          }
        }
      } catch {
        // Skip unparseable chunks
      }
    }

    // Also try extracting from the raw HTML table/list structure as fallback
    if (kols.length === 0) {
      // Try matching individual KOL entries from the RSC payload
      const entryPattern = /\"name\":\"([^"]+)\"[^}]*\"(?:wallet_address|address|wallet)\":\"([A-Za-z1-9]{32,44})\"/g;
      let match;
      while ((match = entryPattern.exec(fullPayload)) !== null) {
        kols.push({
          address: match[2],
          name: match[1],
          twitter: "",
          pfp: "",
        });
      }

      // Try reverse order too
      const reversePattern = /\"(?:wallet_address|address|wallet)\":\"([A-Za-z1-9]{32,44})\"[^}]*\"name\":\"([^"]+)\"/g;
      while ((match = reversePattern.exec(fullPayload)) !== null) {
        if (!kols.find((k) => k.address === match![1])) {
          kols.push({
            address: match[1],
            name: match[2],
            twitter: "",
            pfp: "",
          });
        }
      }
    }
  } catch {
    // Silently fail, return empty
  }

  // Also fetch from the third-party proxy as a backup
  if (kols.length < 10) {
    try {
      const res = await fetch("https://api.ai16x402.com/api/leaderboard?timeframe=daily&limit=500");
      if (res.ok) {
        const data = await res.json();
        const entries = Array.isArray(data) ? data : data.data || data.results || [];
        for (const item of entries) {
          const addr = item.wallet_address || item.address || item.wallet || "";
          const name = item.name || item.username || "";
          if (addr && name && !kols.find((k) => k.address === addr)) {
            kols.push({
              address: addr,
              name,
              twitter: item.twitter || "",
              pfp: item.pfp || "",
            });
          }
        }
      }
    } catch {
      // Silently fail
    }
  }

  return kols;
}

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  const kols = await scrapeKols();

  if (kols.length > 0) {
    cache = { data: kols, ts: Date.now() };
  }

  return NextResponse.json(kols, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
