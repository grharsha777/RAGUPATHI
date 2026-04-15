"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Code2,
  Eye,
  LineChart,
  MessageSquare,
  Search,
  Shield,
} from "lucide-react";

import { ScrollReveal } from "@/components/shared/scroll-reveal";

const agents = [
  {
    name: "Rama",
    role: "Commander",
    description: "Orchestrates the full incident lifecycle, delegates tasks, and makes escalation decisions.",
    icon: LineChart,
    model: "Mistral Large",
    color: "border-amber-500/30 bg-amber-500/5",
    iconColor: "text-amber-600",
  },
  {
    name: "Hanuman",
    role: "Watcher",
    description: "Monitors GitHub webhooks in real time, triaging pushes, PRs, and dependency changes.",
    icon: Eye,
    model: "LLaMA 4 Scout",
    color: "border-blue-500/30 bg-blue-500/5",
    iconColor: "text-blue-600",
  },
  {
    name: "Angada",
    role: "Security Analyst",
    description: "Deep vulnerability assessment with NVD/OSV cross-referencing and severity scoring.",
    icon: Shield,
    model: "Mixtral 8x7B",
    color: "border-rose-500/30 bg-rose-500/5",
    iconColor: "text-rose-600",
  },
  {
    name: "Jambavan",
    role: "Research Analyst",
    description: "Web research for exploit context, remediation strategies, and advisory intelligence.",
    icon: Search,
    model: "Mistral Medium",
    color: "border-violet-500/30 bg-violet-500/5",
    iconColor: "text-violet-600",
  },
  {
    name: "Nala",
    role: "Patch Engineer",
    description: "Generates targeted, minimal code patches using deep code understanding.",
    icon: Code2,
    model: "Codestral",
    color: "border-primary/30 bg-primary/5",
    iconColor: "text-primary",
  },
  {
    name: "Sugreeva",
    role: "QA Engineer",
    description: "Validates patches against CI pipelines, manages retry loops with structured feedback.",
    icon: Bot,
    model: "LLaMA 4 Scout",
    color: "border-emerald-500/30 bg-emerald-500/5",
    iconColor: "text-emerald-600",
  },
  {
    name: "Vibhishana",
    role: "Communications",
    description: "Routes severity-aware alerts to Slack and email with formatted incident reports.",
    icon: MessageSquare,
    model: "LLaMA 3 8B",
    color: "border-orange-500/30 bg-orange-500/5",
    iconColor: "text-orange-600",
  },
];

export function AgentSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="agents" className="border-t border-border/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Bot className="size-3" />
            The Vanar Sena
          </div>
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            7 specialized agents.{" "}
            <span className="text-gradient">One autonomous crew.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Each agent is a domain expert — purpose-built for a specific stage
            of the security operations lifecycle. Together, they form an
            end-to-end autonomous pipeline.
          </p>
        </ScrollReveal>

        {/* Agent flow visualization */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border to-transparent md:block" />

          <div className="space-y-4 md:space-y-0">
            {agents.map((agent, i) => {
              const Icon = agent.icon;
              const isLeft = i % 2 === 0;

              return (
                <ScrollReveal
                  key={agent.name}
                  direction={isLeft ? "left" : "right"}
                  delay={i * 0.05}
                >
                  <div
                    className={`relative md:flex md:items-center ${
                      isLeft ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                  >
                    {/* Card */}
                    <div
                      className={`card-interactive w-full rounded-xl border ${agent.color} p-5 shadow-surface-1 md:w-[calc(50%-2rem)]`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-lg border ${agent.color} p-2 ${agent.iconColor}`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                              {agent.name}
                            </h3>
                            <span className="rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {agent.role}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            {agent.description}
                          </p>
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="size-1.5 rounded-full bg-emerald-500" />
                            {agent.model}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center dot (desktop) */}
                    <div className="hidden md:flex md:w-16 md:items-center md:justify-center">
                      <motion.div
                        initial={reduceMotion ? false : { scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                        className="relative z-10 flex size-8 items-center justify-center rounded-full border border-border bg-card shadow-sm"
                      >
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                      </motion.div>
                    </div>

                    {/* Spacer */}
                    <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
