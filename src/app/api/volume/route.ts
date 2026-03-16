import { NextResponse } from "next/server";

const ADVANCED_BASE = "https://advanced-api-v2.pump.fun";

export async function GET() {
  try {
    // Fetch graduated coins — they have volume data
    const res = await fetch(`${ADVANCED_BASE}/coins/graduated`, {
      headers: {
        Accept: "application/json",
        Origin: "https://pump.fun",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `API returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const coins = data?.coins;

    if (!Array.isArray(coins)) {
      return NextResponse.json({ totalVolume: 0 });
    }

    // Sum up all volume from graduated coins
    const totalVolume = coins.reduce(
      (sum: number, c: { volume?: number }) => sum + (c.volume || 0),
      0
    );

    return NextResponse.json(
      { totalVolume },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch volume" }, { status: 500 });
  }
}
