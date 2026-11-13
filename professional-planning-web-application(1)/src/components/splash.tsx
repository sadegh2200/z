"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { useEffect, useState } from "react";

/** اسپلش برند — کوتاه و سینمایی، بعد از آماده‌شدن محو می‌شود. */
export function Splash() {
  // یک بار در هر نشست مرورگر
  const [gone, setGone] = useState(() => {
    try {
      return sessionStorage.getItem("nafs_splashed") === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setGone(true);
      try {
        sessionStorage.setItem("nafs_splashed", "1");
      } catch {
        /* ignore */
      }
    }, 1550);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.25, duration: 0.45, ease: "easeOut" }}
      className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-ink-950"
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300/8 blur-[110px]"
      />
      <div className="relative flex flex-col items-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="grid size-20 place-items-center rounded-[26px] border border-white/12 bg-gradient-to-br from-teal-300/25 to-violet-300/25 shadow-[0_20px_60px_-20px_rgba(94,234,212,0.45)]"
        >
          <Scale className="size-9 text-teal-200" />
        </motion.span>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-6 text-3xl font-black"
        >
          محاسبهٔ <span className="text-gradient">نفس</span>
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-xs font-bold text-stone-500"
        >
          چرخِ هفته · زنجیره · کیف پول پاداش
        </motion.p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.85, ease: "easeInOut" }}
          className="mt-7 h-0.5 w-40 origin-right rounded-full bg-gradient-to-l from-teal-300 to-violet-300"
        />
      </div>
    </motion.div>
  );
}
