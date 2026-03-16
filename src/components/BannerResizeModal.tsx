"use client";

import { useState, useRef, useCallback } from "react";

const TARGET_W = 1500;
const TARGET_H = 500;

export default function BannerResizeModal({ onClose }: { onClose: () => void }) {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [sourcePreview, setSourcePreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSourcePreview(url);
      setResultUrl("");
      const img = new Image();
      img.onload = () => setSourceImg(img);
      img.src = url;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files?.[0] || null);
    },
    [handleFile]
  );

  const resize = useCallback(() => {
    if (!sourceImg || !canvasRef.current) return;
    setProcessing(true);
    const canvas = canvasRef.current;
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d")!;

    const srcRatio = sourceImg.width / sourceImg.height;
    const tgtRatio = TARGET_W / TARGET_H;
    let sx = 0, sy = 0, sw = sourceImg.width, sh = sourceImg.height;

    if (srcRatio > tgtRatio) {
      sw = sourceImg.height * tgtRatio;
      sx = (sourceImg.width - sw) / 2;
    } else {
      sh = sourceImg.width / tgtRatio;
      sy = (sourceImg.height - sh) / 2;
    }

    ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
    setResultUrl(canvas.toDataURL("image/png"));
    setProcessing(false);
  }, [sourceImg]);

  const download = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "banner-1500x500.png";
    a.click();
  }, [resultUrl]);

  const reset = () => {
    setSourcePreview("");
    setSourceImg(null);
    setResultUrl("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-background border border-border-bright rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Banner Resizer</h2>
            <p className="text-xs text-muted mt-0.5">
              Upload any image and resize it to {TARGET_W} x {TARGET_H}px
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          {!sourcePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl py-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver ? "border-accent bg-accent/5" : "border-border hover:border-border-bright"
              }`}
            >
              <svg className="w-10 h-10 text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-foreground-secondary">Drop an image here or click to upload</p>
              <p className="text-xs text-muted mt-1">PNG, JPG, WEBP, GIF</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wider">
                    Original ({sourceImg?.width} x {sourceImg?.height})
                  </span>
                  <button onClick={reset} className="text-xs text-muted hover:text-foreground transition-colors">Remove</button>
                </div>
                <img src={sourcePreview} alt="Source" className="w-full rounded-xl border border-border object-contain" style={{ maxHeight: "200px" }} />
              </div>

              {!resultUrl && (
                <button
                  onClick={resize}
                  disabled={!sourceImg || processing}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Resize to ${TARGET_W} x ${TARGET_H}`
                  )}
                </button>
              )}

              {resultUrl && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">
                      Result ({TARGET_W} x {TARGET_H})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: "#22c55e", backgroundColor: "#22c55e15" }}>
                      Ready
                    </span>
                  </div>
                  <img src={resultUrl} alt="Resized banner" className="w-full rounded-xl border border-border" style={{ aspectRatio: "3/1" }} />
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={download}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
                    >
                      Download Banner
                    </button>
                    <button
                      onClick={reset}
                      className="px-4 py-3 rounded-xl text-sm font-medium bg-surface border border-border text-foreground-secondary hover:text-foreground hover:border-border-bright transition-all"
                    >
                      New Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
