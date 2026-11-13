"use client";

import { motion } from "framer-motion";
import { Check, CircleDot, FastForward, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  blockMinutes,
  catOf,
  dayScore,
  fa,
  faClock,
  nowMinutes,
  shiftKey,
  todayKey,
  weekDayIndex,
  type AppState,
  type Block,
} from "@/lib/core";
import { playPop } from "@/lib/sound";

/**
 * «همین الان» — همین‌ثانیه چه چیزی در برنامه است، با شمارش معکوس زنده
 * و CTA هوشمند: تمرکز / تیک / بستن روز.
 */
export function NowBar({
  state,
  onToggle,
  onFocus,
  onTonight,
}: {
  state: AppState;
  onToggle: (b: Block, done: boolean, actualMin?: number) => void;
  onFocus: (b: Block) => void;
  onTonight: () => void;
}) {
  const today = todayKey();
  const wd = weekDayIndex(today);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const now = nowMinutes();
  const score = dayScore(today, state.blocks, state.checks, state.dayMeta, state.kv.streakCfg);

  const derived = useMemo(() => {
    const dayBlocks = state.blocks
      .filter((b) => b.active && b.day === wd)
      .sort((a, b) => a.fromMin - b.fromMin);
    const doneIds = new Set(
      state.checks.filter((c) => c.day === today && c.done).map((c) => c.blockId),
    );

    let current: Block | null = null;
    let next: Block | null = null;
    for (const b of dayBlocks) {
      const end = blockMinutes(b) + b.fromMin;
      if (now >= b.fromMin && now < end) {
        current = b;
        const rest = dayBlocks.slice(dayBlocks.indexOf(b) + 1);
        next = rest.find((x) => !doneIds.has(x.id)) ?? null;
        break;
      }
      if (b.fromMin > now && !doneIds.has(b.id)) {
        next = b;
        break;
      }
    }
    return { current, next };
  }, [state, wd, today, now]);

  const cur = derived.current;
  const nxt = derived.next;
  const allDone = score.mandatoryTotal > 0 && score.mandatoryDone >= score.mandatoryTotal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="glass glow-conic glass-sheen relative mt-5 overflow-hidden rounded-[26px] p-4 sm:p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-teal-300/8 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center gap-4">
        {/* حلقه‌ی شمارش تا پایان بلوک جاری */}
        <div className="relative grid size-[74px] shrink-0 place-items-center">
          <svg width={74} height={74} className="-rotate-90" aria-hidden>
            <circle cx={37} cy={37} r={31} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
            {cur ? (
              <motion.circle
                cx={37}
                cy={37}
                r={31}
                fill="none"
                stroke="url(#nowgrad)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 31}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 31 * (1 - (now - cur.fromMin) / Math.max(1, blockMinutes(cur))),
                }}
                transition={{ duration: 0.5 }}
              />
            ) : null}
            <defs>
              <linearGradient id="nowgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="100%" stopColor="#C4B5FD" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-center">
            <span className="block font-sans text-[13px] font-black tabular-nums leading-none text-teal-200">
              {cur
                ? `${fa(Math.max(0, blockMinutes(cur) - (now - cur.fromMin)))}′`
                : "—"}
            </span>
            <span className="mt-1 block text-[8px] font-extrabold text-stone-500">باقی</span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {cur ? (
            <>
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.18em] text-teal-300">
                <CircleDot className="size-3 animate-pulse" />
                الان در برنامه
              </p>
              <p className="mt-1 truncate text-lg font-black text-stone-50">
                {cur.title || cur.cat}
                <span className="ms-2 text-xs font-bold text-stone-500">
                  تا {faClock((cur.fromMin + blockMinutes(cur)) % 1440)}
                </span>
              </p>
            </>
          ) : nxt ? (
            <>
              <p className="text-[10px] font-extrabold tracking-[0.18em] text-stone-500">
                بلوک بعدی
              </p>
              <p className="mt-1 truncate text-lg font-black text-stone-50">
                {nxt.title || nxt.cat}
                <span className="ms-2 text-xs font-bold text-stone-500">{faClock(nxt.fromMin)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-extrabold tracking-[0.18em] text-stone-500">
                برنامه‌ی امروز تمام شد
              </p>
              <p className="mt-1 text-lg font-black text-stone-50">
                {allDone ? "روز طلایی — بستن شب می‌ارزد 🌙" : "فضای آزاد برای برنامه‌ی خودت"}
              </p>
            </>
          )}
          {nxt ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
              <FastForward className="size-3" />
              بعد از آن: {nxt.title || nxt.cat}، {faClock(nxt.fromMin)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {cur ? (
            <>
              <button
                type="button"
                onClick={() => onFocus(cur)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 px-3.5 py-2 text-xs font-extrabold text-stone-300 transition-colors hover:border-teal-200/40 hover:text-teal-200"
              >
                <Timer className="size-3.5" />
                تمرکز
              </button>
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onToggle(cur, true, blockMinutes(cur));
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-l from-teal-300 to-violet-300 px-4 py-2 text-xs font-extrabold text-ink-950 shadow-[0_10px_24px_-10px_rgba(94,234,212,0.55)] transition-transform hover:scale-105 active:scale-95"
              >
                <Check className="size-3.5" />
                انجام شد
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onTonight}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200/30 bg-amber-300/10 px-4 py-2 text-xs font-extrabold text-amber-200 transition-colors hover:bg-amber-300/20"
            >
              پرده‌ی پایان شب
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** پیش‌نمای فردا — بار برنامه فردا در یک نگاه */
export function TomorrowPeek({ state }: { state: AppState }) {
  const tomorrow = shiftKey(todayKey(), 1);
  const wd = weekDayIndex(tomorrow);
  const blocks = state.blocks
    .filter((b) => b.active && b.day === wd)
    .sort((a, b) => a.fromMin - b.fromMin);
  if (blocks.length === 0) return null;
  const planned = blocks.reduce((n, b) => n + blockMinutes(b), 0);
  return (
    <div className="glass mt-4 flex flex-wrap items-center gap-3 rounded-[22px] px-5 py-4">
      <span className="text-[11px] font-extrabold tracking-wide text-stone-500">فردا:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {blocks.slice(0, 4).map((b) => {
          const c = catOf(b.cat);
          return (
            <span
              key={b.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-stone-400"
            >
              <span className="size-1.5 rounded-full" style={{ background: c.fg }} />
              {b.title || b.cat} · {faClock(b.fromMin)}
            </span>
          );
        })}
        {blocks.length > 4 ? (
          <span className="text-[10px] font-bold text-stone-600">+{fa(blocks.length - 4)}</span>
        ) : null}
      </div>
      <span className="ms-auto text-[10px] font-extrabold text-violet-200/80">
        بار برنامه: {fa(Math.round(planned / 60))} ساعت
      </span>
    </div>
  );
}
