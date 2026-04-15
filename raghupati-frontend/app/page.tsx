import type { Metadata } from "next";

import { HomepageNav } from "@/components/home/homepage-nav";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { BenchmarkSection } from "@/components/home/benchmark-section";
import { AgentSection } from "@/components/home/agent-section";
import { TrustSection } from "@/components/home/trust-section";
import { CtaSection } from "@/components/home/cta-section";
import { Footer } from "@/components/home/footer";

export const metadata: Metadata = {
  title: "RAGHUPATI — Autonomous DevSecOps Guardian",
  description:
    "Hunt threats before they hunt you. 7 autonomous AI agents detect vulnerabilities, generate verified patches, and ship remediation PRs — all before your morning standup.",
};

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <HomepageNav />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <AgentSection />
      <BenchmarkSection />
      <TrustSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
