import Link from "next/link";
import { Github } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Agents", href: "/#agents" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Company: [
    { label: "About", href: "/#features" },
    { label: "Blog", href: "/#" },
    { label: "Open Source", href: "https://github.com/RAGHUPATHI" },
    { label: "Contact", href: "mailto:hello@raghupathi.dev" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
    { label: "System Status", href: "/status" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-muted/10 py-12">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="max-w-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-primary/30 bg-primary/10 shadow-sm">
                <span className="text-sm font-bold text-primary">R</span>
              </div>
              <span className="text-sm font-bold tracking-tight">
                RAGHUPATHI
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Autonomous multi-agent DevSecOps command center.
              Detect, analyze, patch, validate, and deliver security fixes
              without human intervention.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/RAGHUPATHI"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                aria-label="GitHub"
              >
                <Github className="size-4" />
              </a>
              <a
                href="https://discord.gg/raghupathi"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                aria-label="Discord"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-8">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {category}
                </h4>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("http") || link.href.startsWith("mailto:") ? (
                        <a
                          href={link.href}
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/30 pt-6 sm:flex-row">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} RAGHUPATHI. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Securing the world&apos;s code, autonomously.
          </p>
        </div>
      </div>
    </footer>
  );
}
