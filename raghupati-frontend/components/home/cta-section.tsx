"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function CtaSection() {
  return (
    <section className="section-dark border-t border-white/5 py-20 transition-colors duration-700 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <Sparkles className="size-3" />
            Ready to transform your security posture?
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            Stop reacting.
            <br />
            <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Start preventing.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-gray-400 md:text-base">
            Deploy RAGHUPATI in minutes. 7 autonomous agents start protecting
            your codebase immediately — no configuration, no maintenance, no
            false sense of security.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button
                size="lg"
                className="btn-premium h-12 gap-2 bg-white px-8 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Deploy RAGHUPATI now
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="h-12 gap-2 border-white/15 px-8 text-sm font-semibold text-white hover:bg-white/5"
              >
                Request a demo
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-600">
            Free for open-source projects · Enterprise plans available · No
            credit card required
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
