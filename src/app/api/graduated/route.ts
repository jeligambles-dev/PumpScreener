import { NextResponse } from "next/server";

const ADVANCED_BASE = "https://advanced-api-v2.pump.fun";

export async function GET() {
  try {
    const res = await fetch(`${ADVANCED_BASE}/coins/graduated`, {
      headers: {
        "Accept": "application/json",
        "Origin": "https://pump.fun",
        "Referer": "https://pump.fun/",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Pump API returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=5" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch graduated coins" }, { status: 500 });
  }
}
