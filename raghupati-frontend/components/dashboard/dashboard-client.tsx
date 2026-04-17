"use client";

import React from "react";
import { motion } from "framer-motion";
import { useIncidents } from "@/hooks/useIncidents";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { ShieldAlert, CheckCircle2, Activity, ShieldCheck, AlertCircle } from "lucide-react";

export function DashboardClient() {
  const { incidents, isLoading } = useIncidents();
  const { events } = useAgentEvents();

  const activeIncidents = incidents.filter((i: any) => i.status !== 'resolved' && i.status !== 'auto_fixed');
  const resolvedCount = incidents.filter((i: any) => i.status === 'resolved' || i.status === 'auto_fixed').length;

  return (
    <div className="flex flex-col gap-6 p-6 h-full text-white bg-[var(--deep)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-['Syne']">Mission Control</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full text-xs font-mono">
            <div className="size-2 bg-teal-500 rounded-full animate-pulse" />
            System nominal
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        {/* LEFT PANEL: 30% Real-time agent activity stream */}
        <div className="col-span-12 lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface2)] flex gap-2 items-center">
            <Activity className="size-4 text-teal-500" />
            <h2 className="text-sm font-semibold text-slate-200">Live Agent Stream</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {events.length === 0 ? (
              <div className="text-xs text-slate-500 flex justify-center items-center h-full">Waiting for telemetry...</div>
            ) : (
              events.map((event) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  key={event.id}
                  className="p-3 bg-black/40 border border-[var(--border)] rounded-xl relative"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-teal-400 font-mono">{event.agent_name}</span>
                    <span className="text-[10px] text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 pb-1">{event.message}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* CENTER PANEL: 45% MTTR/MTTD + active incident cards */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 h-48 flex flex-col justify-center relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 to-transparent pointer-events-none" />
             <div className="flex items-center gap-2 mb-4">
               <ShieldCheck className="size-5 text-teal-500" />
               <h2 className="text-sm font-semibold">Response Trend</h2>
             </div>
             <div className="flex gap-8">
               <div>
                  <div className="text-xs text-slate-400 font-mono mb-1">MTTR</div>
                  <div className="text-3xl font-bold font-['Syne'] text-white">29<span className="text-lg text-slate-500 ml-1">min</span></div>
               </div>
               <div>
                  <div className="text-xs text-slate-400 font-mono mb-1">MTTD</div>
                  <div className="text-3xl font-bold font-['Syne'] text-white">8<span className="text-lg text-slate-500 ml-1">min</span></div>
               </div>
               <div>
                  <div className="text-xs text-slate-400 font-mono mb-1">Automated PRs</div>
                  <div className="text-3xl font-bold font-['Syne'] text-emerald-400">18</div>
               </div>
             </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex gap-2 items-center">
              <ShieldAlert className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Active Incidents ({activeIncidents.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="text-xs text-slate-500">Loading...</div>
              ) : activeIncidents.length === 0 ? (
                <div className="text-xs text-slate-500 flex justify-center items-center h-full">No active incidents.</div>
              ) : (
                activeIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-4 bg-white/5 border border-[var(--border)] rounded-xl hover:bg-white/10 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-sm font-semibold truncate pr-4">{incident.title}</span>
                       <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-500">{incident.severity}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span>{incident.repo}</span>
                      <span className="flex items-center gap-1"><AlertCircle className="size-3 text-red-400"/> {incident.cve_id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 25% Severity donut + delivery outcomes + system health */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
            <h2 className="text-sm font-semibold mb-4">Outcomes Today</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-slate-400">Incidents Handled</span>
                 <span className="text-sm font-bold">{incidents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs text-slate-400">Autonomous Fixes</span>
                 <span className="text-sm font-bold text-teal-400">{resolvedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs text-slate-400">Human Escalation</span>
                 <span className="text-sm font-bold text-amber-400">{incidents.length - resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex-1">
             <h2 className="text-sm font-semibold mb-4 flex justify-between">System Health <a href="/dashboard/settings" className="text-xs text-teal-400 hover:text-teal-300">View keys →</a></h2>
             <div className="space-y-3">
               <div className="flex items-center gap-2">
                 <div className="size-2 rounded-full bg-emerald-500" />
                 <span className="text-xs text-slate-300 flex-1">GitHub API</span>
                 <span className="text-xs text-emerald-500 bg-emerald-500/10 px-1 rounded">24ms</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="size-2 rounded-full bg-emerald-500" />
                 <span className="text-xs text-slate-300 flex-1">Mistral AI</span>
                 <span className="text-xs text-emerald-500 bg-emerald-500/10 px-1 rounded">405ms</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="size-2 rounded-full bg-emerald-500" />
                 <span className="text-xs text-slate-300 flex-1">Groq LPU</span>
                 <span className="text-xs text-emerald-500 bg-emerald-500/10 px-1 rounded">82ms</span>
               </div>
               <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                 <div className="size-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(0,212,168,0.8)]" />
                 <span className="text-xs font-semibold text-teal-400">7/7 Agents Online</span>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
