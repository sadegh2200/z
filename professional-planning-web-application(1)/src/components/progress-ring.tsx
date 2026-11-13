"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function ProgressRing({
  value,
  size = 156,
  stroke = 11,
  celebrate = false,
  children,
}: {
  /** 0..100 */
  value: number;
  size?: number;
  stroke?: number;
  celebrate?: boolean;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      {celebrate ? (
        <div className="absolute inset-[-14px] animate-pulse-soft rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.28),transparent_70%)] blur-lg" />
      ) : null}
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="emruz-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="55%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#F0ABFC" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#emruz-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset:
              circumference - (circumference * clamped) / 100,
          }}
          transition={{ type: "spring", stiffness: 55, damping: 16 }}
          style={
            celebrate
              ? { filter: "drop-shadow(0 0 10px rgba(94,234,212,0.55))" }
              : undefined
          }
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
}
