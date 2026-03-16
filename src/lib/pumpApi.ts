const V3_BASE = "https://frontend-api-v3.pump.fun";

export interface PumpCoin {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  twitter: string;
  telegram: string;
  website: string;
  created_timestamp: number;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  real_sol_reserves: number;
  real_token_reserves: number;
  total_supply: number;
  market_cap: number;
  usd_market_cap: number;
  reply_count: number;
  last_trade_timestamp: number;
  king_of_the_hill_timestamp: number;
  is_currently_live: boolean;
  creator: string;
  bonding_curve: string;
  nsfw: boolean;
  is_cashback_enabled: boolean;
  tokenized_agent: boolean;
}

export interface GraduatedCoin {
  coinMint: string;
  name: string;
  ticker: string;
  imageUrl: string;
  dev: string;
  creationTime: number;
  numHolders: number;
  numKolsTraded: number;
  marketCap: number;
  volume: number;
  currentMarketPrice: number;
  bondingCurveProgress: number;
  graduationDate: number;
  twitter: string;
  telegram: string;
  website: string;
  buyTransactions: number;
  sellTransactions: number;
  transactions: number;
  devHoldingsPercentage: number;
  topHoldersPercentage: number;
  sniperCount: number;
  sniperOwnedPercentage: number;
  allTimeHighMarketCap: number;
  poolAddress: string;
  hasTwitter: boolean;
  hasTelegram: boolean;
  hasWebsite: boolean;
  hasSocial: boolean;
  twitterReuseCount: number;
  isMayhemMode: boolean;
  tokenProgram: string;
  program: string;
  platform: string;
}

// Derive price from reserves: price = virtual_sol_reserves / virtual_token_reserves
export function derivePriceSOL(coin: PumpCoin): number {
  if (!coin.virtual_token_reserves || !coin.virtual_sol_reserves) return 0;
  return coin.virtual_sol_reserves / coin.virtual_token_reserves;
}

// Format age from timestamp
export function formatAge(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
