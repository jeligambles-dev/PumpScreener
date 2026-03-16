"use client";

export interface Filters {
  riskLevel: string; // "" | "low" | "med" | "high"
  paidFilter: string; // "" | "paid" | "notpaid"
  buybackOnly: boolean;
  agentOnly: boolean;
  liquidityMin: string;
  liquidityMax: string;
  mcapMin: string;
  mcapMax: string;
  ageMin: string;
  ageMax: string;
  // Graduated coins only
  volMin: string;
  volMax: string;
  txnsMin: string;
  txnsMax: string;
  buysMin: string;
  buysMax: string;
  sellsMin: string;
  sellsMax: string;
}

export const defaultFilters: Filters = {
  riskLevel: "",
  paidFilter: "",
  buybackOnly: false,
  agentOnly: false,
  liquidityMin: "", liquidityMax: "",
  mcapMin: "", mcapMax: "",
  ageMin: "", ageMax: "",
  volMin: "", volMax: "",
  txnsMin: "", txnsMax: "",
  buysMin: "", buysMax: "",
  sellsMin: "", sellsMax: "",
};

type RangeField = {
  label: string;
  minKey: keyof Filters;
  maxKey: keyof Filters;
  prefix?: string;
  suffix?: string;
};

const commonFields: RangeField[] = [
  { label: "Market cap", minKey: "mcapMin", maxKey: "mcapMax", prefix: "$" },
  { label: "Liquidity", minKey: "liquidityMin", maxKey: "liquidityMax", prefix: "$" },
  { label: "Pair age", minKey: "ageMin", maxKey: "ageMax", suffix: "hours" },
];

const graduatedFields: RangeField[] = [
  { label: "Volume", minKey: "volMin", maxKey: "volMax", prefix: "$" },
  { label: "Transactions", minKey: "txnsMin", maxKey: "txnsMax" },
  { label: "Buys", minKey: "buysMin", maxKey: "buysMax" },
  { label: "Sells", minKey: "sellsMin", maxKey: "sellsMax" },
];

function RangeInput({
  label,
  minKey,
  maxKey,
  prefix,
  suffix,
  filters,
  onChange,
}: RangeField & { filters: Filters; onChange: (key: keyof Filters, val: string) => void }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="w-[100px] text-right text-xs text-muted shrink-0">{label}:</label>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 flex items-center bg-surface border border-border rounded-lg overflow-hidden">
          {prefix && (
            <span className="text-[10px] text-muted/50 pl-2.5 pr-0.5 shrink-0">{prefix}</span>
          )}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Min"
            value={filters[minKey] as string}
            onChange={(e) => onChange(minKey, e.target.value)}
            className="w-full bg-transparent px-2.5 py-2 text-xs text-foreground placeholder:text-muted/40 focus:outline-none"
          />
          {suffix && (
            <span className="text-[10px] text-muted/50 pr-2.5 pl-0.5 shrink-0">{suffix}</span>
          )}
        </div>
        <div className="flex-1 flex items-center bg-surface border border-border rounded-lg overflow-hidden">
          {prefix && (
            <span className="text-[10px] text-muted/50 pl-2.5 pr-0.5 shrink-0">{prefix}</span>
          )}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Max"
            value={filters[maxKey] as string}
            onChange={(e) => onChange(maxKey, e.target.value)}
            className="w-full bg-transparent px-2.5 py-2 text-xs text-foreground placeholder:text-muted/40 focus:outline-none"
          />
          {suffix && (
            <span className="text-[10px] text-muted/50 pr-2.5 pl-0.5 shrink-0">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters,
  onChange,
  onReset,
  onClose,
  isViral,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, val: string | boolean) => void;
  onReset: () => void;
  onClose: () => void;
  isViral: boolean;
}) {
  const updateField = (key: keyof Filters, val: string) => onChange(key, val);

  const riskOptions = [
    { value: "", label: "All" },
    { value: "low", label: "Low Risk", color: "#22c55e" },
    { value: "med", label: "Med Risk", color: "#eab308" },
    { value: "high", label: "High Risk", color: "#ef4444" },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl h-full bg-background border-l border-border shadow-2xl flex flex-col animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">Filters (Optional)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="text-[10px] text-muted hover:text-foreground-secondary px-2 py-1 rounded-md border border-border transition-colors"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {/* Risk Level */}
          <div className="flex items-center gap-3 py-1.5">
              <label className="w-[100px] text-right text-xs text-muted shrink-0">Risk Level:</label>
              <div className="flex-1 flex items-center gap-1.5">
                {riskOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange("riskLevel", filters.riskLevel === opt.value ? "" : opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      filters.riskLevel === opt.value
                        ? "border-accent/50 bg-accent-dim text-accent"
                        : "border-border bg-surface text-muted hover:border-border-bright"
                    }`}
                  >
                    {opt.color && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: opt.color }} />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

          {/* Paid Filter */}
          <div className="flex items-center gap-3 py-1.5">
              <label className="w-[100px] text-right text-xs text-muted shrink-0">Dex Paid:</label>
              <div className="flex-1 flex items-center gap-1.5">
                {[
                  { value: "", label: "All" },
                  { value: "paid", label: "Paid", color: "#22c55e" },
                  { value: "notpaid", label: "Not Paid", color: "#f25461" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange("paidFilter", filters.paidFilter === opt.value ? "" : opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      filters.paidFilter === opt.value
                        ? "border-accent/50 bg-accent-dim text-accent"
                        : "border-border bg-surface text-muted hover:border-border-bright"
                    }`}
                  >
                    {opt.color && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: opt.color }} />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

          {/* Toggle filters */}
          <div className="flex items-center gap-3 py-1.5">
              <label className="w-[100px] text-right text-xs text-muted shrink-0">Features:</label>
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => onChange("buybackOnly", !filters.buybackOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filters.buybackOnly
                      ? "border-green-500/50 bg-green-500/10 text-green-400"
                      : "border-border bg-surface text-muted hover:border-border-bright"
                  }`}
                >
                  $ Buyback
                  {filters.buybackOnly && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onChange("agentOnly", !filters.agentOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filters.agentOnly
                      ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                      : "border-border bg-surface text-muted hover:border-border-bright"
                  }`}
                >
                  🤖 Agent
                  {filters.agentOnly && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

          {/* Common fields — work for both PumpCoin and GraduatedCoin */}
          <div className="pt-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-1 mb-2">General</p>
          </div>
          {commonFields.map((f) => (
            <RangeInput key={f.label} {...f} filters={filters} onChange={updateField} />
          ))}

          {/* Graduated-only fields */}
          {isViral && (
            <>
              <div className="pt-3">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-widest px-1 mb-2">Activity</p>
              </div>
              {graduatedFields.map((f) => (
                <RangeInput key={f.label} {...f} filters={filters} onChange={updateField} />
              ))}
            </>
          )}
        </div>

        {/* Footer with apply */}
        <div className="border-t border-border px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      <style jsx>{`
        .animate-slideIn {
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
