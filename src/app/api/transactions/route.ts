import { NextRequest, NextResponse } from "next/server";
import { heliusParseTransactions, rpcCall } from "@/lib/rpc";

interface HeliusTx {
  signature: string;
  timestamp: number;
  type: string;
  tokenTransfers?: {
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }[];
  nativeTransfers?: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
  feePayer: string;
}

interface TokenBalanceEntry {
  accountIndex: number;
  mint: string;
  owner: string;
  uiTokenAmount: { uiAmountString: string };
}

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  }

  try {
    // Try Helius enhanced API first (much better parsed data)
    const heliusTxns = await heliusParseTransactions(mint, 20) as HeliusTx[];

    if (Array.isArray(heliusTxns) && heliusTxns.length > 0) {
      const transactions = heliusTxns
        .map((tx) => {
          const tokenTransfer = tx.tokenTransfers?.find((t) => t.mint === mint);
          if (!tokenTransfer) return null;

          const solTransfer = tx.nativeTransfers?.[0];
          const solAmount = solTransfer ? Math.abs(solTransfer.amount) / 1e9 : 0;

          // Determine buy/sell: if tokens go TO the fee payer, it's a buy
          const isBuy = tokenTransfer.toUserAccount === tx.feePayer;
          const wallet = tx.feePayer;

          return {
            signature: tx.signature,
            type: isBuy ? "buy" as const : "sell" as const,
            solAmount: Math.round(solAmount * 1000) / 1000,
            tokenAmount: Math.abs(tokenTransfer.tokenAmount),
            wallet,
            timestamp: tx.timestamp * 1000,
          };
        })
        .filter(Boolean);

      return NextResponse.json(
        { transactions },
        { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=10" } }
      );
    }

    // Fallback: raw RPC approach
    const sigData = await rpcCall("getSignaturesForAddress", [mint, { limit: 15 }]) as {
      result?: { signature: string; blockTime: number; err: unknown }[];
      error?: { message: string };
    };

    if (sigData.error) {
      return NextResponse.json({ error: sigData.error.message }, { status: 502 });
    }

    const sigs = sigData?.result?.filter((s) => !s.err).slice(0, 10) || [];
    if (sigs.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const transactions: {
      signature: string;
      type: "buy" | "sell";
      solAmount: number;
      tokenAmount: number;
      wallet: string;
      timestamp: number;
    }[] = [];

    // Fetch in small batches
    for (const sig of sigs) {
      const txData = await rpcCall("getTransaction", [
        sig.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ]) as { result?: Record<string, unknown> };

      const tx = txData?.result;
      if (!tx || !tx.meta) continue;

      const meta = tx.meta as {
        err: unknown;
        preBalances: number[];
        postBalances: number[];
        preTokenBalances?: TokenBalanceEntry[];
        postTokenBalances?: TokenBalanceEntry[];
      };

      if (meta.err) continue;

      const blockTime = (tx.blockTime as number) ? (tx.blockTime as number) * 1000 : Date.now();
      const transaction = tx.transaction as { signatures: string[] };
      const txSig = transaction?.signatures?.[0] || "";

      const preBals = (meta.preTokenBalances || []).filter((b) => b.mint === mint);
      const postBals = (meta.postTokenBalances || []).filter((b) => b.mint === mint);

      let bestDiff = 0;
      let wallet = "";

      for (const post of postBals) {
        const pre = preBals.find((p) => p.owner === post.owner);
        const preAmt = pre ? parseFloat(pre.uiTokenAmount.uiAmountString || "0") : 0;
        const postAmt = parseFloat(post.uiTokenAmount.uiAmountString || "0");
        const diff = postAmt - preAmt;
        if (Math.abs(diff) > Math.abs(bestDiff)) {
          bestDiff = diff;
          wallet = post.owner || "";
        }
      }

      if (bestDiff === 0 || !wallet) continue;

      const solChange = Math.abs(meta.preBalances[0] - meta.postBalances[0]) / 1e9;

      transactions.push({
        signature: txSig,
        type: bestDiff > 0 ? "buy" : "sell",
        solAmount: Math.round(solChange * 1000) / 1000,
        tokenAmount: Math.abs(Math.round(bestDiff * 100) / 100),
        wallet,
        timestamp: blockTime,
      });
    }

    transactions.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(
      { transactions },
      { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=10" } }
    );
  } catch (err) {
    console.error("Transactions API error:", err);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
