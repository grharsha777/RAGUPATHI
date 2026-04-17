"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type AnimatedCounterProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
};

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 1.8,
  className,
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const reduceMotion = useReducedMotion();
  
  // Set fallback state immediately matching value, then animate
  const [display, setDisplay] = useState(value);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!isInView || reduceMotion) {
      setDisplay(value);
      return;
    }

    if (!hasStarted) {
      setDisplay(0);
      setHasStarted(true);
      return; // Give it one render cycle to reset to 0 before animating
    }

    let startTime: number | null = null;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // cubic-bezier(0.25, 0.1, 0.25, 1) equivalent easing
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOut(progress);
      
      setDisplay(Number((easedProgress * value).toFixed(decimals)));

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value, duration, reduceMotion, decimals, hasStarted]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
