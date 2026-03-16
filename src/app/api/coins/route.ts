import { NextRequest, NextResponse } from "next/server";

const V3_BASE = "https://frontend-api-v3.pump.fun";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const sort = searchParams.get("sort") || "bump_order";
  const order = searchParams.get("order") || "DESC";
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";
  const searchTerm = searchParams.get("searchTerm") || "";
  const includeNsfw = searchParams.get("includeNsfw") || "false";

  const url = new URL(`${V3_BASE}/coins`);
  url.searchParams.set("sort", sort);
  url.searchParams.set("order", order);
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);
  url.searchParams.set("includeNsfw", includeNsfw);
  if (searchTerm) url.searchParams.set("searchTerm", searchTerm);

  try {
    const res = await fetch(url.toString(), {
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
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch from Pump API" }, { status: 500 });
  }
}
