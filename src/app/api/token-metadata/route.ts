import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  }

  const heliusKey = process.env.HELIUS_API_KEY;
  if (!heliusKey) {
    return NextResponse.json({ error: "No API key" }, { status: 500 });
  }

  try {
    // Use Helius DAS API to get token metadata
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAsset",
        params: { id: mint },
      }),
    });

    const data = await res.json();
    const asset = data.result;

    if (!asset) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: asset.content?.metadata?.name || "",
      symbol: asset.content?.metadata?.symbol || "",
      image: asset.content?.links?.image || asset.content?.files?.[0]?.uri || "",
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
