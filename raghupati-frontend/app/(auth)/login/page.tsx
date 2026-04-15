import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
};

function LoginFallback() {
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-10 px-6 py-16 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-[420px] w-full max-w-md rounded-xl" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
