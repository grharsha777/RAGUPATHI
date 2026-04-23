import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="size-3" /> Back to home
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <Shield className="size-6 text-primary" />
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-8">Last updated: April 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>RAGHUPATHI collects the minimum data necessary to deliver autonomous DevSecOps operations:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> Name, email, and profile image from your GitHub or Google OAuth provider.</li>
            <li><strong>GitHub tokens:</strong> Personal Access Tokens you voluntarily provide, encrypted with AES-256-GCM and stored server-side in Supabase. Tokens are never stored in browser localStorage or client-side storage.</li>
            <li><strong>Repository metadata:</strong> Repository names, language, dependency manifests, and commit diffs necessary for vulnerability scanning.</li>
            <li><strong>Usage data:</strong> Scan history, agent execution logs, and incident records for audit and analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Scanning repositories for known CVEs via NVD and OSV databases.</li>
            <li>Generating AI-powered security patches using LLM providers (Mistral, Groq).</li>
            <li>Creating automated pull requests with remediation patches.</li>
            <li>Sending security notifications via your configured channels (Slack, Discord, email).</li>
            <li>Improving platform reliability and performance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Data Retention</h2>
          <p>Scan results and incident logs are retained for 90 days by default. You can request deletion of all your data at any time by contacting our support team. GitHub tokens can be revoked and deleted instantly from the Settings page.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>
          <p>RAGHUPATHI integrates with the following services, each with their own privacy policies:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>GitHub API:</strong> For repository access, PR creation, and webhook events.</li>
            <li><strong>Supabase:</strong> Database, authentication, and real-time infrastructure.</li>
            <li><strong>Mistral AI & Groq:</strong> LLM inference for agent reasoning. Code snippets are sent for analysis but never stored by these providers beyond the request lifecycle.</li>
            <li><strong>NVD / OSV:</strong> Public vulnerability databases queried for CVE data.</li>
            <li><strong>Resend:</strong> Email delivery for security notifications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Security</h2>
          <p>All data is transmitted over TLS 1.3. Credentials are encrypted at rest using AES-256-GCM. Row-Level Security (RLS) in Supabase ensures users can only access their own data. We conduct regular security audits of our infrastructure.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. You may revoke GitHub token access at any time. To exercise these rights, contact <a href="mailto:privacy@raghupathi.dev" className="text-primary hover:underline">privacy@raghupathi.dev</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
          <p>For privacy inquiries, reach us at <a href="mailto:privacy@raghupathi.dev" className="text-primary hover:underline">privacy@raghupathi.dev</a>.</p>
        </section>
      </div>
    </div>
  );
}
