"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { SCAN_STAGES, type ScanStage } from "@/lib/constants/agents";

type ScanStageProgressProps = {
  currentStage: ScanStage;
};

export function ScanStageProgress({ currentStage }: ScanStageProgressProps) {
  const currentIndex = SCAN_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex items-center gap-1">
      {SCAN_STAGES.map((stage, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        const isPending = i > currentIndex;

        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div
                className={`h-px w-3 transition-colors duration-500 ${
                  isComplete ? "bg-emerald-500/40" : isActive ? "bg-blue-500/30" : "bg-zinc-800"
                }`}
              />
            )}
            <div className="flex items-center gap-1">
              {isComplete ? (
                <CheckCircle2 className="size-3 text-emerald-500" />
              ) : isActive ? (
                <Loader2 className="size-3 text-blue-400 animate-spin" />
              ) : (
                <Circle className="size-3 text-zinc-700" />
              )}
              <span
                className={`text-[9px] font-medium transition-colors duration-300 ${
                  isComplete ? "text-emerald-400" :
                  isActive ? "text-blue-400" :
                  "text-zinc-600"
                }`}
              >
                {stage.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
