import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="size-3" /> Back to home
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <ScrollText className="size-6 text-primary" />
        <h1 className="text-3xl font-bold">Terms of Service</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-8">Last updated: April 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using the RAGHUPATHI platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
          <p>RAGHUPATHI is an autonomous multi-agent DevSecOps platform that monitors GitHub repositories for security vulnerabilities, generates AI-powered patches, validates fixes through CI pipelines, and delivers remediation pull requests. The platform operates through seven specialized AI agents working in concert.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for the accuracy and security of the GitHub Personal Access Tokens you provide.</li>
            <li>You must review all automated pull requests before merging. RAGHUPATHI generates patches autonomously, but human review is required before deployment to production.</li>
            <li>You must not use the platform to gain unauthorized access to repositories or systems you do not own.</li>
            <li>You are responsible for complying with GitHub&apos;s Acceptable Use Policies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. AI-Generated Content Disclaimer</h2>
          <p>RAGHUPATHI uses large language models (Mistral, Groq, Meta LLaMA) to generate security patches and analysis. AI-generated code may contain errors. All patches should be reviewed by qualified engineers before deployment. RAGHUPATHI is not liable for damages caused by merging unreviewed AI-generated patches.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Service Availability</h2>
          <p>We strive for 99.9% uptime but cannot guarantee uninterrupted service. The platform depends on third-party APIs (GitHub, NVD, LLM providers) that may experience independent outages.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
          <p>RAGHUPATHI is provided &quot;as is&quot; without warranty of any kind. In no event shall the developers be liable for any indirect, incidental, special, or consequential damages arising from the use of this platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Termination</h2>
          <p>You may terminate your account at any time by deleting your tokens and contacting support. We reserve the right to suspend accounts that violate these terms or GitHub&apos;s policies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
          <p>For questions about these terms, contact <a href="mailto:legal@raghupathi.dev" className="text-primary hover:underline">legal@raghupathi.dev</a>.</p>
        </section>
      </div>
    </div>
  );
}
