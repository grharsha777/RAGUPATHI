"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github, Loader2, Key, Shield, Zap, Bot, Eye, EyeOff } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGithubToken } from "@/hooks/useGithubToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="flex min-h-dvh bg-[#050508]">
      {/* LEFT: Animated workflow showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-10">
        {/* Animated gradient bg */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[#050508]" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/[0.08] rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/[0.08] rounded-full blur-[120px] animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/[0.06] rounded-full blur-[100px] animate-pulse [animation-delay:2s]" />
        </div>

        {/* Grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:40px_40px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative size-10 flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              <Shield className="size-5 text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">RAGHUPATI</div>
              <div className="text-[11px] text-violet-400">DevSecOps Command Framework</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-white mb-3">
              11 Autonomous Agents.
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Zero Hallucinations.
              </span>
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Watch the pipeline execute in real time — from threat detection to verified patch deployment.
            </p>
          </motion.div>

          {/* Animated pipeline visualization */}
          <div className="w-full max-w-lg">
            <PipelineAnimation />
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-zinc-600">
            Built by <span className="text-zinc-400 font-semibold">G R Harsha</span> · Autonomous DevSecOps Engineering
          </p>
        </div>
      </div>

      {/* RIGHT: Auth form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-10 lg:px-14 bg-[#0a0a12]">
        <div className="mx-auto w-full max-w-[400px] space-y-8">
          {/* Brand (mobile) */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 lg:hidden">
              <div className="relative size-10 flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                <Shield className="size-5 text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-white">RAGHUPATI</div>
                <div className="text-[11px] text-violet-400">DevSecOps Command Framework</div>
              </div>
            </div>
          </motion.div>

          {step === "auth" ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-5"
            >
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to mission control</h1>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Authenticate to access the 11-agent orchestration pipeline.
                </p>
              </div>

              <div className="grid gap-3">
                {googleEnabled && (
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={!!loadingProvider}
                    className="relative h-12 bg-white text-black hover:bg-gray-100 justify-center gap-3 text-sm font-medium w-full rounded-xl transition-all flex items-center disabled:opacity-50"
                  >
                    {loadingProvider === "google" ? (
                      <Loader2 className="size-4 animate-spin text-black" />
                    ) : (
                      <GoogleIcon className="size-4" />
                    )}
                    Continue with Google
                  </button>
                )}
                {githubEnabled && (
                  <button
                    type="button"
                    onClick={() => handleOAuth("github")}
                    disabled={!!loadingProvider}
                    className="relative h-12 bg-[#24292F] hover:bg-[#24292F]/90 text-white justify-center gap-3 text-sm font-medium w-full rounded-xl transition-all flex items-center disabled:opacity-50"
                  >
                    {loadingProvider === "github" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Github className="size-4" />
                    )}
                    Continue with GitHub
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                By signing in, you agree to the Raghupati terms of service and privacy policy. Your GitHub token is stored locally and never sent to third parties.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="space-y-2 mb-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 mb-2">
                  <Key className="size-5 text-violet-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">GitHub System Token</h1>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Enter your GitHub Personal Access Token to enable autonomous repository operations.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="h-12 bg-white/[0.03] border-white/[0.08] text-white font-mono placeholder:text-zinc-600 rounded-xl focus:border-violet-500/40"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex flex-wrap gap-2">
                  {["repo", "workflow", "read:org"].map((scope) => (
                    <span key={scope} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] font-mono text-zinc-500">
                      {scope}
                    </span>
                  ))}
                  <span className="text-[10px] text-zinc-600 self-center ml-1">required scopes</span>
                </div>
                <button
                  onClick={handleSaveToken}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  Connect and Continue <ArrowRight className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-[#050508]">
        <Loader2 className="size-8 animate-spin text-violet-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

// ── Pipeline animation for login left panel ──
const PIPELINE_STEPS = [
  { name: "Hanuman", role: "Watch", color: "bg-blue-500" },
  { name: "Rama", role: "Command", color: "bg-violet-500" },
  { name: "Lakshmana", role: "Map", color: "bg-cyan-500" },
  { name: "Sita", role: "Scan", color: "bg-amber-500" },
  { name: "Jambavan", role: "Research", color: "bg-indigo-500" },
  { name: "Nala", role: "Patch", color: "bg-emerald-500" },
  { name: "Sugreeva", role: "QA", color: "bg-rose-500" },
  { name: "Bharata", role: "Refactor", color: "bg-teal-500" },
  { name: "Shatrughna", role: "Deploy", color: "bg-orange-500" },
  { name: "Dasharatha", role: "Push", color: "bg-pink-500" },
  { name: "Vibhishana", role: "Comms", color: "bg-sky-500" },
];

function PipelineAnimation() {
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-2">
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        return (
          <motion.div
            key={step.name}
            initial={false}
            animate={{
              opacity: isActive || isDone ? 1 : 0.3,
              x: isActive ? 8 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className={`w-2 h-2 rounded-full ${step.color} ${isActive ? "animate-pulse shadow-lg" : ""} ${isDone ? "opacity-60" : ""}`} />
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-xs font-medium transition-colors ${isActive ? "text-white" : "text-zinc-500"}`}>
                {step.name}
              </span>
              <span className={`text-[10px] font-mono transition-colors ${isActive ? "text-zinc-300" : "text-zinc-700"}`}>
                {step.role}
              </span>
            </div>
            {isActive && (
              <motion.div
                layoutId="pipeline-indicator"
                className="h-5 w-1 rounded-full bg-white/30"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
