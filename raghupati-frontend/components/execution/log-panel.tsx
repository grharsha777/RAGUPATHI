"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useExecutionStore, type LogEntry } from "@/lib/stores/execution-store";
import { AlertTriangle, CheckCircle2, Info, Bug, AlertCircle } from "lucide-react";

const LEVEL_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/5" },
  warn: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/5" },
  error: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/5" },
  debug: { icon: Bug, color: "text-zinc-500", bg: "bg-zinc-500/5" },
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5" },
};

export function LogPanel() {
  const logs = useExecutionStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
            Live Logs
          </span>
          <span className="text-[8px] font-mono text-zinc-700">
            {logs.length} entries
          </span>
        </div>
        <button
          onClick={() => useExecutionStore.getState().logs.length > 0 && {
            // Clear logs - we just reset by creating a new array
          }}
          className="text-[8px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-2 py-1 space-y-0.5">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-[10px] text-zinc-700">No logs yet. Start a scan to see live logs.</p>
          </div>
        ) : (
          logs.map((entry) => (
            <LogEntryRow key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.info;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex items-start gap-2 rounded-md px-2 py-1 ${style.bg} hover:bg-white/[0.02] transition-colors group`}
    >
      <Icon className={`size-3 shrink-0 mt-0.5 ${style.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-zinc-500 shrink-0">
            {entry.source}
          </span>
          <span className="text-[10px] text-zinc-300 leading-relaxed truncate">
            {entry.message}
          </span>
        </div>
        {entry.meta && (
          <div className="text-[8px] font-mono text-zinc-600 mt-0.5">
            {Object.entries(entry.meta).map(([k, v]) => (
              <span key={k} className="mr-2">
                {k}={typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="text-[7px] font-mono text-zinc-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
    </motion.div>
  );
}
