"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";

type Timeframe = "5m" | "15m" | "1h" | "4h" | "1d";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

function generateCandles(count: number, basePrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * price * 0.04;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.02;
    const low = Math.min(open, close) - Math.random() * price * 0.02;
    const volume = Math.random() * 100000 + 5000;
    candles.push({ open, high, low, close, volume, time: now - (count - i) * 300000 });
    price = close;
  }
  return candles;
}

function formatChartPrice(p: number): string {
  if (p < 0.001) return p.toExponential(2);
  if (p < 1) return p.toFixed(6);
  return p.toFixed(2);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function CandlestickChart({ basePrice }: { basePrice: number }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [viewRange, setViewRange] = useState({ start: 0, end: 100 });
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; rangeStart: number; rangeEnd: number } | null>(null);

  const allCandles = useMemo(() => generateCandles(100, basePrice), [basePrice, timeframe]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const candles = allCandles.slice(viewRange.start, viewRange.end);
  const padding = { top: 20, bottom: 40, left: 10, right: 70 };
  const chartW = dimensions.width - padding.left - padding.right;
  const chartH = dimensions.height - padding.top - padding.bottom;

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const pricePad = (maxPrice - minPrice) * 0.05;
  const yMin = minPrice - pricePad;
  const yMax = maxPrice + pricePad;
  const priceRange = yMax - yMin || 1;

  const candleW = chartW / candles.length;
  const bodyW = Math.max(candleW * 0.6, 2);

  const priceToY = useCallback((p: number) => padding.top + chartH - ((p - yMin) / priceRange) * chartH, [chartH, yMin, priceRange]);
  const yToPrice = useCallback((y: number) => yMin + ((padding.top + chartH - y) / chartH) * priceRange, [chartH, yMin, priceRange]);
  const xToIndex = useCallback((x: number) => Math.floor((x - padding.left) / candleW), [candleW]);

  // Zoom with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 5 : -5;
    setViewRange((prev) => {
      const range = prev.end - prev.start;
      const newStart = Math.max(0, prev.start + zoomFactor);
      const newEnd = Math.min(allCandles.length, prev.end - zoomFactor);
      if (newEnd - newStart < 10 || newEnd - newStart > allCandles.length) return prev;
      return { start: newStart, end: newEnd };
    });
  }, [allCandles.length]);

  // Pan with drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, rangeStart: viewRange.start, rangeEnd: viewRange.end });
  }, [viewRange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouse({ x, y });

    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x;
      const candleShift = Math.round(dx / (candleW || 10));
      const range = dragStart.rangeEnd - dragStart.rangeStart;
      let newStart = dragStart.rangeStart - candleShift;
      let newEnd = dragStart.rangeEnd - candleShift;
      if (newStart < 0) { newStart = 0; newEnd = range; }
      if (newEnd > allCandles.length) { newEnd = allCandles.length; newStart = allCandles.length - range; }
      setViewRange({ start: newStart, end: newEnd });
    }
  }, [isDragging, dragStart, candleW, allCandles.length]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouse(null);
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Crosshair data
  const hoveredIndex = mouse ? xToIndex(mouse.x) : -1;
  const hoveredCandle = hoveredIndex >= 0 && hoveredIndex < candles.length ? candles[hoveredIndex] : null;
  const crosshairPrice = mouse ? yToPrice(mouse.y) : null;

  // Grid
  const gridLines = 6;
  const gridPrices = Array.from({ length: gridLines }, (_, i) => yMin + (priceRange / (gridLines - 1)) * i);

  const maxVol = Math.max(...candles.map((c) => c.volume));

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-1 bg-background rounded-lg p-0.5">
          {(["5m", "15m", "1h", "4h", "1d"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => { setTimeframe(tf); setViewRange({ start: 0, end: 100 }); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                timeframe === tf ? "bg-accent-dim text-accent" : "text-muted hover:text-foreground-secondary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {hoveredCandle ? (
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-muted">O <span className="text-foreground-secondary">{formatChartPrice(hoveredCandle.open)}</span></span>
            <span className="text-muted">H <span className="text-foreground-secondary">{formatChartPrice(hoveredCandle.high)}</span></span>
            <span className="text-muted">L <span className="text-foreground-secondary">{formatChartPrice(hoveredCandle.low)}</span></span>
            <span className="text-muted">C <span className={hoveredCandle.close >= hoveredCandle.open ? "text-green" : "text-red"}>{formatChartPrice(hoveredCandle.close)}</span></span>
            <span className="text-muted">V <span className="text-foreground-secondary">{hoveredCandle.volume > 1000 ? `${(hoveredCandle.volume / 1000).toFixed(1)}K` : hoveredCandle.volume.toFixed(0)}</span></span>
          </div>
        ) : (
          <div className="text-[10px] text-muted/40">Scroll to zoom · Drag to pan</div>
        )}
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: "400px", cursor: isDragging ? "grabbing" : "crosshair" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <svg width={dimensions.width} height={dimensions.height} className="block">
          {/* Grid */}
          {gridPrices.map((p, i) => (
            <g key={i}>
              <line x1={padding.left} y1={priceToY(p)} x2={dimensions.width - padding.right} y2={priceToY(p)} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <text x={dimensions.width - padding.right + 8} y={priceToY(p) + 3} fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">{formatChartPrice(p)}</text>
            </g>
          ))}

          {/* Time labels */}
          {candles.filter((_, i) => i % Math.max(1, Math.floor(candles.length / 8)) === 0).map((c, i) => {
            const idx = candles.indexOf(c);
            const x = padding.left + idx * candleW + candleW / 2;
            return (
              <text key={i} x={x} y={dimensions.height - 8} fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace" textAnchor="middle">{formatTime(c.time)}</text>
            );
          })}

          {/* Volume bars */}
          {candles.map((c, i) => {
            const volH = (c.volume / maxVol) * 50;
            const x = padding.left + i * candleW + candleW / 2 - bodyW / 2;
            const isGreen = c.close >= c.open;
            return <rect key={`v-${i}`} x={x} y={dimensions.height - padding.bottom - volH} width={bodyW} height={volH} fill={isGreen ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"} rx={1} />;
          })}

          {/* Candles */}
          {candles.map((c, i) => {
            const x = padding.left + i * candleW + candleW / 2;
            const isGreen = c.close >= c.open;
            const color = isGreen ? "#22c55e" : "#ef4444";
            const bodyTop = priceToY(Math.max(c.open, c.close));
            const bodyBottom = priceToY(Math.min(c.open, c.close));
            const bh = Math.max(bodyBottom - bodyTop, 1);
            const isHovered = i === hoveredIndex;

            return (
              <g key={`c-${i}`}>
                <line x1={x} y1={priceToY(c.high)} x2={x} y2={priceToY(c.low)} stroke={color} strokeWidth={1} opacity={isHovered ? 1 : 0.7} />
                <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bh} fill={color} rx={1} opacity={isHovered ? 1 : 0.85} />
                {isHovered && <rect x={x - bodyW / 2 - 1} y={bodyTop - 1} width={bodyW + 2} height={bh + 2} fill="none" stroke={color} strokeWidth={1} rx={2} opacity={0.5} />}
              </g>
            );
          })}

          {/* Current price line */}
          {candles.length > 0 && (() => {
            const last = candles[candles.length - 1].close;
            const y = priceToY(last);
            const isUp = last >= candles[0].open;
            const col = isUp ? "#22c55e" : "#ef4444";
            return (
              <>
                <line x1={padding.left} y1={y} x2={dimensions.width - padding.right} y2={y} stroke={col} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
                <rect x={dimensions.width - padding.right + 2} y={y - 9} width={66} height={18} rx={4} fill={col} />
                <text x={dimensions.width - padding.right + 35} y={y + 3} fill="white" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{formatChartPrice(last)}</text>
              </>
            );
          })()}

          {/* Crosshair */}
          {mouse && mouse.x > padding.left && mouse.x < dimensions.width - padding.right && mouse.y > padding.top && mouse.y < dimensions.height - padding.bottom && (
            <>
              {/* Vertical */}
              <line x1={mouse.x} y1={padding.top} x2={mouse.x} y2={dimensions.height - padding.bottom} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="3 3" />
              {/* Horizontal */}
              <line x1={padding.left} y1={mouse.y} x2={dimensions.width - padding.right} y2={mouse.y} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="3 3" />
              {/* Price label */}
              {crosshairPrice !== null && (
                <>
                  <rect x={dimensions.width - padding.right + 2} y={mouse.y - 9} width={66} height={18} rx={4} fill="rgba(255,255,255,0.1)" />
                  <text x={dimensions.width - padding.right + 35} y={mouse.y + 3} fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="monospace" textAnchor="middle">{formatChartPrice(crosshairPrice)}</text>
                </>
              )}
              {/* Time label */}
              {hoveredCandle && (
                <>
                  <rect x={mouse.x - 22} y={dimensions.height - padding.bottom + 4} width={44} height={16} rx={4} fill="rgba(255,255,255,0.1)" />
                  <text x={mouse.x} y={dimensions.height - padding.bottom + 15} fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="monospace" textAnchor="middle">{formatTime(hoveredCandle.time)}</text>
                </>
              )}
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredCandle && mouse && (
          <div
            className="absolute pointer-events-none z-20 bg-card/95 backdrop-blur-md border border-border-bright rounded-lg px-3 py-2 shadow-2xl"
            style={{
              left: mouse.x + 20 > dimensions.width - 200 ? mouse.x - 170 : mouse.x + 20,
              top: Math.min(mouse.y, dimensions.height - 120),
            }}
          >
            <p className="text-[10px] text-muted font-mono mb-1.5">{new Date(hoveredCandle.time).toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-muted">Open</span><span className="font-mono text-foreground text-right">{formatChartPrice(hoveredCandle.open)}</span>
              <span className="text-muted">High</span><span className="font-mono text-foreground text-right">{formatChartPrice(hoveredCandle.high)}</span>
              <span className="text-muted">Low</span><span className="font-mono text-foreground text-right">{formatChartPrice(hoveredCandle.low)}</span>
              <span className="text-muted">Close</span><span className={`font-mono text-right font-medium ${hoveredCandle.close >= hoveredCandle.open ? "text-green" : "text-red"}`}>{formatChartPrice(hoveredCandle.close)}</span>
              <span className="text-muted">Volume</span><span className="font-mono text-foreground text-right">{hoveredCandle.volume > 1000 ? `${(hoveredCandle.volume / 1000).toFixed(1)}K` : hoveredCandle.volume.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
