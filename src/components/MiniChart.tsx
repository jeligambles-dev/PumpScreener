"use client";

import { useMemo } from "react";

/** Simple deterministic PRNG (mulberry32) seeded from a string hash. */
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function MiniChart({ seed, positive }: { seed: string; positive: boolean }) {
  const points = useMemo(() => {
    const rand = mulberry32(hashSeed(seed));
    const pts: number[] = [];
    let val = 50;
    for (let i = 0; i < 24; i++) {
      val += (rand() - (positive ? 0.35 : 0.65)) * 7;
      val = Math.max(5, Math.min(95, val));
      pts.push(val);
    }
    return pts;
  }, [seed, positive]);

  const width = 90;
  const height = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - 2 - ((p - min) / range) * (height - 4),
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const color = positive ? "#22c55e" : "#ef4444";
  const gradientId = `grad-${positive ? "up" : "down"}-${seed.slice(0, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
