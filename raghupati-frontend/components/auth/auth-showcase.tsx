"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Bot,
  GitPullRequest,
  Lock,
  Shield,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

const floatingCards = [
  {
    icon: Shield,
    label: "CVE-2024-3094 detected",
    detail: "Critical · xz-utils",
    color: "text-red-500",
    bg: "bg-red-500/8 border-red-500/15",
  },
  {
    icon: Bot,
    label: "Nala generating patch",
    detail: "Codestral · 2.1s",
    color: "text-primary",
    bg: "bg-primary/8 border-primary/15",
  },
  {
    icon: GitPullRequest,
    label: "PR #847 opened",
    detail: "Automated fix verified",
    color: "text-emerald-600",
    bg: "bg-emerald-500/8 border-emerald-500/15",
  },
  {
    icon: Timer,
    label: "MTTR: 29 min",
    detail: "−12% vs prior day",
    color: "text-amber-600",
    bg: "bg-amber-500/8 border-amber-500/15",
  },
];

const stats = [
  { label: "Incidents resolved", value: "2,847" },
  { label: "Avg response time", value: "< 8 min" },
  { label: "Autonomous fix rate", value: "74%" },
];

export function AuthShowcase() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-8 lg:p-12">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient gradient */}
      <div className="pointer-events-none absolute inset-0 mesh-gradient-light dark:mesh-gradient-dark" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg space-y-8">
        {/* Header badge */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Activity className="size-3 animate-pulse" />
            Live autonomous security operations
          </div>
        </motion.div>

        {/* Floating agent cards */}
        <div className="relative mx-auto h-[280px] w-full max-w-md">
          {floatingCards.map((card, i) => {
            const Icon = card.icon;
            const positions = [
              { top: "0%", left: "5%", rotate: -2 },
              { top: "15%", left: "50%", rotate: 1.5 },
              { top: "48%", left: "2%", rotate: 1 },
              { top: "58%", left: "45%", rotate: -1.5 },
            ];
            const pos = positions[i];

            return (
              <motion.div
                key={card.label}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.4 + i * 0.15,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="absolute w-[220px]"
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: `rotate(${pos.rotate}deg)`,
                  animation: reduceMotion
                    ? "none"
                    : `float ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                <div
                  className={`flex items-start gap-3 rounded-xl border ${card.bg} p-3.5 shadow-surface-1 backdrop-blur-sm`}
                >
                  <div className={`mt-0.5 ${card.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-foreground">
                      {card.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {card.detail}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl border border-border/60 bg-card/50 px-5 py-3.5 shadow-surface-1 backdrop-blur-sm"
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-center ${i > 0 ? "border-l border-border/60 pl-4" : ""}`}
            >
              <div className="text-sm font-bold tabular-nums text-foreground">
                {stat.value}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            SOC 2 compliant architecture
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5 text-primary" />
            End-to-end encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-600" />
            99.9% uptime SLA
          </span>
        </motion.div>
      </div>
    </div>
  );
}
