import { PumpCoin, GraduatedCoin } from "./pumpApi";
import { Filters } from "@/components/FilterPanel";
import { calculateRiskScore } from "./riskScore";

function parseNum(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function inRange(value: number, minStr: string, maxStr: string): boolean {
  const min = parseNum(minStr);
  const max = parseNum(maxStr);
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

function ageInHours(timestamp: number): number {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
}

export function filterPumpCoins(coins: PumpCoin[], filters: Filters, paidMap?: Record<string, boolean>): PumpCoin[] {
  return coins.filter((c) => {
    // Paid filter
    if (filters.paidFilter && paidMap) {
      const isPaid = paidMap[c.mint] ?? false;
      if (filters.paidFilter === "paid" && !isPaid) return false;
      if (filters.paidFilter === "notpaid" && isPaid) return false;
    }

    // Risk level filter
    if (filters.riskLevel) {
      const risk = calculateRiskScore(c);
      if (filters.riskLevel === "low" && risk.label !== "Low Risk") return false;
      if (filters.riskLevel === "med" && risk.label !== "Med Risk") return false;
      if (filters.riskLevel === "high" && risk.label !== "High Risk") return false;
    }

    // Buyback only
    if (filters.buybackOnly && !c.is_cashback_enabled) return false;

    // Agent only
    if (filters.agentOnly && !c.tokenized_agent) return false;

    // Market cap (USD)
    if (!inRange(c.usd_market_cap, filters.mcapMin, filters.mcapMax)) return false;

    // Liquidity — real_sol_reserves in lamports, convert to SOL
    const liqSol = c.real_sol_reserves / 1e9;
    if (!inRange(liqSol, filters.liquidityMin, filters.liquidityMax)) return false;

    // Pair age in hours
    if (!inRange(ageInHours(c.created_timestamp), filters.ageMin, filters.ageMax)) return false;

    return true;
  });
}

export function filterGraduatedCoins(coins: GraduatedCoin[], filters: Filters, paidMap?: Record<string, boolean>): GraduatedCoin[] {
  return coins.filter((c) => {
    // Paid filter
    if (filters.paidFilter && paidMap) {
      const isPaid = paidMap[c.coinMint] ?? false;
      if (filters.paidFilter === "paid" && !isPaid) return false;
      if (filters.paidFilter === "notpaid" && isPaid) return false;
    }

    // Risk level — not available for graduated coins, skip if set
    // Buyback / Agent — not available for graduated coins, skip if set

    // Market cap
    if (!inRange(c.marketCap, filters.mcapMin, filters.mcapMax)) return false;

    // Pair age in hours (from graduation date)
    if (!inRange(ageInHours(c.graduationDate), filters.ageMin, filters.ageMax)) return false;

    // Volume
    if (!inRange(c.volume, filters.volMin, filters.volMax)) return false;

    // Total transactions
    if (!inRange(c.transactions, filters.txnsMin, filters.txnsMax)) return false;

    // Buys
    if (!inRange(c.buyTransactions, filters.buysMin, filters.buysMax)) return false;

    // Sells
    if (!inRange(c.sellTransactions, filters.sellsMin, filters.sellsMax)) return false;

    return true;
  });
}
