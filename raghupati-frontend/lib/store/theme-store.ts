import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentColor = "violet" | "blue" | "emerald" | "rose" | "orange" | "cyan";
export type BorderRadius = "small" | "medium" | "large";
export type GlassIntensity = "subtle" | "medium" | "strong";

interface ThemeState {
  // Theme preferences
  accentColor: AccentColor;
  borderRadius: BorderRadius;
  glassIntensity: GlassIntensity;
  animationsEnabled: boolean;
  
  // Actions
  setAccentColor: (color: AccentColor) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  setGlassIntensity: (intensity: GlassIntensity) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  toggleAnimations: () => void;
  resetToDefaults: () => void;
}

export const accentColors: { id: AccentColor; label: string; hex: string; tw: string }[] = [
  { id: "violet", label: "Violet", hex: "#8b5cf6", tw: "violet" },
  { id: "blue", label: "Blue", hex: "#3b82f6", tw: "blue" },
  { id: "emerald", label: "Emerald", hex: "#10b981", tw: "emerald" },
  { id: "rose", label: "Rose", hex: "#f43f5e", tw: "rose" },
  { id: "orange", label: "Orange", hex: "#f97316", tw: "orange" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4", tw: "cyan" },
];

export const borderRadiusValues: Record<BorderRadius, string> = {
  small: "0.5rem",
  medium: "0.75rem",
  large: "1rem",
};

export const glassIntensityValues: Record<GlassIntensity, { bg: string; border: string }> = {
  subtle: { bg: "0.02", border: "0.04" },
  medium: { bg: "0.04", border: "0.06" },
  strong: { bg: "0.08", border: "0.08" },
};

const DEFAULTS = {
  accentColor: "violet" as AccentColor,
  borderRadius: "medium" as BorderRadius,
  glassIntensity: "medium" as GlassIntensity,
  animationsEnabled: true,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: DEFAULTS.accentColor,
      borderRadius: DEFAULTS.borderRadius,
      glassIntensity: DEFAULTS.glassIntensity,
      animationsEnabled: DEFAULTS.animationsEnabled,
      
      setAccentColor: (color) => {
        set({ accentColor: color });
        updateCSSVariables(color, get().borderRadius, get().glassIntensity);
      },
      
      setBorderRadius: (radius) => {
        set({ borderRadius: radius });
        updateCSSVariables(get().accentColor, radius, get().glassIntensity);
      },
      
      setGlassIntensity: (intensity) => {
        set({ glassIntensity: intensity });
        updateCSSVariables(get().accentColor, get().borderRadius, intensity);
      },
      
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      toggleAnimations: () => set((state) => ({ animationsEnabled: !state.animationsEnabled })),
      
      resetToDefaults: () => {
        set(DEFAULTS);
        updateCSSVariables(DEFAULTS.accentColor, DEFAULTS.borderRadius, DEFAULTS.glassIntensity);
      },
    }),
    {
      name: "raghupati-theme-store",
      onRehydrateStorage: () => (state) => {
        if (state) {
          updateCSSVariables(state.accentColor, state.borderRadius, state.glassIntensity);
        }
      },
    }
  )
);

// Helper to get Tailwind classes for accent color
export function getAccentClasses(accentColor: AccentColor) {
  const colorMap: Record<AccentColor, { text: string; bg: string; border: string; glow: string }> = {
    violet: {
      text: "text-violet-400",
      bg: "bg-violet-500",
      border: "border-violet-500/20",
      glow: "shadow-[0_0_20px_rgba(139,92,246,0.3)]",
    },
    blue: {
      text: "text-blue-400",
      bg: "bg-blue-500",
      border: "border-blue-500/20",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    },
    emerald: {
      text: "text-emerald-400",
      bg: "bg-emerald-500",
      border: "border-emerald-500/20",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    },
    rose: {
      text: "text-rose-400",
      bg: "bg-rose-500",
      border: "border-rose-500/20",
      glow: "shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    },
    orange: {
      text: "text-orange-400",
      bg: "bg-orange-500",
      border: "border-orange-500/20",
      glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]",
    },
    cyan: {
      text: "text-cyan-400",
      bg: "bg-cyan-500",
      border: "border-cyan-500/20",
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.3)]",
    },
  };
  return colorMap[accentColor];
}

// Update CSS custom properties
function updateCSSVariables(
  accentColor: AccentColor,
  borderRadius: BorderRadius,
  glassIntensity: GlassIntensity
) {
  if (typeof document === "undefined") return;
  
  const root = document.documentElement;
  const color = accentColors.find((c) => c.id === accentColor);
  const glass = glassIntensityValues[glassIntensity];
  
  if (color) {
    root.style.setProperty("--accent-color", color.hex);
    root.style.setProperty("--accent-tw", color.tw);
  }
  
  root.style.setProperty("--border-radius", borderRadiusValues[borderRadius]);
  root.style.setProperty("--glass-bg", glass.bg);
  root.style.setProperty("--glass-border", glass.border);
}

// Initialize on client
export function initializeTheme() {
  if (typeof window === "undefined") return;
  const state = useThemeStore.getState();
  updateCSSVariables(state.accentColor, state.borderRadius, state.glassIntensity);
}
