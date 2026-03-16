import { NextRequest, NextResponse } from "next/server";

const V3_BASE = "https://frontend-api-v3.pump.fun";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  }

  try {
    const res = await fetch(`${V3_BASE}/coins/${mint}`, {
      headers: {
        Accept: "application/json",
        Origin: "https://pump.fun",
        Referer: "https://pump.fun/",
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
    return NextResponse.json({ error: "Failed to fetch coin" }, { status: 500 });
  }
}
