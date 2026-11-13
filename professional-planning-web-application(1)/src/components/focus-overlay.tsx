"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fa, secToClock, type Block, type Routine } from "@/lib/core";
import { fireConfetti } from "@/lib/confetti";
import { playPop } from "@/lib/sound";

/** صفحه‌ی تمرکز: کرنومتر تمام‌صفحه — زمانِ اندازه‌گیری‌شده سهمی در امتیاز ندارد. */
export function FocusOverlay({
  block,
  routines,
  onClose,
  onSave,
}: {
  block: Block | null;
  /** روتین‌های دقیقه‌محور فعال — زمان تمرکز می‌تواند به یکی وصل شود */
  routines: Routine[];
  onClose: () => void;
  onSave: (blockId: number | null, routineId: number | null, seconds: number) => void;
}) {
  const [routineId, setRoutineId] = useState<number | null>(
    () => routines.find((r) => r.title.includes("تمرکز"))?.id ?? null,
  );
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());
  const [running] = useState(true);
  const [goalMin, setGoalMin] = useState(0); // ۰ = بدون هدف
  const [goalDone, setGoalDone] = useState(false);

  // اگر اپ وسط جلسه بسته شود، شروع جلسه می‌ماند تا دفعه‌ی بعد «جامانده» بازیابی شود
  useEffect(() => {
    try {
      localStorage.setItem(
        "nafs_focus_start",
        JSON.stringify({ start: startRef.current, blockId: block?.id ?? null, routineId }),
      );
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.id]);

  const dismiss = useCallback(() => {
    try {
      localStorage.removeItem("nafs_focus_start");
    } catch {
      /* ignore */
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setSeconds(s);
      if (goalMin > 0 && s >= goalMin * 60 && !goalDone) {
        setGoalDone(true);
        playPop();
        fireConfetti();
      }
    }, 500);
    return () => clearInterval(t);
  }, [running, goalMin, goalDone]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [dismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/92 backdrop-blur-2xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 animate-pulse-soft rounded-full bg-teal-300/6 blur-[120px]" />
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="بستن"
        className="absolute left-5 top-5 grid size-10 cursor-pointer place-items-center rounded-2xl border border-white/10 text-stone-400 transition-colors hover:border-white/25 hover:text-stone-100"
      >
        <X className="size-5" />
      </button>

      <div className="relative flex flex-col items-center px-6 text-center">
        <p className="text-[11px] font-bold tracking-[0.2em] text-teal-200/70">
          حالت تمرکز
        </p>
        <h2 className="mt-3 max-w-sm text-xl font-black text-stone-100 sm:text-2xl">
          {block ? block.title || block.cat : "تمرکز آزاد"}
        </h2>

        {/* حلقه‌ی هدف دور شمارنده */}
        <div className="relative mt-8 grid place-items-center">
          {goalMin > 0 ? (
            <svg width={300} height={300} className="absolute -rotate-90" aria-hidden>
              <circle
                cx={150}
                cy={150}
                r={140}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={6}
              />
              <motion.circle
                cx={150}
                cy={150}
                r={140}
                fill="none"
                stroke="url(#focus-goal-grad)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 140}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 140 * Math.max(0, 1 - seconds / (goalMin * 60)),
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ filter: goalDone ? "drop-shadow(0 0 12px rgba(94,234,212,0.7))" : undefined }}
              />
              <defs>
                <linearGradient id="focus-goal-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5EEAD4" />
                  <stop offset="100%" stopColor="#C4B5FD" />
                </linearGradient>
              </defs>
            </svg>
          ) : null}
          <motion.p
            key={Math.floor(seconds / 10)}
            className="bg-gradient-to-br from-teal-200 via-white to-violet-200 bg-clip-text font-sans text-[86px] font-black leading-none tracking-tight text-transparent tabular-nums sm:text-[110px]"
            dir="ltr"
          >
            {secToClock(seconds)}
          </motion.p>
        </div>

        {/* حالت هدف */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setGoalMin(0)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
              goalMin === 0
                ? "border-teal-200/40 bg-teal-300/10 text-teal-100"
                : "border-white/10 text-stone-500 hover:border-white/20"
            }`}
          >
            صعودی آزاد
          </button>
          {[15, 30, 45, 60, 90].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGoalMin(g);
                setGoalDone(false);
              }}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-extrabold tabular-nums transition-all ${
                goalMin === g
                  ? "border-amber-200/50 bg-amber-300/10 text-amber-100"
                  : "border-white/10 text-stone-500 hover:border-white/20"
              }`}
            >
              {fa(g)}′
            </button>
          ))}
          {goalMin > 0 ? (
            <span className="ms-1 text-[11px] font-bold text-stone-500">
              تا هدف: {secToClock(Math.max(0, goalMin * 60 - seconds))}
            </span>
          ) : null}
        </div>

        {goalDone ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 rounded-2xl border border-teal-200/30 bg-teal-300/10 px-5 py-2.5 text-sm font-black text-teal-100"
          >
            هدف تکمیل شد — تایمر ادامه دارد یا ثبتش کن.
          </motion.p>
        ) : null}

        <p className="mt-4 text-xs leading-6 text-stone-500">
          شمارش رو به بالا — این زمان در «دفتر زمان مصرفی» ثبت می‌شود، نه در امتیاز.
        </p>

        {routines.length > 0 ? (
          <label className="mt-5 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="text-[11px] font-bold text-stone-500">افزوده به روتین:</span>
            <select
              value={routineId ?? ""}
              onChange={(e) => setRoutineId(e.target.value ? Number(e.target.value) : null)}
              className="cursor-pointer bg-transparent text-xs font-extrabold text-teal-200 outline-none"
            >
              <option value="" className="bg-ink-900">— هیچ‌کدام (فقط آمار)</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id} className="bg-ink-900">
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (seconds >= 5) {
                playPop();
                onSave(block?.id ?? null, routineId, seconds);
              }
              dismiss();
            }}
            className="cursor-pointer rounded-2xl bg-gradient-to-l from-teal-300 to-violet-300 px-7 py-3.5 text-sm font-extrabold text-ink-950 shadow-[0_14px_40px_-12px_rgba(94,234,212,0.6)] transition-transform hover:scale-[1.04] active:scale-95"
          >
            توقف و ثبت {seconds >= 5 ? `(${secToClock(seconds)})` : ""}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer rounded-2xl border border-white/12 px-6 py-3.5 text-sm font-bold text-stone-400 transition-colors hover:border-white/25 hover:text-stone-100"
          >
            لغو بدون ثبت
          </button>
        </div>
      </div>
    </motion.div>
  );
}
