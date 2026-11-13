"use client";

import { motion } from "framer-motion";
import { Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { secToClock, taskElapsedSec, type DayTask } from "@/lib/core";

/** مینی‌پیپ «در حال تمرکز» — تایمر جاری همیشه دیده می‌شود، حتی از تب دیگر */
export function FocusPip({
  task,
  onStop,
  onGoToday,
}: {
  task: DayTask;
  onStop: () => void;
  onGoToday: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="glass-strong fixed bottom-24 start-4 z-[60] flex items-center gap-3 rounded-2xl py-2.5 pe-2.5 ps-4 shadow-[0_18px_50px_-14px_rgba(0,0,0,0.9)] lg:bottom-6"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-teal-300" />
      </span>
      <button
        type="button"
        onClick={onGoToday}
        className="min-w-0 cursor-pointer text-right"
        title="برو به امروز"
      >
        <span className="block max-w-36 truncate text-xs font-extrabold text-stone-100">
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-stone-500">
          <Timer className="size-3" />
          تایمر در حال کار است
        </span>
      </button>
      <span className="font-sans text-base font-black tabular-nums text-teal-200" dir="ltr">
        {secToClock(taskElapsedSec(task))}
      </span>
      <button
        type="button"
        onClick={onStop}
        aria-label="توقف تایمر"
        className="grid size-9 cursor-pointer place-items-center rounded-xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Square className="size-3.5" />
      </button>
    </motion.div>
  );
}
