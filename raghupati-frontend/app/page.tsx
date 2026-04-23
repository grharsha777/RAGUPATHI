import type { Metadata } from "next";

import { HomepageNav } from "@/components/home/homepage-nav";
import { UltraHero } from "@/components/home/ultra-hero";

export const metadata: Metadata = {
  title: "RAGHUPATI — Autonomous DevSecOps Guardian",
  description:
    "Hunt threats before they hunt you. 11 autonomous AI agents detect vulnerabilities, generate verified production-grade patches, and ship remediation PRs — with anti-hallucination guardrails and Hanuman recheck loops.",
};

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#050508]">
      <HomepageNav />
      <UltraHero />
    </div>
  );
}
