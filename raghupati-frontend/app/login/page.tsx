"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github, Loader2, Key, CheckCircle2, Shield } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useGithubToken } from "@/hooks/useGithubToken";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

import { Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params?.get("callbackUrl") ?? "/dashboard";
  const { data: session, status } = useSession();
  
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  
  const { save, isConfigured } = useGithubToken();
  const [tokenInput, setTokenInput] = useState("");
  const [step, setStep] = useState<"auth" | "token">("auth");

  const githubEnabled = process.env.NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE === "1" || true;
  const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE === "1" || true;

  useEffect(() => {
    if (status === "authenticated") {
      if (!isConfigured) {
        setStep("token");
      } else {
        router.push(callbackUrl);
      }
    }
  }, [status, isConfigured, router, callbackUrl]);

  const handleOAuth = async (provider: string) => {
    setLoadingProvider(provider);
    setError(null);
    await signIn(provider, { callbackUrl: window.location.href });
  };

  const handleSaveToken = () => {
    if (tokenInput.trim().length > 10) {
      save(tokenInput.trim());
      router.push(callbackUrl);
    } else {
      setError("Please enter a valid GitHub token (ghp_...)");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10 lg:px-10 bg-[var(--deep)]">
      <div className="mx-auto w-full max-w-[380px] space-y-8">
        
        {/* Brand */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="relative size-10 flex items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card shadow-surface-1">
              <Shield className="size-6 text-teal-500" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">RAGHUPATI</div>
              <div className="text-[11px] text-teal-400">DevSecOps command framework</div>
            </div>
          </div>
        </motion.div>

        {step === "auth" ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-4 bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-lg"
          >
            <div className="space-y-2 mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-white">Authentication</h1>
              <p className="text-sm leading-relaxed text-slate-400">
                Sign in to mission control.
              </p>
            </div>

            <div className="grid gap-3">
              {googleEnabled && (
                <Button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={!!loadingProvider}
                  className="relative h-12 bg-white text-black hover:bg-gray-100 justify-center gap-3 text-sm font-medium w-full rounded-xl transition-all"
                >
                  {loadingProvider === "google" ? (
                    <Loader2 className="size-4 animate-spin text-black" />
                  ) : (
                    <GoogleIcon className="size-4" />
                  )}
                  Continue with Google
                </Button>
              )}
              {githubEnabled && (
                <Button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  disabled={!!loadingProvider}
                  className="relative h-12 bg-[#24292F] hover:bg-[#24292F]/90 text-white justify-center gap-3 text-sm font-medium w-full rounded-xl transition-all"
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
          </motion.div>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-lg"
          >
            <div className="space-y-2 mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 mb-2">
                <Key className="size-5 text-teal-400" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">System Webhook Token</h1>
              <p className="text-sm leading-relaxed text-slate-400">
                Please enter your GitHub Personal Access Token to act as the autonomous proxy.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="h-12 bg-slate-900 border-slate-800 text-white font-mono placeholder:text-slate-600 rounded-xl"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button
                onClick={handleSaveToken}
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-black font-semibold rounded-xl"
              >
                Connect and Continue <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-[var(--deep)]">
        <Loader2 className="size-8 animate-spin text-teal-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
