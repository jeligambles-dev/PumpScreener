"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SitePreview {
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
  url: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default function WebsiteHoverCard({
  websiteUrl,
  children,
}: {
  websiteUrl: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [preview, setPreview] = useState<SitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const CARD_W = 300;
  const CARD_H_EST = 320;
  const domain = extractDomain(websiteUrl);

  const calcPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(8, Math.min(left, vw - CARD_W - 8));

    let top = rect.top - CARD_H_EST - 8;
    if (top < 8) top = rect.bottom + 8;
    top = Math.max(8, Math.min(top, vh - CARD_H_EST - 8));

    setPos({ top, left });
  }, []);

  const fetchPreview = useCallback(async () => {
    if (preview) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/website-preview?url=${encodeURIComponent(websiteUrl)}`);
      if (res.ok) setPreview(await res.json());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [websiteUrl, preview]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      calcPosition();
      setShow(true);
      fetchPreview();
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 200);
  };

  const handleCardEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleCardLeave = () => {
    timeoutRef.current = setTimeout(() => setShow(false), 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!websiteUrl) return <>{children}</>;

  const card = show ? createPortal(
    <div
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, width: CARD_W }}
      onMouseEnter={handleCardEnter}
      onMouseLeave={handleCardLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#1a1d21] border border-[#2f3336] rounded-2xl overflow-hidden shadow-2xl shadow-black/60" style={{ animation: "whFadeIn 0.15s ease-out" }}>
        {/* OG Image / Banner */}
        {preview?.image ? (
          <div className="w-full h-[140px] overflow-hidden">
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="w-full h-[60px]" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }} />
        )}

        {/* Content */}
        <div className="px-4 pb-4 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-xs text-[#71767b]">Loading preview...</span>
            </div>
          ) : (
            <>
              {/* Favicon + domain */}
              <div className="flex items-center gap-2 mb-2">
                {preview?.favicon ? (
                  <img
                    src={preview.favicon}
                    alt=""
                    className="w-4 h-4 rounded object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded bg-[#2f3336] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[#71767b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
                    </svg>
                  </div>
                )}
                <span className="text-xs text-[#71767b]">{domain}</span>
              </div>

              {/* Title */}
              <h3 className="text-[14px] font-bold text-white leading-tight" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {preview?.title || preview?.siteName || domain}
              </h3>

              {/* Description */}
              {preview?.description && (
                <p className="text-[13px] text-[#8b8d91] leading-snug mt-1.5" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {preview.description}
                </p>
              )}

              {/* Visit button */}
              <a
                href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 w-full py-2 rounded-full text-center text-sm font-bold bg-[#6366f1] hover:bg-[#5558e6] text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Visit website
              </a>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes whFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {card}
    </div>
  );
}
