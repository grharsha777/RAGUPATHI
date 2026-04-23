"use client";

import { motion } from "framer-motion";
import { Palette, Maximize2, Layers, Sparkles, RotateCcw, Check } from "lucide-react";
import {
  useThemeStore,
  accentColors,
  borderRadiusValues,
  glassIntensityValues,
  type AccentColor,
  type BorderRadius,
  type GlassIntensity,
} from "@/lib/store/theme-store";

export function ThemeCustomizer() {
  const {
    accentColor,
    borderRadius,
    glassIntensity,
    animationsEnabled,
    setAccentColor,
    setBorderRadius,
    setGlassIntensity,
    setAnimationsEnabled,
    resetToDefaults,
  } = useThemeStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-[#0c0c14] p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Palette className="size-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Theme Customization</h3>
            <p className="text-xs text-zinc-500">Personalize your workspace appearance</p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      </div>

      {/* Accent Color */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">Accent Color</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {accentColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setAccentColor(color.id as AccentColor)}
              className={`relative h-10 rounded-xl border-2 transition-all ${
                accentColor === color.id
                  ? "border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "border-white/[0.06] hover:border-white/[0.15]"
              }`}
              style={{ backgroundColor: `${color.hex}20` }}
              title={color.label}
            >
              <div
                className="absolute inset-2 rounded-lg"
                style={{ backgroundColor: color.hex }}
              />
              {accentColor === color.id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="size-4 text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <Maximize2 className="size-4 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">Border Radius</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(borderRadiusValues) as BorderRadius[]).map((radius) => (
            <button
              key={radius}
              onClick={() => setBorderRadius(radius)}
              className={`px-4 py-3 rounded-xl border text-xs font-medium transition-all capitalize ${
                borderRadius === radius
                  ? "bg-white/[0.08] border-white/[0.12] text-white"
                  : "bg-white/[0.02] border-white/[0.04] text-zinc-500 hover:text-zinc-300"
              }`}
              style={{ borderRadius: borderRadiusValues[radius] }}
            >
              {radius}
            </button>
          ))}
        </div>
      </div>

      {/* Glassmorphism */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">Glassmorphism</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(glassIntensityValues) as GlassIntensity[]).map((intensity) => (
            <button
              key={intensity}
              onClick={() => setGlassIntensity(intensity)}
              className={`px-4 py-3 rounded-xl border text-xs font-medium transition-all capitalize ${
                glassIntensity === intensity
                  ? "bg-white/[0.08] border-white/[0.12] text-white"
                  : "bg-white/[0.02] border-white/[0.04] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {intensity}
            </button>
          ))}
        </div>
      </div>

      {/* Animations */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${animationsEnabled ? "bg-emerald-500/10" : "bg-zinc-500/10"}`}>
            <Sparkles className={`size-4 ${animationsEnabled ? "text-emerald-400" : "text-zinc-500"}`} />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-300">Animations</div>
            <div className="text-[10px] text-zinc-500">
              {animationsEnabled ? "Enabled" : "Disabled (reduce motion)"}
            </div>
          </div>
        </div>
        <button
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            animationsEnabled ? "bg-emerald-500" : "bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
              animationsEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </motion.div>
  );
}
