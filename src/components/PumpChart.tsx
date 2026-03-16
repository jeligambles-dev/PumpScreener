"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
type ChartType = "candle" | "line";
type PriceMode = "USD" | "MCAP";

interface CandlePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  openMcap: number;
  highMcap: number;
  lowMcap: number;
  closeMcap: number;
  volume: number;
}

const TF_MINUTES: Record<Timeframe, number> = {
  "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440,
};

function generateCandles(count: number, basePrice: number, baseMcap: number, tfMinutes: number): CandlePoint[] {
  // First pass: generate raw random-walk prices
  const raw: { open: number; high: number; low: number; close: number; volume: number }[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const open = price;
    const volatility = 0.04;
    let high = open;
    let low = open;

    for (let j = 0; j < 4; j++) {
      const change = (Math.random() - 0.47) * price * volatility;
      price = Math.max(price * 0.05, price + change);
      high = Math.max(high, price);
      low = Math.min(low, price);
    }

    raw.push({ open, high, low, close: price, volume: Math.random() * baseMcap * 0.01 });
  }

  // Normalize so the last candle's close matches basePrice exactly
  const finalClose = raw[raw.length - 1].close;
  const scale = finalClose > 0 ? basePrice / finalClose : 1;
  const mcapPerPrice = basePrice > 0 ? baseMcap / basePrice : 1;
  const now = Math.floor(Date.now() / 1000);
  const interval = tfMinutes * 60;

  return raw.map((r, i) => {
    const o = r.open * scale;
    const h = r.high * scale;
    const l = r.low * scale;
    const c = r.close * scale;
    return {
      time: now - (count - i) * interval,
      open: o, high: h, low: l, close: c,
      openMcap: o * mcapPerPrice,
      highMcap: h * mcapPerPrice,
      lowMcap: l * mcapPerPrice,
      closeMcap: c * mcapPerPrice,
      volume: r.volume,
    };
  });
}

export default function PumpChart({
  basePrice,
  baseMcap,
}: {
  basePrice: number;
  baseMcap: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [priceMode, setPriceMode] = useState<PriceMode>("USD");

  const data = useMemo(
    () => generateCandles(200, basePrice, baseMcap, TF_MINUTES[timeframe]),
    [basePrice, baseMcap, timeframe]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
        fontFamily: "'Geist Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.15)",
          width: 1,
          style: 2,
          labelBackgroundColor: "rgba(255, 255, 255, 0.12)",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.15)",
          width: 1,
          style: 2,
          labelBackgroundColor: "rgba(255, 255, 255, 0.12)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        scaleMargins: { top: 0.08, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const isUsd = priceMode === "USD";

    // Price format options
    const mcapFormatter = (price: number) => {
      if (price >= 1_000_000_000) return `$${(price / 1_000_000_000).toFixed(2)}B`;
      if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
      if (price >= 1_000) return `$${(price / 1_000).toFixed(1)}K`;
      return `$${price.toFixed(0)}`;
    };

    const usdFormatter = (price: number) => {
      if (price === 0) return "$0";
      if (price < 0.00000001) return `$${price.toExponential(2)}`;
      if (price < 0.0001) return `$${price.toFixed(8)}`;
      if (price < 0.01) return `$${price.toFixed(6)}`;
      if (price < 1) return `$${price.toFixed(4)}`;
      return `$${price.toFixed(2)}`;
    };

    const priceFormat = !isUsd
      ? { type: "custom" as const, formatter: mcapFormatter, minMove: 1 }
      : isUsd && basePrice < 0.01
        ? { type: "custom" as const, formatter: usdFormatter, minMove: 0.00000001 }
        : { type: "custom" as const, formatter: usdFormatter, minMove: 0.0001 };

    if (chartType === "candle") {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e88",
        wickDownColor: "#ef444488",
        priceFormat,
      });

      const candleData: CandlestickData[] = data.map((d) => ({
        time: d.time as Time,
        open: isUsd ? d.open : d.openMcap,
        high: isUsd ? d.high : d.highMcap,
        low: isUsd ? d.low : d.lowMcap,
        close: isUsd ? d.close : d.closeMcap,
      }));

      candleSeries.setData(candleData);
    } else {
      const isUp = data.length > 1 && (isUsd
        ? data[data.length - 1].close >= data[0].open
        : data[data.length - 1].closeMcap >= data[0].openMcap);
      const lineColor = isUp ? "#22c55e" : "#ef4444";

      const lineData = data.map((d) => ({
        time: d.time as Time,
        value: isUsd ? d.close : d.closeMcap,
      }));

      chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#ffffff",
        crosshairMarkerBorderWidth: 2,
        priceFormat,
      }).setData(lineData);

      chart.addSeries(AreaSeries, {
        topColor: lineColor + "30",
        bottomColor: lineColor + "05",
        lineColor: "transparent",
        lineWidth: 1,
        priceFormat,
      }).setData(lineData);
    }

    // Volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeries.setData(data.map((d) => ({
      time: d.time as Time,
      value: d.volume,
      color: (isUsd ? d.close >= d.open : d.closeMcap >= d.openMcap)
        ? "rgba(34, 197, 94, 0.2)"
        : "rgba(239, 68, 68, 0.2)",
    })));

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) chart.applyOptions({ width });
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, chartType, priceMode, basePrice, baseMcap]);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Timeframes */}
          <div className="flex items-center gap-0.5 bg-background rounded-lg p-0.5">
            {(["1m", "5m", "15m", "1h", "4h", "1d"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  timeframe === tf ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart type */}
          <div className="flex items-center gap-0.5 bg-background rounded-lg p-0.5">
            <button
              onClick={() => setChartType("candle")}
              className={`px-2 py-1 rounded-md transition-all ${
                chartType === "candle" ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
              }`}
              title="Candlestick"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="2" height="12" rx="0.5" />
                <rect x="3.75" y="0" width="0.5" height="2" />
                <rect x="3.75" y="14" width="0.5" height="2" />
                <rect x="7" y="5" width="2" height="8" rx="0.5" />
                <rect x="7.75" y="3" width="0.5" height="2" />
                <rect x="7.75" y="13" width="0.5" height="2" />
                <rect x="11" y="1" width="2" height="10" rx="0.5" />
                <rect x="11.75" y="0" width="0.5" height="1" />
                <rect x="11.75" y="11" width="0.5" height="3" />
              </svg>
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-2 py-1 rounded-md transition-all ${
                chartType === "line" ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
              }`}
              title="Line"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,12 4,7 7,9 10,3 15,6" />
              </svg>
            </button>
          </div>

          {/* Price mode */}
          <div className="flex items-center gap-0.5 bg-background rounded-lg p-0.5">
            {(["USD", "MCAP"] as PriceMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setPriceMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  priceMode === mode ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-muted/40">Scroll to zoom &middot; Drag to pan</div>
      </div>

      {/* Chart */}
      <div ref={containerRef} style={{ height: "400px" }} />
    </div>
  );
}
