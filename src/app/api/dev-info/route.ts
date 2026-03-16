import { NextRequest, NextResponse } from "next/server";
import { rpcCall } from "@/lib/rpc";

export async function GET(req: NextRequest) {
  const creator = req.nextUrl.searchParams.get("creator");
  const mint = req.nextUrl.searchParams.get("mint");

  if (!creator || !mint) {
    return NextResponse.json(
      { error: "Missing creator or mint param" },
      { status: 400 }
    );
  }

  try {
    // Run both RPC calls in parallel
    const [tokenAccountsData, signaturesData] = await Promise.all([
      // Check if the creator still holds tokens for this mint
      rpcCall("getTokenAccountsByOwner", [
        creator,
        { mint },
        { encoding: "jsonParsed" },
      ]) as Promise<{
        result?: {
          value: {
            account: {
              data: {
                parsed: {
                  info: { tokenAmount: { uiAmountString: string; amount: string } };
                };
              };
            };
          }[];
        };
        error?: { message: string };
      }>,

      // Get recent signatures to estimate activity / token creation count
      rpcCall("getSignaturesForAddress", [
        creator,
        { limit: 100 },
      ]) as Promise<{
        result?: { signature: string }[];
        error?: { message: string };
      }>,
    ]);

    // Parse token holdings
    let holdsTokens = false;
    let tokenBalance = "0";

    const tokenAccounts = tokenAccountsData?.result?.value;
    if (Array.isArray(tokenAccounts) && tokenAccounts.length > 0) {
      const amount = tokenAccounts[0].account.data.parsed.info.tokenAmount;
      if (Number(amount.amount) > 0) {
        holdsTokens = true;
        tokenBalance = amount.uiAmountString;
      }
    }

    // Count recent transactions
    const signatures = signaturesData?.result;
    const recentTxCount = Array.isArray(signatures) ? signatures.length : 0;

    return NextResponse.json(
      { holdsTokens, tokenBalance, recentTxCount },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" } }
    );
  } catch (err) {
    console.error("Dev info API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dev info" },
      { status: 500 }
    );
  }
}
