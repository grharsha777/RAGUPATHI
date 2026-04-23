"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, BugPlay, ShieldAlert, BookOpen, Wrench, SearchCheck, Send, CheckCircle2, Siren } from "lucide-react";

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const agents = [
  { id: "hanuman", name: "Hanuman", role: "Watcher", model: "LLaMA 4 Scout", icon: BugPlay, x: 100, y: 200, color: "#10b981" },
  { id: "angada", name: "Angada", role: "Security", model: "Mixtral 8x7B", icon: ShieldAlert, x: 300, y: 100, color: "#f59e0b" },
  { id: "jambavan", name: "Jambavan", role: "Research", model: "Mistral Med", icon: BookOpen, x: 300, y: 300, color: "#3b82f6" },
  { id: "rama", name: "Rama", role: "Commander", model: "Mistral Large", icon: Bot, x: 500, y: 200, color: "#8b5cf6" },
  { id: "nala", name: "Nala", role: "Patch Eng", model: "Codestral", icon: Wrench, x: 700, y: 200, color: "#ec4899" },
  { id: "sugreeva", name: "Sugreeva", role: "QA Agent", model: "LLaMA 4 Scout", icon: SearchCheck, x: 900, y: 200, color: "#14b8a6" },
  { id: "vibhishana", name: "Vibhishana", role: "Comms", model: "LLaMA 3 8B", icon: Send, x: 1100, y: 200, color: "#6366f1" },
];

export function AgentWorkflowViz() {
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    let currentPhase = 0;
    const interval = setInterval(() => {
      // 18 second loop, each phase roughly 2 seconds
      currentPhase = (currentPhase + 1) % 10;
      if (currentPhase < 9) {
        setPhase(currentPhase as Phase);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (id: string) => {
    switch (phase) {
      case 1: return id === "hanuman";
      case 2: return id === "angada" || id === "jambavan";
      case 3: return id === "rama" || id === "angada" || id === "jambavan";
      case 4: return id === "nala" || id === "rama";
      case 5: return id === "sugreeva" || id === "nala";
      case 6: return id === "sugreeva" || id === "vibhishana";
      case 7: return id === "vibhishana";
      case 8: return true; // all green
      default: return false;
    }
  };

  const getPathClass = (from: string, to: string) => {
    let active = false;
    let colorClass = "stroke-slate-800";
    if (from === "hanuman" && phase === 1) { active = true; colorClass = "stroke-teal-500 animate-pulse"; }
    if ((from === "angada" || from === "jambavan") && phase === 2) { active = true; colorClass = "stroke-amber-500 animate-pulse"; }
    if (from === "rama" && phase === 3) { active = true; colorClass = "stroke-purple-500 animate-pulse"; }
    if (from === "nala" && phase === 4) { active = true; colorClass = "stroke-pink-500 animate-pulse"; }
    if (from === "sugreeva" && phase === 5) { active = true; colorClass = "stroke-teal-500 animate-pulse"; }
    if (from === "vibhishana" && (phase === 6 || phase === 7)) { active = true; colorClass = "stroke-green-500 animate-pulse"; }
    
    if (phase === 8) colorClass = "stroke-green-500 opacity-50";

    return `transition-all duration-500 ${active ? 'stroke-[3px] filter drop-shadow-[0_0_8px_rgba(0,212,168,0.8)]' : 'stroke-[2px] opacity-30'} ${colorClass}`;
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto h-[500px] bg-[var(--deep)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl flex items-center justify-center p-8">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-[var(--deep)] to-[var(--deep)]">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_#ffffff_1px,_transparent_1px)] bg-[size:24px_24px]"></div>
      </div>
      
      {/* SVG Connections Container */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 400">
        <defs>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D4A8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00D4A8" stopOpacity="1" />
          </linearGradient>
        </defs>

        <path d="M 0 200 L 100 200" fill="none" className={phase === 0 ? "stroke-teal-500 stroke-[3px] drop-shadow-[0_0_8px_rgba(0,212,168,0.8)]" : "stroke-slate-800 stroke-[2px] opacity-30"} />
        <path d="M 100 200 C 200 200, 200 100, 300 100" fill="none" className={getPathClass("hanuman", "angada")} />
        <path d="M 100 200 C 200 200, 200 300, 300 300" fill="none" className={getPathClass("hanuman", "jambavan")} />
        <path d="M 300 100 C 400 100, 400 200, 500 200" fill="none" className={getPathClass("angada", "rama")} />
        <path d="M 300 300 C 400 300, 400 200, 500 200" fill="none" className={getPathClass("jambavan", "rama")} />
        <path d="M 500 200 L 700 200" fill="none" className={getPathClass("rama", "nala")} />
        <path d="M 700 200 L 900 200" fill="none" className={getPathClass("nala", "sugreeva")} />
        <path d="M 900 200 L 1100 200" fill="none" className={getPathClass("sugreeva", "vibhishana")} />
        <path d="M 1100 200 L 1200 200" fill="none" className={getPathClass("vibhishana", "out")} />
      </svg>

      {/* Nodes Map */}
      <div className="relative w-[1100px] h-[400px]">
        {/* Packet Animation */}
        <motion.div
           className="absolute z-20 flex items-center bg-white/10 backdrop-blur-md border border-[var(--border)] rounded px-3 py-1.5 shadow-[0_0_15px_rgba(0,212,168,0.4)]"
           initial={{ x: -100, y: 185, opacity: 0 }}
           animate={{
            x: phase === 0 ? 0 : phase === 1 ? 200 : phase === 2 ? 400 : phase === 3 ? 600 : phase === 4 ? 800 : phase === 5 ? 1000 : phase >= 6 ? 1200 : -100,
            y: phase === 2 ? [185, 85, 285][Math.floor(Math.random()*3)] : 185,
            opacity: phase > 0 && phase < 8 ? 1 : 0
           }}
           transition={{ duration: 1.8, ease: "easeInOut" }}
        >
          <Siren className="size-3 text-red-500 mr-2" />
          <span className="text-[10px] font-mono text-white">CVE-2024-3094</span>
        </motion.div>

        {agents.map((agent) => {
          const active = isActive(agent.id);
          const done = phase === 8;
          return (
            <motion.div
              key={agent.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: agent.x, top: agent.y }}
              animate={{
                scale: active ? 1.05 : 1,
              }}
            >
              {active && (
                <div className="absolute inset-0 rounded-xl animate-ping opacity-30" style={{ backgroundColor: agent.color, filter: 'blur(8px)' }} /> // NOSONAR
              )}
              
              <div 
                className={`relative flex flex-col items-center w-36 bg-white/[0.03] backdrop-blur-xl border rounded-xl p-3 shadow-xl transition-all duration-500 z-10
                  ${active ? 'border-teal-500 shadow-[0_0_20px_rgba(0,212,168,0.3)]' : 'border-[var(--border)]'}
                  ${done ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : ''}
                `}
              >
                <div className="flex gap-2 items-center w-full pb-2 mb-2 border-b border-[var(--border)]">
                  {done ? <CheckCircle2 className="size-4 text-emerald-500" /> : <agent.icon className="size-4 text-slate-300" style={{ color: active ? agent.color : undefined }}/>}
                  <span className="text-xs font-semibold text-white tracking-wider">{agent.name}</span>
                </div>
                
                <span className="text-[10px] uppercase tracking-widest text-[var(--teal)] mb-1 opacity-80">{agent.role}</span>
                
                <div className="bg-black/40 border border-[var(--border)] rounded px-2 py-1 flex items-center justify-between w-full mt-1">
                  <span className="text-[9px] font-mono text-slate-300 truncate">{agent.model}</span>
                </div>

                <div className="w-full flex justify-between mt-2 text-[8px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <div className={`size-1.5 rounded-full ${active ? 'bg-teal-500 animate-pulse' : 'bg-slate-700'}`} />
                    {active ? '0.2s' : 'idle'}
                  </span>
                  <span>99.9%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
