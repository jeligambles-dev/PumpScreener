import { NextRequest, NextResponse } from "next/server";
import { rpcCall } from "@/lib/rpc";

// Known DEX / LP / protocol program addresses
const KNOWN_LABELS: Record<string, string> = {
  // Raydium
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium LP",
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1": "Raydium Authority",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C": "Raydium CPMM",
  // Orca / Whirlpool
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca Whirlpool",
  // Meteora
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo": "Meteora DLMM",
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB": "Meteora LP",
  // Pump.fun
  "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg": "Pump.fun Bonding Curve",
  "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp18W": "Pump.fun Fee",
  // Token programs
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "Token-2022",
  // System
  "11111111111111111111111111111111": "System Program",
  // Jupiter
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
  // Marinade
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD": "Marinade",
};

// Bonding curve pattern: check if address is the token's bonding curve
function isBondingCurve(owner: string, mint: string): boolean {
  // Pump.fun bonding curves are PDAs derived from the mint
  // They typically hold large supply before graduation
  // We detect them by checking if the owner is a known pump.fun program or
  // if the owner address ends with common bonding curve patterns
  return owner === mint || KNOWN_LABELS[owner]?.includes("Bonding") || false;
}

function getLabelForOwner(owner: string, _mint: string): string {
  if (KNOWN_LABELS[owner]) return KNOWN_LABELS[owner];
  return "";
}

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  }

  try {
    // Step 1: Get top 20 token accounts by balance
    const largestData = await rpcCall("getTokenLargestAccounts", [mint]) as {
      result?: { value: { address: string; amount: string; decimals: number; uiAmountString: string }[] };
      error?: { message: string };
    };

    if (largestData.error) {
      return NextResponse.json({ error: largestData.error.message }, { status: 502 });
    }

    const accounts = largestData?.result?.value;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ holders: [] });
    }

    // Step 2: Get total supply
    const supplyData = await rpcCall("getTokenSupply", [mint]) as {
      result?: { value: { amount: string } };
    };
    const totalSupply = Number(supplyData?.result?.value?.amount || 0);

    // Step 3: Resolve token accounts → owner wallets
    const tokenAccountAddrs = accounts.map((a) => a.address);
    const infoData = await rpcCall("getMultipleAccounts", [
      tokenAccountAddrs,
      { encoding: "jsonParsed" },
    ]) as {
      result?: {
        value: ({
          data: { parsed: { info: { owner: string } } };
          owner?: string;
        } | null)[];
      };
    };

    const infos = infoData?.result?.value || [];

    // Step 4: Build initial holders list with direct label matches
    const holders = accounts.map((acc, i) => {
      const owner = infos[i]?.data?.parsed?.info?.owner || acc.address;
      const pct = totalSupply > 0 ? (Number(acc.amount) / totalSupply) * 100 : 0;

      // Check for known labels on the wallet owner address
      const label = getLabelForOwner(owner, mint);

      return {
        address: owner,
        tokenAccount: acc.address,
        amount: acc.uiAmountString,
        percentage: Math.round(pct * 100) / 100,
        label,
      };
    });

    // Step 5: For unlabeled holders, fetch their wallet account info to see
    // which program owns them (LP vaults are owned by DEX programs)
    const unlabeledAddrs = holders
      .filter((h) => !h.label)
      .map((h) => h.address);

    if (unlabeledAddrs.length > 0) {
      try {
        const walletInfoData = await rpcCall("getMultipleAccounts", [
          unlabeledAddrs,
          { encoding: "base64", dataSlice: { offset: 0, length: 0 } },
        ]) as {
          result?: {
            value: ({
              owner?: string;
              executable?: boolean;
            } | null)[];
          };
        };

        const walletInfos = walletInfoData?.result?.value || [];
        const labelMap = new Map<string, string>();
        // Programs that own regular wallets — not meaningful holder labels
        const SKIP_PROGRAM_LABELS = new Set([
          "11111111111111111111111111111111",        // System Program
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token Program
          "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
        ]);
        unlabeledAddrs.forEach((addr, i) => {
          const programOwner = walletInfos[i]?.owner || "";
          if (programOwner && KNOWN_LABELS[programOwner] && !SKIP_PROGRAM_LABELS.has(programOwner)) {
            labelMap.set(addr, KNOWN_LABELS[programOwner]);
          }
        });

        for (const h of holders) {
          if (!h.label && labelMap.has(h.address)) {
            h.label = labelMap.get(h.address)!;
          }
        }
      } catch {
        // Continue without extra labels
      }
    }

    return NextResponse.json(
      { holders },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=15" } }
    );
  } catch (err) {
    console.error("Holders API error:", err);
    return NextResponse.json({ error: "Failed to fetch holders" }, { status: 500 });
  }
}
