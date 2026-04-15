import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Benchmarks", href: "#benchmarks" },
    { label: "Agents", href: "#agents" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security", href: "#" },
    { label: "Status", href: "#" },
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
              <div className="relative size-8 overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm">
                <Image
                  src="/brand/raghupati-mark.svg"
                  alt=""
                  width={32}
                  height={32}
                />
              </div>
              <span className="text-sm font-bold tracking-tight">
                RAGHUPATI
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Autonomous multi-agent DevSecOps command center.
              Detect, analyze, patch, validate, and deliver security fixes
              without human intervention.
            </p>
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
                      <a
                        href={link.href}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
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
            © {new Date().getFullYear()} RAGHUPATI. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Securing the world&apos;s code, autonomously.
          </p>
        </div>
      </div>
    </footer>
  );
}
