import { PumpCoin } from "./pumpApi";

export interface RiskResult {
  score: number; // 0-100
  label: "High Risk" | "Med Risk" | "Low Risk";
  color: string; // tailwind-compatible color token
  bgColor: string;
  dotColor: string;
}

/**
 * Calculate a rug-pull risk score (0-100) for a PumpCoin.
 * Higher score = safer token.
 *
 * Factors (weights sum to 100):
 *   - Token age:        25 pts
 *   - Reply count:      20 pts
 *   - Socials present:  20 pts
 *   - Liquidity ratio:  20 pts
 *   - Graduated:        15 pts
 */
export function calculateRiskScore(coin: PumpCoin): RiskResult {
  let score = 0;

  // 1. Token age (25 pts) — older is safer
  //    0 pts if < 10 min, scales linearly to 25 pts at 24h+
  const ageMs = Date.now() - coin.created_timestamp;
  const ageMinutes = ageMs / 60_000;
  if (ageMinutes >= 1440) {
    score += 25; // 24h+
  } else if (ageMinutes >= 10) {
    score += Math.round((ageMinutes / 1440) * 25);
  }
  // < 10 min => 0 pts

  // 2. Reply count (20 pts) — more engagement is safer
  //    0 replies = 0, 5+ = 5, 20+ = 10, 50+ = 15, 100+ = 20
  const replies = coin.reply_count || 0;
  if (replies >= 100) score += 20;
  else if (replies >= 50) score += 15;
  else if (replies >= 20) score += 10;
  else if (replies >= 5) score += 5;

  // 3. Socials (20 pts) — each present social adds points
  //    twitter = 8, website = 7, telegram = 5
  if (coin.twitter) score += 8;
  if (coin.website) score += 7;
  if (coin.telegram) score += 5;

  // 4. Liquidity ratio (20 pts) — real_sol_reserves vs market_cap
  //    Higher real reserves relative to market cap = healthier
  //    Use real_sol_reserves (in lamports) converted to SOL
  if (coin.market_cap > 0 && coin.real_sol_reserves > 0) {
    const realSol = coin.real_sol_reserves / 1_000_000_000;
    const ratio = realSol / coin.market_cap; // reserves-to-mcap ratio
    // ratio of 0.5+ is great (20pts), scales down linearly
    if (ratio >= 0.5) score += 20;
    else score += Math.round((ratio / 0.5) * 20);
  }

  // 5. Graduated / complete (15 pts) — graduated tokens have proven demand
  if (coin.complete) score += 15;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  return toRiskResult(score);
}

function toRiskResult(score: number): RiskResult {
  if (score >= 70) {
    return {
      score,
      label: "Low Risk",
      color: "#22c55e",
      bgColor: "#22c55e18",
      dotColor: "#22c55e",
    };
  }
  if (score >= 40) {
    return {
      score,
      label: "Med Risk",
      color: "#eab308",
      bgColor: "#eab30818",
      dotColor: "#eab308",
    };
  }
  return {
    score,
    label: "High Risk",
    color: "#ef4444",
    bgColor: "#ef444418",
    dotColor: "#ef4444",
  };
}
