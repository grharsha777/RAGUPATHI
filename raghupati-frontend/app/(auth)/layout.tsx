import type { ReactNode } from "react";

import { AuthShowcase } from "@/components/auth/auth-showcase";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Left — Login form */}
      <div className="flex w-full flex-col lg:w-[480px] xl:w-[520px]">
        {children}
      </div>

      {/* Right — Animated showcase (hidden on mobile) */}
      <div className="relative hidden flex-1 border-l border-border/40 bg-muted/20 lg:block">
        <AuthShowcase />
      </div>
    </div>
  );
}
