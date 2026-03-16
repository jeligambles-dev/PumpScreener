import { NextResponse } from "next/server";

const V3_BASE = "https://frontend-api-v3.pump.fun";
const MC_THRESHOLD = 28_000; // 28K USD market cap threshold

export async function GET() {
  try {
    const res = await fetch(
      `${V3_BASE}/coins?sort=bump_order&order=DESC&limit=50&offset=0&includeNsfw=false`,
      {
        headers: {
          "Accept": "application/json",
          "Origin": "https://pump.fun",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `API returned ${res.status}` }, { status: res.status });
    }

    const coins = await res.json();

    if (!Array.isArray(coins) || coins.length === 0) {
      return NextResponse.json({ error: "No coins found" }, { status: 404 });
    }

    // Filter: non-graduated coins that have hit 28K+ MC
    const candidates = coins.filter(
      (c: Record<string, unknown>) =>
        !c.complete && typeof c.usd_market_cap === "number" && (c.usd_market_cap as number) >= MC_THRESHOLD
    );

    if (candidates.length === 0) {
      return NextResponse.json({ king: null }, {
        headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=5" },
      });
    }

    // Pick the one with the highest volume (total_supply as proxy, or sort by bump activity)
    // The list is already sorted by bump_order DESC, so the first candidate is the most active
    const king = candidates[0];

    return NextResponse.json(
      { king },
      { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=5" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch king" }, { status: 500 });
  }
}
