"use client";

import { useState, useEffect, useCallback } from "react";

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardHover: string;
  border: string;
  borderBright: string;
  foreground: string;
  foregroundSecondary: string;
  muted: string;
  green: string;
  red: string;
  accent: string;
  accentBright: string;
}

export type ThemeMode = "dark" | "light" | "custom";

const darkTheme: ThemeColors = {
  background: "#09090b",
  surface: "#111113",
  card: "#16161a",
  cardHover: "#1c1c21",
  border: "rgba(255, 255, 255, 0.06)",
  borderBright: "rgba(255, 255, 255, 0.1)",
  foreground: "#fafafa",
  foregroundSecondary: "#a1a1aa",
  muted: "#52525b",
  green: "#22c55e",
  red: "#ef4444",
  accent: "#818cf8",
  accentBright: "#a5b4fc",
};

const lightTheme: ThemeColors = {
  background: "#f8f9fa",
  surface: "#ffffff",
  card: "#ffffff",
  cardHover: "#f1f3f5",
  border: "rgba(0, 0, 0, 0.08)",
  borderBright: "rgba(0, 0, 0, 0.15)",
  foreground: "#111113",
  foregroundSecondary: "#495057",
  muted: "#868e96",
  green: "#16a34a",
  red: "#dc2626",
  accent: "#6366f1",
  accentBright: "#818cf8",
};

function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--card-bg", colors.card);
  root.style.setProperty("--card-hover", colors.cardHover);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--border-bright", colors.borderBright);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--foreground-secondary", colors.foregroundSecondary);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--green", colors.green);
  root.style.setProperty("--red", colors.red);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-bright", colors.accentBright);
  root.style.setProperty("--green-dim", colors.green + "1f");
  root.style.setProperty("--red-dim", colors.red + "1f");
  root.style.setProperty("--accent-dim", colors.accent + "1a");
  root.style.setProperty("--gradient-start", colors.accent);
  root.style.setProperty("--gradient-end", colors.accentBright);
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [customColors, setCustomColors] = useState<ThemeColors>(darkTheme);

  useEffect(() => {
    const saved = localStorage.getItem("slop-theme-mode");
    const savedCustom = localStorage.getItem("slop-theme-custom");
    if (saved) setMode(saved as ThemeMode);
    if (savedCustom) {
      try { setCustomColors(JSON.parse(savedCustom)); } catch {}
    }
  }, []);

  useEffect(() => {
    const colors = mode === "light" ? lightTheme : mode === "custom" ? customColors : darkTheme;
    applyTheme(colors);
    localStorage.setItem("slop-theme-mode", mode);
  }, [mode, customColors]);

  const updateCustomColor = useCallback((key: keyof ThemeColors, value: string) => {
    setCustomColors((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("slop-theme-custom", JSON.stringify(next));
      return next;
    });
  }, []);

  const resetCustom = useCallback(() => {
    setCustomColors(darkTheme);
    localStorage.setItem("slop-theme-custom", JSON.stringify(darkTheme));
  }, []);

  return {
    mode,
    setMode,
    customColors,
    updateCustomColor,
    resetCustom,
    darkTheme,
    lightTheme,
  };
}
