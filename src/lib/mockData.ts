export interface Token {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  chain: string;
  chainIcon: string;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  age: string;
  txns24h: number;
  buyers24h: number;
  sellers24h: number;
  dex: string;
  pairAddress: string;
  isNew?: boolean;
}

const chains = [
  { name: "Solana", icon: "SOL" },
];

const dexes = ["Raydium", "Uniswap V3", "PancakeSwap", "Orca", "Jupiter", "Aerodrome", "SushiSwap", "Trader Joe"];

const tokenNames = [
  ["PEPE", "Pepe"],
  ["BONK", "Bonk"],
  ["WIF", "dogwifhat"],
  ["POPCAT", "Popcat"],
  ["FLOKI", "Floki"],
  ["BRETT", "Brett"],
  ["MEW", "cat in a dogs world"],
  ["PONKE", "Ponke"],
  ["MYRO", "Myro"],
  ["SLERF", "Slerf"],
  ["BOME", "BOOK OF MEME"],
  ["TURBO", "Turbo"],
  ["MOG", "Mog Coin"],
  ["TOSHI", "Toshi"],
  ["DEGEN", "Degen"],
  ["CHAD", "Chad"],
  ["MOCHI", "Mochi"],
  ["FWOG", "Fwog"],
  ["GIGA", "Gigachad"],
  ["PORK", "PepeFork"],
  ["NEIRO", "Neiro"],
  ["GOAT", "Goatseus Maximus"],
  ["ACT", "Act I: The AI Prophecy"],
  ["MOODENG", "Moo Deng"],
  ["SPX", "SPX6900"],
  ["BILLY", "Billy"],
  ["SUNDOG", "Sundog"],
  ["CHILLGUY", "Just a chill guy"],
  ["PNUT", "Peanut the Squirrel"],
  ["SNEK", "Snek"],
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomPrice(): number {
  const tier = Math.random();
  if (tier < 0.3) return randomBetween(0.0000001, 0.001);
  if (tier < 0.6) return randomBetween(0.001, 0.1);
  if (tier < 0.85) return randomBetween(0.1, 10);
  return randomBetween(10, 500);
}

function randomChange(): number {
  return randomBetween(-40, 80);
}

function randomAge(): string {
  const units = ["m", "h", "d"];
  const unit = units[Math.floor(Math.random() * units.length)];
  if (unit === "m") return `${Math.floor(randomBetween(5, 59))}m`;
  if (unit === "h") return `${Math.floor(randomBetween(1, 23))}h`;
  return `${Math.floor(randomBetween(1, 365))}d`;
}

function generateAddress(): string {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 8; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr + "...";
}

export function generateTokens(count: number = 30): Token[] {
  const tokens: Token[] = [];

  for (let i = 0; i < count; i++) {
    const [symbol, name] = tokenNames[i % tokenNames.length];
    const chain = chains[Math.floor(Math.random() * chains.length)];
    const price = randomPrice();
    const volume = randomBetween(10000, 50000000);
    const liquidity = randomBetween(5000, 10000000);
    const marketCap = randomBetween(50000, 500000000);
    const txns = Math.floor(randomBetween(100, 50000));

    tokens.push({
      id: `${symbol}-${i}`,
      rank: i + 1,
      name: name + (i >= tokenNames.length ? ` ${Math.floor(i / tokenNames.length) + 1}` : ""),
      symbol: symbol + (i >= tokenNames.length ? `${Math.floor(i / tokenNames.length) + 1}` : ""),
      chain: chain.name,
      chainIcon: chain.icon,
      price,
      priceChange5m: randomChange(),
      priceChange1h: randomChange(),
      priceChange6h: randomChange(),
      priceChange24h: randomChange(),
      volume24h: volume,
      liquidity,
      marketCap,
      age: randomAge(),
      txns24h: txns,
      buyers24h: Math.floor(txns * randomBetween(0.3, 0.7)),
      sellers24h: Math.floor(txns * randomBetween(0.3, 0.7)),
      dex: dexes[Math.floor(Math.random() * dexes.length)],
      pairAddress: generateAddress(),
      isNew: Math.random() > 0.7,
    });
  }

  return tokens;
}

export function formatPrice(price: number): string {
  if (price < 0.00001) return price.toExponential(2);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  if (price < 1000) return price.toFixed(2);
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}
