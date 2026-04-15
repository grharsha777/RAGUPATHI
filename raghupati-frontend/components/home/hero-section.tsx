"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  GitPullRequest,
  Shield,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const heroStats = [
  { icon: Timer, label: "Avg MTTR", value: 29, suffix: " min", prefix: "" },
  { icon: ShieldCheck, label: "Fix rate", value: 74, suffix: "%", prefix: "" },
  { icon: GitPullRequest, label: "PRs automated", value: 2847, suffix: "+", prefix: "" },
];

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-16 pt-8 md:pb-24 md:pt-16">
      {/* Background mesh */}
      <div className="pointer-events-none absolute inset-0 mesh-gradient-light dark:mesh-gradient-dark" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Zap className="size-3" />
            Autonomous DevSecOps — Powered by Multi-Agent AI
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-balance text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          >
            Hunt threats before{" "}
            <span className="text-gradient">they hunt you</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            A mission-grade command center with 7 autonomous AI agents that
            detect vulnerabilities, generate verified patches, and ship remediation
            PRs—all before your morning standup.
          </motion.p>

          {/* CTA group */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/login">
              <Button size="lg" className="btn-premium h-12 gap-2 px-7 text-sm font-semibold">
                Start securing now
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="h-12 gap-2 px-7 text-sm font-semibold"
              >
                <Bot className="size-4" />
                See how it works
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Live product preview — simulated dashboard */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-3">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-red-400/70" />
                <div className="size-2.5 rounded-full bg-amber-400/70" />
                <div className="size-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-muted/50 px-3 py-1 text-center text-[10px] text-muted-foreground">
                raghupati.app/dashboard
              </div>
            </div>

            {/* Dashboard mockup interior */}
            <div className="grid gap-3 p-4 md:grid-cols-4">
              {/* KPI cards */}
              <DashboardMockKPI label="Mean time to remediate" value="29m" trend="−12%" positive />
              <DashboardMockKPI label="Mean time to detect" value="8m" trend="stable" positive />
              <DashboardMockKPI label="Autonomous fix rate" value="74%" trend="+6%" positive />
              <DashboardMockKPI label="Active incidents" value="3" trend="queue healthy" positive />
            </div>
            <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
              {/* Chart placeholder */}
              <div className="col-span-2 flex h-40 items-end gap-1 rounded-lg border border-border/40 bg-muted/10 p-4">
                {[42, 39, 36, 33, 31, 29, 26, 24].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={reduceMotion ? false : { height: 0 }}
                    animate={{ height: `${h * 2.5}%` }}
                    transition={{ duration: 0.6, delay: 0.8 + i * 0.05 }}
                    className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary/20"
                  />
                ))}
              </div>
              {/* Incident list placeholder */}
              <div className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-3">
                {["Critical — xz-utils", "High — openssl", "Medium — lodash"].map(
                  (item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border border-border/30 bg-card/60 px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">{item}</span>
                      <Shield className="size-3 text-muted-foreground/50" />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-8 md:gap-14"
        >
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold tabular-nums text-foreground">
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMockKPI({
  label,
  value,
  trend,
  positive,
}: {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-3 shadow-sm">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
        {value}
      </div>
      <div
        className={`mt-0.5 text-[10px] ${positive ? "text-emerald-600" : "text-red-500"}`}
      >
        {trend}
      </div>
    </div>
  );
}
