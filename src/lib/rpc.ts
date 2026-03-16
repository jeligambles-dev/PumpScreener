// Solana RPC configuration
// Get a free Helius API key at https://helius.dev (1M credits/month, no credit card)
// Set HELIUS_API_KEY in your .env.local file

function getRpcUrl(): string {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (heliusKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  }
  // Fallback to public RPC (rate-limited)
  return "https://api.mainnet-beta.solana.com";
}

export async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const url = getRpcUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

// Helius enhanced API for parsed transaction history
export async function heliusParseTransactions(address: string, limit = 20): Promise<unknown[]> {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (!heliusKey) return [];

  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${heliusKey}&limit=${limit}`
  );
  if (!res.ok) return [];
  return res.json();
}
