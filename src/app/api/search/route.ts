import { NextRequest, NextResponse } from "next/server";

const V3_BASE = "https://frontend-api-v3.pump.fun";

// Check if query looks like a Solana address (base58, 32-44 chars)
function isSolanaAddress(q: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q.trim());
}

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") || "").trim();
  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const headers = {
    Accept: "application/json",
    Origin: "https://pump.fun",
    "User-Agent": "Mozilla/5.0",
  };

  try {
    // If it looks like a mint address, try direct lookup first
    if (isSolanaAddress(query)) {
      try {
        const directRes = await fetch(`${V3_BASE}/coins/${query}`, { headers });
        if (directRes.ok) {
          const coin = await directRes.json();
          if (coin && coin.mint) {
            return NextResponse.json([coin], {
              headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=3" },
            });
          }
        }
      } catch {
        // Fall through to search
      }
    }

    // Standard search by name/symbol/term
    const url = new URL(`${V3_BASE}/coins`);
    url.searchParams.set("searchTerm", query);
    url.searchParams.set("sort", "market_cap");
    url.searchParams.set("order", "DESC");
    url.searchParams.set("limit", "8");
    url.searchParams.set("offset", "0");
    url.searchParams.set("includeNsfw", "false");

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : [], {
      headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=3" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
