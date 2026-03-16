"use client";

import { ThemeColors, ThemeMode } from "@/lib/useTheme";

const colorFields: { key: keyof ThemeColors; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "card", label: "Card" },
  { key: "foreground", label: "Text" },
  { key: "foregroundSecondary", label: "Text Secondary" },
  { key: "muted", label: "Muted" },
  { key: "accent", label: "Accent" },
  { key: "accentBright", label: "Accent Bright" },
  { key: "green", label: "Green (Profit)" },
  { key: "red", label: "Red (Loss)" },
];

export default function ThemePanel({
  mode,
  setMode,
  customColors,
  updateCustomColor,
  resetCustom,
  onClose,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  customColors: ThemeColors;
  updateCustomColor: (key: keyof ThemeColors, value: string) => void;
  resetCustom: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] bg-background border border-border-bright rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">Theme Settings</h2>
            <p className="text-xs text-muted mt-0.5">Customize your experience</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Mode selector */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-widest block mb-2">Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "dark", label: "Dark", icon: "🌙" },
                { id: "light", label: "Light", icon: "☀️" },
                { id: "custom", label: "Custom", icon: "🎨" },
              ] as { id: ThemeMode; label: string; icon: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    mode === opt.id
                      ? "border-accent bg-accent-dim text-accent"
                      : "border-border bg-surface text-foreground-secondary hover:border-border-bright"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-widest block mb-2">Preview</label>
            <div className="rounded-xl border border-border overflow-hidden bg-surface p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[8px] font-bold text-white">SS</div>
                <span className="text-sm font-semibold text-foreground">PEPE</span>
                <span className="text-xs text-muted">Pepe</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-foreground">$0.00001234</span>
                <span className="text-green">+12.5%</span>
                <span className="text-red">-3.2%</span>
                <span className="text-accent">$1.2M</span>
              </div>
            </div>
          </div>

          {/* Custom color pickers */}
          {mode === "custom" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-widest">Colors</label>
                <button onClick={resetCustom}
                  className="text-[10px] text-muted hover:text-foreground-secondary transition-colors">
                  Reset to default
                </button>
              </div>
              <div className="space-y-2">
                {colorFields.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-foreground-secondary">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted">{customColors[key]}</span>
                      <div className="relative">
                        <input
                          type="color"
                          value={customColors[key].startsWith("rgba") ? "#888888" : customColors[key]}
                          onChange={(e) => updateCustomColor(key, e.target.value)}
                          className="w-7 h-7 rounded-lg border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
