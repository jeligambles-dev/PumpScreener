"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TwitterData {
  name: string;
  handle: string;
  description: string;
  members: number | null;
  following: number | null;
  followers: number | null;
  createdAt: string | null;
  avatar: string | null;
  banner: string | null;
}

function extractHandle(url: string): string {
  if (!url) return "";
  const cleaned = url.replace(/\/$/, "").replace(/\?.*$/, "");
  const parts = cleaned.split("/");
  const last = parts[parts.length - 1];
  return last?.replace(/^@/, "") || "";
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function TwitterHoverCard({
  twitterUrl,
  tokenName,
  tokenImage,
  tokenDescription,
  age,
  isProfile,
  children,
}: {
  twitterUrl: string;
  tokenName: string;
  tokenImage?: string;
  tokenDescription?: string;
  age?: string;
  isProfile?: boolean;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [twitterData, setTwitterData] = useState<TwitterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrowSide: "bottom" | "top" }>({ top: 0, left: 0, arrowSide: "bottom" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const handle = extractHandle(twitterUrl);

  const CARD_W = 280;
  const CARD_H_EST = 380;

  const calcPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: center on trigger, clamp to viewport
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.max(8, Math.min(left, vw - CARD_W - 8));

    // Vertical: prefer above, fall back to below
    let arrowSide: "bottom" | "top" = "bottom";
    let top = rect.top - CARD_H_EST - 8;
    if (top < 8) {
      top = rect.bottom + 8;
      arrowSide = "top";
    }
    // Clamp vertically
    top = Math.max(8, Math.min(top, vh - CARD_H_EST - 8));

    setPos({ top, left, arrowSide });
  }, []);

  const fetchData = useCallback(async () => {
    if (!handle || twitterData) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/twitter-preview?handle=${encodeURIComponent(handle)}`);
      if (res.ok) {
        const data = await res.json();
        setTwitterData(data);
      } else {
        setTwitterData({
          name: tokenName, handle,
          description: tokenDescription || "",
          members: null, following: null, followers: null,
          createdAt: null, avatar: tokenImage || null, banner: null,
        });
      }
    } catch {
      setTwitterData({
        name: tokenName, handle,
        description: tokenDescription || "",
        members: null, following: null, followers: null,
        createdAt: null, avatar: tokenImage || null, banner: null,
      });
    } finally {
      setLoading(false);
    }
  }, [handle, twitterData, tokenName, tokenDescription, tokenImage]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      calcPosition();
      setShow(true);
      fetchData();
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

  if (!handle) return <>{children}</>;

  const data = twitterData;

  const card = show ? createPortal(
    <div
      ref={cardRef}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, width: CARD_W }}
      onMouseEnter={handleCardEnter}
      onMouseLeave={handleCardLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#1a1d21] border border-[#2f3336] rounded-2xl overflow-hidden shadow-2xl shadow-black/60" style={{ animation: "tvFadeIn 0.15s ease-out" }}>
        {/* Banner */}
        <div
          className="h-[72px] w-full"
          style={{
            background: data?.banner
              ? `url(${data.banner}) center/cover`
              : "linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)",
          }}
        />

        {/* Avatar */}
        <div className="px-4 -mt-6 relative">
          {data?.avatar || tokenImage ? (
            <img
              src={data?.avatar || tokenImage}
              alt=""
              className="w-12 h-12 rounded-full border-[3px] border-[#1a1d21] object-cover bg-[#2f3336]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1a1d21] bg-[#2f3336] flex items-center justify-center text-white text-sm font-bold">
              {handle.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-4 pt-2">
          {loading ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-4 h-4 border-2 border-[#1d9bf0]/30 border-t-[#1d9bf0] rounded-full animate-spin" />
              <span className="text-xs text-[#71767b]">Loading...</span>
            </div>
          ) : (
            <>
              {/* Name + X badge + age */}
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-[15px] font-bold text-white leading-tight truncate max-w-[180px]">
                  {data?.name || tokenName}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {age && <span className="text-xs font-medium text-[#1d9bf0]">{age}</span>}
                </div>
              </div>

              {/* Description */}
              {(data?.description || tokenDescription) && (
                <p className="text-[13px] text-[#e7e9ea] leading-snug mt-2" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {data?.description || tokenDescription}
                </p>
              )}

              {/* Members (community only) */}
              {!isProfile && data?.members !== null && data?.members !== undefined && (
                <p className="text-[13px] text-[#e7e9ea] mt-2">
                  <span className="font-bold">{formatNumber(data.members)}</span>
                  <span className="text-[#71767b]"> Members</span>
                </p>
              )}

              {/* Handle */}
              {isProfile && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[13px] text-[#71767b]">@{handle}</span>
                  {data?.followers !== null && data?.followers !== undefined && data.followers > 1000 && (
                    <svg className="w-3.5 h-3.5 text-[#1d9bf0] shrink-0" viewBox="0 0 22 22" fill="currentColor">
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.47.751-1.054.882-1.69.132-.633.083-1.29-.14-1.896.587-.273 1.084-.705 1.438-1.245.354-.54.551-1.171.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  )}
                </div>
              )}

              {!isProfile && (
                <>
                  {/* Divider */}
                  <div className="border-t border-[#2f3336] my-3" />

                  {/* Created by */}
                  <div className="text-[11px] text-[#71767b] uppercase tracking-wide mb-2">Created by</div>
                  <div className="flex items-center gap-2">
                    {data?.avatar || tokenImage ? (
                      <img src={data?.avatar || tokenImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#2f3336] flex items-center justify-center text-white text-[10px] font-bold">
                        {handle.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-white truncate">{data?.name || handle}</span>
                        {data?.followers !== null && data?.followers !== undefined && data.followers > 1000 && (
                          <svg className="w-3.5 h-3.5 text-[#1d9bf0] shrink-0" viewBox="0 0 22 22" fill="currentColor">
                            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.47.751-1.054.882-1.69.132-.633.083-1.29-.14-1.896.587-.273 1.084-.705 1.438-1.245.354-.54.551-1.171.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-[#71767b]">@{handle}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Stats */}
              {(data?.following !== null || data?.followers !== null) && (
                <div className="flex items-center gap-4 mt-3">
                  {data?.following !== null && (
                    <div className="text-[13px]">
                      <span className="font-bold text-white">{formatNumber(data?.following ?? 0)}</span>
                      <span className="text-[#71767b]"> Following</span>
                    </div>
                  )}
                  {data?.followers !== null && (
                    <div className="text-[13px]">
                      <span className="font-bold text-white">{formatNumber(data?.followers ?? 0)}</span>
                      <span className="text-[#71767b]"> Followers</span>
                    </div>
                  )}
                </div>
              )}

              {/* View on X button */}
              <a
                href={twitterUrl.startsWith("http") ? twitterUrl : `https://x.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 w-full py-2 rounded-full text-center text-sm font-bold bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {isProfile ? "View profile on X" : "View community on X"}
              </a>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tvFadeIn {
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
