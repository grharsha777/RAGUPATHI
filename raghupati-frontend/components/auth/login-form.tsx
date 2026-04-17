"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const schema = z.object({
  passphrase: z.string().min(8, "Passphrase must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

import { Suspense } from "react";

function LoginFormContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { passphrase: "" },
  });

  const githubEnabled = process.env.NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE === "1";
  const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE === "1";
  const oauthAvailable = githubEnabled || googleEnabled;
  const isSubmitting = form.formState.isSubmitting;

  const handleOAuth = async (provider: string) => {
    setLoadingProvider(provider);
    setError(null);
    await signIn(provider, { callbackUrl });
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10 lg:px-10">
      <div className="mx-auto w-full max-w-[380px] space-y-8">
        {/* Brand */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-lg border border-border/60 bg-card shadow-surface-1">
              <Image
                src="/brand/raghupati-mark.svg"
                alt=""
                width={40}
                height={40}
                priority
              />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">RAGHUPATI</div>
              <div className="text-[11px] text-muted-foreground">
                DevSecOps Guardian
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in to access your autonomous security operations command
              center.
            </p>
          </div>
        </motion.div>

        {/* Auth form */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* OAuth buttons */}
          {oauthAvailable && (
            <div className="grid gap-2.5">
              {googleEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="relative h-11 justify-center gap-3 text-sm font-medium hover-glow"
                  onClick={() => handleOAuth("google")}
                  disabled={!!loadingProvider}
                >
                  {loadingProvider === "google" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="size-4" />
                  )}
                  Continue with Google
                </Button>
              )}
              {githubEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="relative h-11 justify-center gap-3 text-sm font-medium hover-glow"
                  onClick={() => handleOAuth("github")}
                  disabled={!!loadingProvider}
                >
                  {loadingProvider === "github" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Github className="size-4" />
                  )}
                  Continue with GitHub
                </Button>
              )}
            </div>
          )}

          {/* Divider */}
          {oauthAvailable && (
            <div className="relative py-1">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                or
              </span>
            </div>
          )}

          {/* Operator passphrase */}
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit(async (values) => {
              setError(null);
              const result = await signIn("operator", {
                passphrase: values.passphrase,
                redirect: false,
                callbackUrl,
              });
              if (result?.error) {
                setError("Authentication failed. Verify your passphrase.");
                return;
              }
              router.push(callbackUrl);
            })}
          >
            <div className="space-y-2">
              <label
                htmlFor="passphrase"
                className="text-xs font-medium text-foreground"
              >
                Operator passphrase
              </label>
              <Input
                id="passphrase"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your passphrase"
                className="h-11"
                {...form.register("passphrase")}
              />
              {form.formState.errors.passphrase?.message && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.passphrase.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="btn-premium h-11 w-full gap-2 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Enter mission control
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Trust footer */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-3"
        >
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              Enterprise trust:{" "}
            </span>
            JWT session verification, immutable audit trails, and explainable AI
            decisions with confidence scoring.
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
