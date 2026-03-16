import { NextRequest, NextResponse } from "next/server";

// In-memory store for paid tokens (replace with a database in production)
// Structure: { mint: { isPaid, bannerUrl, symbol, paidAt } }
const paidTokens: Record<
  string,
  { isPaid: boolean; bannerUrl: string | null; symbol: string | null; paidAt: string | null }
> = {};

// CORS headers for the extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

// GET /api/paid-status?mint=<address>
// GET /api/paid-status?mints=<addr1>,<addr2>,... (batch)
// Returns paid status and banner URL for token(s)
export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  const mints = req.nextUrl.searchParams.get("mints");

  // Batch mode
  if (mints) {
    const mintList = mints.split(",").filter(Boolean);
    const results: Record<string, { isPaid: boolean; bannerUrl: string | null; symbol: string | null }> = {};
    for (const m of mintList) {
      const token = paidTokens[m];
      results[m] = token
        ? { isPaid: token.isPaid, bannerUrl: token.bannerUrl, symbol: token.symbol }
        : { isPaid: false, bannerUrl: null, symbol: null };
    }
    return NextResponse.json(results, { headers: corsHeaders });
  }

  // Single mode
  if (!mint) {
    return NextResponse.json(
      { error: "mint parameter required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const token = paidTokens[mint];

  if (!token) {
    return NextResponse.json(
      {
        mint,
        isPaid: false,
        bannerUrl: null,
        symbol: null,
      },
      { headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      mint,
      isPaid: token.isPaid,
      bannerUrl: token.bannerUrl,
      symbol: token.symbol,
    },
    { headers: corsHeaders }
  );
}

// POST /api/paid-status
// Body: { mint, isPaid, bannerUrl?, symbol? }
// Marks a token as paid/unpaid and optionally sets a banner URL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mint, isPaid, bannerUrl, symbol } = body;

    if (!mint) {
      return NextResponse.json(
        { error: "mint is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    paidTokens[mint] = {
      isPaid: Boolean(isPaid),
      bannerUrl: bannerUrl || null,
      symbol: symbol || null,
      paidAt: isPaid ? new Date().toISOString() : null,
    };

    return NextResponse.json(
      { success: true, ...paidTokens[mint] },
      { headers: corsHeaders }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: corsHeaders }
    );
  }
}

// DELETE /api/paid-status?mint=<address>
// Removes a token's paid status
export async function DELETE(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");

  if (!mint) {
    return NextResponse.json(
      { error: "mint parameter required" },
      { status: 400, headers: corsHeaders }
    );
  }

  delete paidTokens[mint];

  return NextResponse.json(
    { success: true, mint },
    { headers: corsHeaders }
  );
}
