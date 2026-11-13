"use client";

import { motion } from "framer-motion";
import { BookMarked, CheckSquare, ClipboardPen, PencilRuler, Square, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  blockMinutes,
  catOf,
  dayScore,
  dayMonthFa,
  dayPoints,
  fa,
  faClock,
  faDur,
  nowMinutes,
  shiftKey,
  todayKey,
  weekDayIndex,
  weekStartKey,
  WEEKDAY_FA,
  type AppState,
} from "@/lib/core";
import { playPop } from "@/lib/sound";

export function WeekTab({
  state,
  onKv,
  onEditDay,
}: {
  state: AppState;
  onKv: (key: string, value: unknown) => void;
  /** کارت ویرایش روز انتخابی — پرش مستقیم به همان روز در تنظیمات */
  onEditDay: (wd: number) => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false); // نمای ستونی جمع‌وجور — پیش‌فرض بسته
  const today = todayKey();
  const start = weekStartKey(today);
  const todayWd = weekDayIndex(today);
  const [selected, setSelected] = useState<number>(todayWd);

  const weekKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftKey(start, i)),
    [start],
  );
  const scores = useMemo(
    () => weekKeys.map((k) => dayScore(k, state.blocks, state.checks, state.dayMeta)),
    [weekKeys, state],
  );
  // امتیاز مؤثر = بانک‌شده/در راه + بونوس بازگشت
  const effPoints = useMemo(
    () => weekKeys.map((k) => dayPoints(k, state)),
    [weekKeys, state],
  );
  const basePoints = effPoints.reduce((n, p) => n + p, 0);
  const weekRatio =
    scores.reduce((n, s) => n + s.plannedMin, 0) === 0
      ? 0
      : scores.reduce((n, s) => n + s.doneMin, 0) / scores.reduce((n, s) => n + s.plannedMin, 0);

  /* ------------------------------ دفتر ۱۶۸ ساعت ----------------------------- */
  const ledger = useMemo(() => {
    const planned = new Map<string, number>();
    const actual = new Map<string, number>();
    for (const b of state.blocks.filter((x) => x.active)) {
      planned.set(b.cat, (planned.get(b.cat) ?? 0) + blockMinutes(b));
    }
    for (const c of state.checks) {
      if (!c.done || c.actualMin <= 0) continue;
      if (!weekKeys.includes(c.day)) continue;
      const b = state.blocks.find((x) => x.id === c.blockId);
      if (!b) continue;
      actual.set(b.cat, (actual.get(b.cat) ?? 0) + c.actualMin);
    }
    for (const s of state.sessions) {
      if (!weekKeys.includes(s.day) || s.blockId === null) continue;
      const b = state.blocks.find((x) => x.id === s.blockId);
      if (!b) continue;
      actual.set(b.cat, (actual.get(b.cat) ?? 0) + Math.round(s.seconds / 60));
    }
    return [...planned.entries()]
      .map(([cat, p]) => ({ cat, planned: p, actual: actual.get(cat) ?? 0 }))
      .sort((a, b) => b.planned - a.planned);
  }, [state, weekKeys]);

  const totalActual = ledger.reduce((n, r) => n + r.actual, 0);
  const totalPlanned = ledger.reduce((n, r) => n + r.planned, 0);

  /* ------------------------------ چک‌لیست هفتگی ----------------------------- */
  const checklist = state.kv.checklist;
  const cw =
    state.kv.checklistWeek.weekKey === start
      ? state.kv.checklistWeek
      : { weekKey: start, doneIds: [] as string[] };
  const allDone = checklist.length > 0 && checklist.every((c) => cw.doneIds.includes(c.id));
  // بونوس چک‌لیست هفتگی (مشتق‌شده — جدا ذخیره نمی‌شود)
  const weekPoints = basePoints + (allDone ? 20 : 0);
  const review = state.kv.weekReviews?.[start];

  function toggleItem(id: string) {
    const doneIds = cw.doneIds.includes(id)
      ? cw.doneIds.filter((x) => x !== id)
      : [...cw.doneIds, id];
    if (!cw.doneIds.includes(id)) playPop();
    onKv("checklistWeek", { weekKey: start, doneIds });
  }

  const selKey = weekKeys[selected];
  const selBlocks = state.blocks
    .filter((b) => b.active && b.day === selected)
    .sort((a, b) => a.fromMin - b.fromMin);
  const selScore = scores[selected];

  return (
    <div>
      <header>
        <p className="text-xs font-bold tracking-wide text-stone-500 sm:text-sm">
          تصویر هفته در یک نگاه — ببین کجا ایستاده‌ای
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black leading-[1.25] sm:text-4xl lg:text-[40px]">
            هفته‌ی <span className="text-gradient">جاری</span>
          </h1>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-extrabold transition-all hover:-translate-y-0.5 ${
              review
                ? "border-violet-300/35 bg-violet-300/10 text-violet-100"
                : "border-white/12 text-stone-300 hover:border-violet-300/40 hover:text-violet-200"
            }`}
          >
            <ClipboardPen className="size-4" />
            {review ? "بازبینی ثبت شده" : "بازبینی هفته"}
          </button>
        </div>
      </header>

      {/* کارت‌های هفت روز */}
      <div className="mt-7 grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {weekKeys.map((k, i) => {
          const s = scores[i];
          const isToday = k === today;
          const isSel = selected === i;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelected(i)}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-all hover:-translate-y-0.5 ${
                isSel
                  ? "border-teal-200/50 bg-teal-300/10"
                  : isToday
                    ? "border-teal-200/25 bg-white/[0.03]"
                    : "border-white/8 hover:border-white/20"
              }`}
            >
              <span className="text-[10px] font-bold text-stone-500">{WEEKDAY_FA[i]}</span>
              <DayRing ratio={s.ratio} valid={s.valid} pass={s.pass} future={i > todayWd} />
              <span
                className={`text-[11px] font-black tabular-nums ${
                  isToday || isSel ? "text-teal-200" : "text-stone-400"
                }`}
              >
                {fa(effPoints[i])}
              </span>
            </button>
          );
        })}
      </div>

      {/* جدول زمان‌بندی هفته — دید جدولی سنتی کنار چرخ */}
      <WeekGridCards state={state} weekKeys={weekKeys} today={today} />

      {/* روز انتخابی: خط‌زمان */}
      <div className="glass glass-sheen mt-4 rounded-[28px] p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-sm font-black text-stone-200">
            {WEEKDAY_FA[selected]} · {dayMonthFa(selKey)}
          </h2>
          <button
            type="button"
            onClick={() => onEditDay(selected)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 px-3 py-1.5 text-[10px] font-extrabold text-stone-300 transition-colors hover:border-teal-200/40 hover:text-teal-200"
          >
            <PencilRuler className="size-3.5" />
            ویرایش الگوی {WEEKDAY_FA[selected]}
          </button>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-extrabold text-stone-400">
            پوشش: {fa(Math.round(selScore.ratio * 100))}٪
          </span>
          {selScore.pass ? (
            <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-extrabold text-amber-200">
              پاس{selScore.passReason ? `: ${selScore.passReason}` : ""}
            </span>
          ) : null}
        </div>

        {/* نوار شبانه‌روز: نیمه‌رنگ‌ها + بلوک‌ها + برچسب‌ها */}
        <div className="relative mt-5">
          <div className="relative h-16 overflow-hidden rounded-2xl border border-white/8 bg-black/25">
            {/* روز / شب */}
            <div className="absolute inset-y-0 bg-white/[0.04]" style={{ insetInlineStart: "25%", width: "50%" }} />
            {selBlocks.map((b) => {
              const c = catOf(b.cat);
              const startPct = (b.fromMin / 1440) * 100;
              const widthPct = (blockMinutes(b) / 1440) * 100;
              const done = state.checks.some(
                (x) => x.blockId === b.id && x.day === selKey && x.done,
              );
              return (
                <div
                  key={b.id}
                  title={`${b.title || b.cat} — ${faDur(blockMinutes(b))}`}
                  className="absolute inset-y-0"
                  style={{
                    insetInlineStart: `${startPct}%`,
                    width: `${Math.max(1.2, widthPct)}%`,
                    background: `linear-gradient(180deg, ${c.fg}${done ? "" : "b0"}, ${c.ink})`,
                    opacity: done ? 1 : 0.55,
                  }}
                />
              );
            })}
            {/* خط الان */}
            {selKey === today ? <NowLine /> : null}
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] font-bold text-stone-600">
            <span>۰۰</span><span>۰۶</span><span>۱۲</span><span>۱۸</span><span>۲۴</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {selBlocks.map((b) => {
            const done = state.checks.some((x) => x.blockId === b.id && x.day === selKey && x.done);
            const c = catOf(b.cat);
            return (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold"
                style={{
                  borderColor: `${c.fg}33`,
                  background: done ? `${c.fg}14` : "rgba(255,255,255,0.03)",
                  color: done ? c.fg : "rgba(231,229,228,0.75)",
                }}
              >
                {b.title || b.cat}
                {done ? "✓" : ""}
              </span>
            );
          })}
          {selBlocks.length === 0 ? (
            <span className="text-xs text-stone-500">روز آزاد.</span>
          ) : null}
        </div>
      </div>

      {/* نمودار امتیاز هفته */}
      <div className="glass glass-sheen mt-4 rounded-[28px] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-stone-200">نمودار امتیاز</h2>
          <span className="text-[11px] font-bold text-stone-500">
            مجموع هفته: {fa(weekPoints)} · پوشش کلی: {fa(Math.round(weekRatio * 100))}٪
          </span>
        </div>
        <PointsChart
          scores={scores.map((s, i) => ({ day: s.day, points: effPoints[i] }))}
          todayIdx={todayWd}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* دفتر ۱۶۸ ساعت — نمای ستونی جمع‌وجور، پیش‌فرض بسته */}
        <div className="glass rounded-[28px] p-5">
          <button
            type="button"
            onClick={() => setLedgerOpen((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-2.5 text-right"
            aria-expanded={ledgerOpen}
          >
            <BookMarked className="size-4 text-stone-500" />
            <h2 className="text-sm font-black text-stone-200">دفتر زمان مصرفی هفته</h2>
            <span className="text-[10px] font-bold text-stone-500">
              زمانِ واقعی، بی‌اثر بر پاداش
            </span>
            <span className="ms-auto text-[10px] font-extrabold text-teal-200">
              {ledgerOpen ? "بستن" : "باز کن"}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {ledgerOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="overflow-hidden"
              >
          <div className="mt-4 space-y-3">
            {ledger.map((row) => {
              const c = catOf(row.cat);
              const ratio = row.planned === 0 ? 0 : Math.min(1, row.actual / row.planned);
              return (
                <div key={row.cat}>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1.5" style={{ color: c.fg }}>
                      <span className="size-2 rounded-full" style={{ background: c.fg }} />
                      {row.cat}
                    </span>
                    <span className="tabular-nums text-stone-500">
                      {faDur(row.actual)} از {faDur(row.planned)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/6">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${c.ink}, ${c.fg})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, ratio * 100)}%` }}
                      transition={{ type: "spring", stiffness: 60, damping: 16 }}
                    />
                  </div>
                </div>
              );
            })}
            {ledger.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-500">الگویی نیست.</p>
            ) : null}
          </div>
          <p className="mt-4 border-t border-white/8 pt-3 text-[11px] font-bold text-stone-500">
            جمع هفته: <span className="text-stone-200">{faDur(totalActual)}</span> مصرفی از{" "}
            <span className="text-stone-200">{faDur(totalPlanned)}</span> برنامه
          </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* چک‌لیست هفتگی */}
        <div className="glass rounded-[28px] p-5">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="size-4 text-stone-500" />
            <h2 className="text-sm font-black text-stone-200">چک‌لیست هفتگی</h2>
            {allDone ? (
              <span className="ms-auto rounded-full border border-teal-200/30 bg-teal-300/10 px-2.5 py-1 text-[10px] font-extrabold text-teal-100">
                بونوس کامل شد +۲۰
              </span>
            ) : (
              <span className="ms-auto text-[10px] font-bold text-stone-500">
                تکمیل همه = بونوس +۲۰
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {checklist.map((item) => {
              const done = cw.doneIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-right transition-all ${
                    done
                      ? "border-teal-200/25 bg-teal-300/[0.06]"
                      : "border-white/8 bg-white/[0.02] hover:border-white/16"
                  }`}
                >
                  {done ? (
                    <CheckSquare className="size-5 shrink-0 text-teal-300" />
                  ) : (
                    <Square className="size-5 shrink-0 text-stone-600" />
                  )}
                  <span
                    className={`text-sm font-bold ${done ? "text-stone-400 line-through" : "text-stone-100"}`}
                  >
                    {item.title}
                  </span>
                </button>
              );
            })}
            {checklist.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-500">
                از تنظیمات آیتم اضافه کن.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* بازبینی هفته */}
      <AnimatePresence>
        {reviewOpen ? (
          <WeekReviewModal
            review={review}
            onClose={() => setReviewOpen(false)}
            onSave={(mood, note) => {
              onKv("weekReviews", {
                ...(state.kv.weekReviews ?? {}),
                [start]: { mood, note, at: new Date().toISOString() },
              });
              setReviewOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** بازبینی هفته — یک نفس راحت آخر هفته */
function WeekReviewModal({
  review,
  onClose,
  onSave,
}: {
  review: { mood: "great" | "ok" | "hard"; note: string; at: string } | undefined;
  onClose: () => void;
  onSave: (mood: "great" | "ok" | "hard", note: string) => void;
}) {
  const [mood, setMood] = useState<"great" | "ok" | "hard">(review?.mood ?? "ok");
  const [note, setNote] = useState(review?.note ?? "");

  const MOODS = [
    { key: "great" as const, label: "هفته‌ی درخشان", cls: "border-teal-200/50 bg-teal-300/10 text-teal-100" },
    { key: "ok" as const, label: "قابل‌قبول", cls: "border-sky-200/40 bg-sky-300/10 text-sky-100" },
    { key: "hard" as const, label: "هفته‌ی سخت", cls: "border-rose-300/40 bg-rose-400/10 text-rose-200" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="بازبینی هفته"
        className="glass-strong w-full max-w-md rounded-[26px] p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">بازبینی هفته</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-stone-500 transition-colors hover:bg-white/8 hover:text-stone-200"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-6 text-stone-500">
          هفته را احساسی ارزیابی کن؛ این یادداشت‌ها در دفتر شخصی‌ات می‌ماند.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMood(m.key)}
              className={`cursor-pointer rounded-2xl border px-2 py-3 text-[11px] font-extrabold transition-all ${
                mood === m.key ? m.cls : "border-white/10 text-stone-400 hover:border-white/20"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="چه چیزی کارساز بود؟ چه چیزی را هفته‌ی بعد عوض می‌کنی؟"
          className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm leading-7 text-stone-100 outline-none placeholder:text-stone-600 focus:border-violet-300/40"
        />

        <button
          type="button"
          onClick={() => onSave(mood, note.trim())}
          className="mt-5 w-full cursor-pointer rounded-2xl bg-gradient-to-l from-violet-300 to-teal-300 px-5 py-3 text-sm font-extrabold text-ink-950 transition-transform hover:scale-[1.02] active:scale-95"
        >
          ثبت بازبینی
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------- sub-pieces -------------------------------- */

/** جدول زمان‌بندی هفته: ۷ ستون روز × محور ساعت (۴:۰۰ تا ۲۴:۰۰) */
function WeekGridCards({
  state,
  weekKeys,
  today,
}: {
  state: AppState;
  weekKeys: string[];
  today: string;
}) {
  const H0 = 240; // ۴:۰۰
  const H1 = 1440;
  const H = 340;
  const px = H / (H1 - H0);
  const nowMin = nowMinutes();

  return (
    <div className="glass mt-4 overflow-x-auto rounded-[28px] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-stone-200">جدول هفته</h2>
        <span className="text-[10px] font-bold text-stone-500">۴:۰۰ تا ۲۴:۰۰ · رنگ = دسته</span>
      </div>
      <div className="mt-4 min-w-[620px]">
        <div className="grid grid-cols-7 gap-1.5">
          {weekKeys.map((k, i) => {
            const blocks = state.blocks
              .filter((b) => b.active && b.day === i)
              .sort((a, b) => a.fromMin - b.fromMin);
            const isToday = k === today;
            return (
              <div key={k} className="min-w-0">
                <p
                  className={`mb-1.5 text-center text-[10px] font-extrabold ${
                    isToday ? "text-teal-200" : "text-stone-500"
                  }`}
                >
                  {WEEKDAY_FA[i]}
                </p>
                <div
                  className={`relative overflow-hidden rounded-xl border ${
                    isToday ? "border-teal-200/25 bg-teal-300/[0.03]" : "border-white/6 bg-white/[0.02]"
                  }`}
                  style={{ height: H }}
                >
                  {/* خطوط ۲ ساعته */}
                  {[6, 10, 14, 18, 22].map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-white/5"
                      style={{ top: (h * 60 - H0) * px }}
                    />
                  ))}
                  {blocks.map((b) => {
                    const start = Math.max(H0, b.fromMin);
                    const end = Math.min(H1, blockMinutes(b) + b.fromMin);
                    if (end <= start) return null;
                    const c = catOf(b.cat);
                    const done = state.checks.some((x) => x.blockId === b.id && x.day === k && x.done);
                    return (
                      <div
                        key={b.id}
                        title={`${b.title || b.cat} — ${faClock(b.fromMin)} به ${faClock(end % 1440)}`}
                        className="absolute inset-x-1 rounded-md"
                        style={{
                          top: (start - H0) * px,
                          height: Math.max(6, (end - start) * px),
                          background: `linear-gradient(180deg, ${c.fg}${done ? "" : "c8"}, ${c.ink})`,
                          opacity: done ? 1 : 0.62,
                        }}
                      />
                    );
                  })}
                  {/* خط الان */}
                  {isToday && nowMin >= H0 && nowMin < H1 ? (
                    <div className="absolute inset-x-0 z-10" style={{ top: (nowMin - H0) * px }}>
                      <div className="border-t border-dashed border-teal-300/70" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayRing({
  ratio,
  valid,
  pass,
  future,
}: {
  ratio: number;
  valid: boolean;
  pass: boolean;
  future: boolean;
}) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, ratio));
  const stroke = pass ? "#FBBF24" : valid ? "#5EEAD4" : future ? "rgba(255,255,255,0.15)" : "#FB7185";
  return (
    <svg width={34} height={34} className="-rotate-90">
      <circle cx={17} cy={17} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3.5} />
      <motion.circle
        cx={17}
        cy={17}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - c * Math.max(pct, pass || valid ? 1 : 0.04) }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
        opacity={future ? 0.4 : 1}
      />
    </svg>
  );
}

function NowLine() {
  // خط «الان» زنده
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const now = new Date();
  const pct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  return (
    <div className="absolute inset-y-0 z-10" style={{ insetInlineStart: `${pct}%`, width: 0 }}>
      <div className="absolute inset-y-0 -translate-x-1/2 border-r border-dashed border-teal-300/80" style={{ borderInlineStartWidth: 0 }} />
      <span className="absolute -top-1 -translate-x-1/2 rounded-full bg-teal-300 px-1.5 text-[8px] font-black leading-4 text-ink-950">
        الان
      </span>
    </div>
  );
}

function PointsChart({
  scores,
  todayIdx,
}: {
  scores: { day: string; points: number }[];
  todayIdx: number;
}) {
  const W = 560;
  const H = 150;
  const max = Math.max(...scores.map((s) => s.points), 10);
  const step = (W - 48) / 7;
  const bw = step * 0.5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="نمودار امتیاز هفته">
      <defs>
        <linearGradient id="wbar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#8B7CF6" />
        </linearGradient>
      </defs>
      {scores.map((s, i) => {
        const x = W - 24 - i * step - bw; // شنبه راست‌ترین (خوانش راست‌به‌چپ)
        const h = Math.max(3, (s.points / max) * (H - 52));
        return (
          <g key={s.day} opacity={i > todayIdx ? 0.35 : 1}>
            <motion.rect
              x={x}
              width={bw}
              rx={7}
              fill="url(#wbar)"
              initial={{ y: H - 32, height: 0 }}
              animate={{ y: H - 32 - h, height: h }}
              transition={{ type: "spring", stiffness: 90, damping: 18, delay: i * 0.05 }}
              opacity={i === todayIdx ? 1 : 0.7}
            />
            <text x={x + bw / 2} y={H - 32 - h - 8} textAnchor="middle" fontSize={11} fontWeight={800} fill="#99F6E4">
              {fa(s.points)}
            </text>
            <text
              x={x + bw / 2}
              y={H - 12}
              textAnchor="middle"
              fontSize={10}
              fontWeight={i === todayIdx ? 900 : 600}
              fill={i === todayIdx ? "#5EEAD4" : "rgba(255,255,255,0.4)"}
            >
              {WEEKDAY_FA[i].slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
