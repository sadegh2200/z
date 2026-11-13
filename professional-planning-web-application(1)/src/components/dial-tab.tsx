"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Expand, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  blockMinutes,
  blocksForDay,
  catOf,
  dayScore,
  fa,
  faClock,
  faDur,
  shiftKey,
  todayKey,
  weekDayIndex,
  weekStartKey,
  WEEKDAY_FA,
  type AppState,
} from "@/lib/core";
import { Wheel } from "./wheel";

/**
 * چرخ نسل ۳: هفت روز هفته به‌صورت هفت حلقه‌ی هم‌مرکز ۲۴ ساعته،
 * با پرده‌ی روزهای نرسیده و عقربه‌ی «الان».
 */
export function DialTab({ state }: { state: AppState }) {
  const todayWd = weekDayIndex(todayKey());
  const [selected, setSelected] = useState<number>(todayWd);
  const [fullscreen, setFullscreen] = useState(false); // حالت تمام‌صفحه‌ی چرخ نسل ۳

  const dayKey = useMemo(() => {
    const start = weekStartKey(todayKey());
    return shiftKey(start, selected);
  }, [selected]);

  const score = useMemo(
    () => dayScore(dayKey, state.blocks, state.checks, state.dayMeta),
    [dayKey, state],
  );
  const dayBlocks = blocksForDay(state.blocks, selected);
  const plannedTotal = dayBlocks
    .filter((b) => b.counts && catOf(b.cat).counts)
    .reduce((n, b) => n + blockMinutes(b), 0);

  return (
    <div>
      <header>
        <p className="text-xs font-bold tracking-wide text-stone-500 sm:text-sm">
          هر حلقه یک روز، هر رنگ یک دسته — شنبه در مرکز تا جمعه در لبه
        </p>
        <h1 className="mt-2 text-3xl font-black leading-[1.25] sm:text-4xl lg:text-[40px]">
          چرخِ <span className="text-gradient">هفته</span>
        </h1>
      </header>

      <div className="mt-7 grid items-start gap-4 xl:grid-cols-[1fr_340px]">
        <div className="glass relative overflow-hidden rounded-[28px] p-4 sm:p-6">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute left-4 top-4 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 bg-ink-950/60 px-3 py-2 text-[10px] font-extrabold text-stone-300 backdrop-blur transition-colors hover:border-teal-200/40 hover:text-teal-200"
          >
            <Expand className="size-3.5" />
            تمام‌صفحه
          </button>
          <div className="mx-auto w-full max-w-[560px]">
            <div className="[&>div]:!w-full [&>div]:!h-auto [&_svg]:h-auto [&_svg]:w-full">
              <Wheel
                mode="week"
                size={560}
                blocks={state.blocks}
                checks={state.checks}
                night={state.kv.night}
                selectedWd={selected}
                onSelectWd={setSelected}
                showMarks={state.kv.dialMarks}
                theme={state.kv.dialTheme}
              >
                <div>
                  <p className="text-lg font-black text-stone-100">{WEEKDAY_FA[selected]}</p>
                  <p className="mt-1 text-[10px] font-bold text-stone-500">
                    {selected === todayWd ? "امروز" : score.valid ? "معتبر" : "—"}
                  </p>
                </div>
              </Wheel>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] font-bold text-stone-600">
            روی هر حلقه بزن تا جزئیات آن روز را ببینی
          </p>
        </div>

        {/* جزئیات روز انتخابی */}
        <div className="glass rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-stone-200">
              {WEEKDAY_FA[selected]}
              {selected === todayWd ? <span className="text-teal-300"> (امروز)</span> : null}
            </h2>
            <span className="text-[11px] font-bold text-stone-500">
              بار جبری: {faDur(plannedTotal)}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {dayBlocks.map((b) => {
              const c = catOf(b.cat);
              const Icon = c.icon;
              const done = state.checks.some(
                (x) => x.blockId === b.id && x.day === dayKey && x.done,
              );
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${
                    done ? "border-teal-200/20 bg-teal-300/[0.05]" : "border-white/8 bg-white/[0.02]"
                  }`}
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl"
                    style={{ background: `${c.fg}1a`, color: c.fg }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${done ? "text-stone-400" : "text-stone-100"}`}>
                      {b.title || b.cat}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-stone-500">
                      {faClock(b.fromMin)}–{faClock(b.toMin)} · {faDur(blockMinutes(b))}
                    </p>
                  </div>
                  {done ? <span className="text-[10px] font-extrabold text-teal-300">انجام شد</span> : null}
                </div>
              );
            })}
            {dayBlocks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-stone-500">
                روز آزاد — هیچ بلوکی ندارد.
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-4 text-center">
            <div>
              <p className="text-sm font-black tabular-nums text-teal-200">
                {fa(Math.round(score.ratio * 100))}٪
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-stone-500">پوشش</p>
            </div>
            <div>
              <p className="text-sm font-black tabular-nums text-amber-200">
                {fa(score.pointsBanked || score.points)}
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-stone-500">
                {score.pointsBanked ? "واریزشده" : "امتیاز"}
              </p>
            </div>
            <div>
              <p className="text-sm font-black tabular-nums text-stone-200">
                {score.pass ? "پاس" : score.valid ? "معتبر" : "—"}
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-stone-500">وضعیت روز</p>
            </div>
          </div>
          {score.pass && score.passReason ? (
            <p className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-300/5 px-3.5 py-2.5 text-[11px] leading-5 text-amber-100/80">
              دلیل پاس: {score.passReason}
            </p>
          ) : null}
        </div>
      </div>

      {/* حالت تمام‌صفحه */}
      <AnimatePresence>
        {fullscreen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] grid place-items-center bg-ink-950/92 p-4 backdrop-blur-2xl"
            onClick={() => setFullscreen(false)}
          >
            <button
              type="button"
              aria-label="خروج از تمام‌صفحه"
              onClick={() => setFullscreen(false)}
              className="absolute left-4 top-4 grid size-10 cursor-pointer place-items-center rounded-2xl border border-white/12 text-stone-400 transition-colors hover:border-white/25 hover:text-stone-100"
            >
              <X className="size-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(92vmin,700px)] [&>div]:!h-auto [&>div]:!w-full [&_svg]:h-auto [&_svg]:w-full"
            >
              <Wheel
                mode="week"
                size={700}
                blocks={state.blocks}
                checks={state.checks}
                night={state.kv.night}
                selectedWd={selected}
                onSelectWd={setSelected}
                showMarks
                theme={state.kv.dialTheme}
              >
                <div>
                  <p className="text-xl font-black text-stone-100">{WEEKDAY_FA[selected]}</p>
                  <p className="mt-1 text-[11px] font-bold text-stone-500">
                    {selected === todayWd ? "امروز" : score.valid ? "معتبر" : "—"}
                  </p>
                </div>
              </Wheel>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* راهنمای رنگ‌ها */}
      <div className="glass mt-4 rounded-[24px] p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {[...new Set(state.blocks.filter((b) => b.active).map((b) => b.cat))].map((cat) => {
            const c = catOf(cat);
            return (
              <span key={cat} className="inline-flex items-center gap-2 text-[11px] font-bold text-stone-400">
                <span className="size-2.5 rounded-[4px]" style={{ background: c.fg, opacity: 0.85 }} />
                {cat}
              </span>
            );
          })}
          <span className="ms-auto inline-flex items-center gap-2 text-[11px] font-bold text-stone-500">
            <span className="size-2.5 rounded-[4px] bg-white/10" />
            روز / <span className="size-2.5 rounded-[4px] bg-black/40 ring-1 ring-white/10" /> شب
          </span>
        </div>
      </div>
    </div>
  );
}
