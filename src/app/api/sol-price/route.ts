import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
      { headers: { "Accept": "application/json" } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `CoinGecko returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const price = data?.solana?.usd ?? null;
    const change24h = data?.solana?.usd_24h_change ?? null;

    return NextResponse.json(
      { price, change24h },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=15" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch SOL price" }, { status: 500 });
  }
}
