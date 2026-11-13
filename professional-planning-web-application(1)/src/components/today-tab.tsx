"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  BadgeCheck,
  Check,
  Clock,
  Coins,
  Flame,
  Minus,
  MoonStar,
  Play,
  Plus,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  blockMinutes,
  blocksForDay,
  catOf,
  computeOutcome,
  fa,
  faClock,
  faDur,
  fullDateFa,
  greeting,
  hhmmLabel,
  mustahabbDays,
  nowMinutes,
  passesThisMonth,
  quoteOfDay,
  routineChecked,
  routineMinutes,
  routinesForDay,
  shiftKey,
  todayKey,
  weekDayIndex,
  WEEKDAY_FA,
  type AppState,
  type Block,
  type DayTask,
  type Mustahabb,
  type Pen,
  type Routine,
  secToClock,
  taskElapsedSec,
  taskWeightTone,
} from "@/lib/core";
import { AnimatedNumber } from "./animated-number";
import { FocusOverlay } from "./focus-overlay";
import { NightCurtain } from "./night-curtain";
import { NowBar, TomorrowPeek } from "./now-bar";
import { WalletPanel } from "./wallet-panel";
import { Wheel } from "./wheel";

export function TodayTab({
  state,
  chain,
  onToggle,
  onSession,
  onMDelta,
  onRDelta,
  onRToggle,
  onPDelta,
  onPrayer,
  onCloseNight,
  onPass,
  onTaskAdd,
  onTaskPatch,
  onTaskDelete,
  onSpend,
  onDeleteSpend,
}: {
  state: AppState;
  chain: number;
  onToggle: (block: Block, done: boolean, actualMin?: number, day?: string) => void;
  onSession: (blockId: number | null, routineId: number | null, seconds: number) => void;
  onMDelta: (m: Mustahabb, delta: number) => void;
  onRDelta: (r: Routine, deltaMin: number) => void;
  onRToggle: (r: Routine, done: boolean) => void;
  onPDelta: (p: Pen, deltaMin: number) => void;
  onPrayer: (name: string) => void;
  onCloseNight: (sleepAt: number | null, adj?: number) => Promise<void>;
  onPass: (pass: boolean, reason: string) => void;
  onTaskAdd: (p: { title: string; estMin: number; weight: number; billable: boolean }) => Promise<void>;
  onTaskPatch: (id: number, patch: Partial<Pick<DayTask, "title" | "estMin" | "weight" | "billable" | "done">> & { action?: "start" | "stop" }) => Promise<void>;
  onTaskDelete: (id: number) => void;
  onSpend: (amount: number, title: string) => Promise<void>;
  onDeleteSpend: (id: number) => void;
}) {
  const today = todayKey();
  const wd = weekDayIndex(today);
  const outcome = useMemo(() => computeOutcome(today, state), [today, state]);
  const score = outcome.score;

  const todaysBlocks = blocksForDay(state.blocks, wd);
  const mandatory = todaysBlocks.filter((b) => b.counts && catOf(b.cat).counts);
  const optional = todaysBlocks.filter((b) => !(b.counts && catOf(b.cat).counts));

  const todaysMustahabbs = state.mustahabbs
    .filter((m) => m.active && mustahabbDays(m).includes(wd))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const todaysRoutines = useMemo(
    () => routinesForDay(state.routines, wd).filter((r) => r.type !== "sleep"),
    [state.routines, wd],
  );
  const sleepRoutine = state.routines.find((r) => r.type === "sleep" && r.active);
  const activePens = state.pens.filter((p) => p.active);

  const mCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of state.mlogs) if (l.day === today && l.count > 0) m.set(l.mustahabbId, l.count);
    return m;
  }, [state.mlogs, today]);

  const yesterday = shiftKey(today, -1);
  const carried = useMemo(
    () =>
      blocksForDay(state.blocks, weekDayIndex(yesterday)).filter(
        (b) =>
          b.counts &&
          catOf(b.cat).counts &&
          state.checks.some((c) => c.blockId === b.id && c.day === yesterday && c.done === false) &&
          !state.dayMeta.some((m) => m.day === yesterday && m.pass),
      ),
    [state.blocks, state.checks, state.dayMeta, yesterday],
  );

  const [pending, setPending] = useState<Block | null>(null);
  const [focusBlock, setFocusBlock] = useState<Block | null | "free">(null);
  const [nightOpen, setNightOpen] = useState(false);

  // پالت فرمان: «افزودن برنامه» و «پرده‌ی شب» را از راه دور باز می‌کند
  useEffect(() => {
    const openNight = () => setNightOpen(true);
    window.addEventListener("nafs:open-night", openNight);
    return () => window.removeEventListener("nafs:open-night", openNight);
  }, []);

  const prayersDoneCount = state.prayers.filter((p) => p.day === today && p.done).length;
  const musDoneCount = todaysMustahabbs.filter((m) => (mCounts.get(m.id) ?? 0) > 0).length;
  const pct = Math.round(score.ratio * 100);
  const sessionMinToday =
    state.sessions.filter((s) => s.day === today).reduce((n, s) => n + s.seconds, 0) / 60;
  const meta = state.dayMeta.find((m) => m.day === today);

  return (
    <div>
      <header>
        <p className="text-xs font-bold tracking-wide text-stone-500 sm:text-sm">
          {fullDateFa()}
        </p>
        <h1 className="mt-2 text-3xl font-black leading-[1.25] sm:text-4xl lg:text-[40px]">
          {greeting()}
          <span className="text-gradient">، {WEEKDAY_FA[wd]}ست.</span>
        </h1>
        {/* پیشرفت لحظه‌ای روز */}
        <DayProgress />

        {/* نقل‌قول محاسبه‌ی روز */}
        <div className="quote-card mt-4 max-w-lg rounded-2xl px-5 py-4" dir="rtl">
          <span className="quote-glyph">”</span>
          <p className="ps-6 text-[13px] font-semibold italic leading-7 text-stone-300">
            {quoteOfDay().text}
          </p>
          <p className="mt-1 ps-6 text-[10px] font-bold text-stone-600">
            — {quoteOfDay().from}
          </p>
        </div>
      </header>

      {/* همین الان */}
      <NowBar
        state={state}
        onToggle={onToggle}
        onFocus={(b) => setFocusBlock(b)}
        onTonight={() => setNightOpen(true)}
      />
      <TomorrowPeek state={state} />

      <div className="mt-7 grid items-stretch gap-4 xl:grid-cols-[380px_1fr]">
        {/* چرخ روز */}
        <div className="glass glass-sheen relative overflow-hidden rounded-[28px] p-5">
          <p className="text-xs font-black text-stone-400">چرخِ روز</p>
          <div className="mt-2">
            <Wheel
              mode="day"
              size={272}
              blocks={state.blocks}
              checks={state.checks}
              night={state.kv.night}
              showMarks={state.kv.dialMarks}
              theme={state.kv.dialTheme}
              wakeMin={state.kv.wakeTime}
              homeBand={state.kv.homeBand}
            >
              <div>
                <p className="text-2xl font-black tabular-nums">{fa(pct)}٪</p>
                <p className="mt-1 text-[10px] font-bold text-stone-500">پوشش تعهدها</p>
              </div>
            </Wheel>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/8 pt-4 text-center">
            <MiniStat
              label="امتیاز در راه"
              value={
                <>
                  ≈<AnimatedNumber value={outcome.total} />
                </>
              }
              tone="#5EEAD4"
            />
            <MiniStat label="کیف پول" value={<AnimatedNumber value={state.kv.wallet.points} />} tone="#EFD4A0" />
            <MiniStat label="زنجیره" value={`${fa(chain)} روز`} tone="#FBBF24" />
          </div>
          {outcome.bonus > 0 ? (
            <p className="mt-2.5 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-3.5 py-2 text-center text-[11px] font-extrabold text-lime-200">
              بونوس بازگشت +۵ فعال است
            </p>
          ) : null}
          {sessionMinToday > 0 ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-stone-500">
              <Clock className="size-3.5" />
              تمرکز امروز: {faDur(Math.round(sessionMinToday))}
            </p>
          ) : null}
        </div>

        {/* تعهدات */}
        <div className="glass glass-sheen rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-stone-200">تعهدات امروز</h2>
            <span
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                score.pass
                  ? "border border-amber-200/30 bg-amber-300/10 text-amber-200"
                  : score.mandatoryDone === score.mandatoryTotal && score.mandatoryTotal > 0
                    ? "border border-teal-200/30 bg-teal-300/10 text-teal-100"
                    : "bg-white/5 text-stone-500"
              }`}
            >
              {score.pass
                ? "پاس فعال است"
                : `${fa(score.mandatoryDone)} از ${fa(score.mandatoryTotal)} جبری`}
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            <AnimatePresence initial={false}>
              {mandatory.concat(optional).map((b) => (
                <CommitmentRow
                  key={b.id}
                  block={b}
                  missed={state.checks.some((c) => c.blockId === b.id && c.day === today && c.done === false)}
                  actualMin={state.checks.find((c) => c.blockId === b.id && c.day === today)?.actualMin ?? 0}
                  mandatoryCat={b.counts && catOf(b.cat).counts}
                  onMiss={() => onToggle(b, false, 0)}
                  onRestore={() => onToggle(b, true, blockMinutes(b))}
                  onLogTime={() => setPending(b)}
                  onFocus={() => setFocusBlock(b)}
                />
              ))}
            </AnimatePresence>
            {todaysBlocks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs leading-6 text-stone-500">
                برای امروز بلوکی نداری — جمعه‌ها آزادند.
                <br />
                از «تنظیمات» الگوی هفتگی را بچین.
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={() => setFocusBlock("free")}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-extrabold text-stone-300 transition-colors hover:border-teal-200/40 hover:text-teal-200"
            >
              <Timer className="size-4" />
              تمرکز آزاد
            </button>
            <button
              type="button"
              onClick={() => setNightOpen(true)}
              className="ms-auto inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-l from-amber-300/90 to-amber-400/90 px-5 py-2.5 text-xs font-extrabold text-ink-950 shadow-[0_12px_30px_-12px_rgba(251,191,36,0.5)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              <MoonStar className="size-4" />
              پرده‌ی پایان شب
            </button>
          </div>
        </div>
      </div>

      {/* کیف پول امروز: کسب و خرج */}
      <WalletPanel state={state} outcome={outcome} onSpend={onSpend} onDeleteSpend={onDeleteSpend} />

      {/* برنامه‌های روز — مجزا از روتین‌ها: تخمین، وزن، تایمر زنده */}
      <DayTasksCard
        state={state}
        onAdd={onTaskAdd}
        onPatch={onTaskPatch}
        onDelete={onTaskDelete}
      />

      {/* روتین‌ها */}
      <div className="glass mt-4 rounded-[28px] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-stone-200">روتین‌های امروز</h2>
          <span className="text-[11px] font-bold text-stone-500">
            دقیقه‌محور با وزن — {fa(todaysRoutines.reduce((n, r) => n + r.weight, 0))} امتیاز در دسترس
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {todaysRoutines.map((r) =>
            r.type === "check" ? (
              <RoutineCheckRow
                key={r.id}
                routine={r}
                done={routineChecked(r.id, today, state.rlogs)}
                onToggle={onRToggle}
              />
            ) : (
              <RoutineRow
                key={r.id}
                routine={r}
                minutes={routineMinutes(r.id, today, state.rlogs, state.sessions)}
                onDelta={onRDelta}
              />
            ),
          )}
          {sleepRoutine ? (
            <div className="flex items-center gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-300/15 text-violet-200">
                <MoonStar className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-100">{sleepRoutine.title}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
                  هدف: {faClock(sleepRoutine.targetClock)} · ضرایب پلکانی — در «پرده‌ی پایان شب» ثبت می‌شود
                </p>
              </div>
              {meta?.sleepAt != null ? (
                <span className="shrink-0 rounded-full bg-violet-300/15 px-2.5 py-1 text-[10px] font-extrabold text-violet-100 tabular-nums">
                  ثبت شد: {faClock(meta.sleepAt)}
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-bold text-stone-600">هنوز ثبت نشده</span>
              )}
            </div>
          ) : null}
          {todaysRoutines.length === 0 && !sleepRoutine ? (
            <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-stone-500">
              روتینی برای امروز نیست؛ از تنظیمات اضافه کن.
            </p>
          ) : null}
        </div>
      </div>

      {/* جریمه‌ها */}
      {activePens.length > 0 ? (
        <div className="glass mt-4 rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-stone-200">جریمه‌ها</h2>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
              <AlertOctagon className="size-3.5 text-rose-300/80" />
              بیش از هدف ⇒ کسر امتیاز در پرده‌ی شب
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {activePens.map((p) => {
              const used = state.plogs.find((l) => l.penId === p.id && l.day === today)?.minutes ?? 0;
              const over = used > p.targetMin;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
                    over
                      ? "border-rose-300/30 bg-rose-400/[0.06]"
                      : "border-white/8 bg-white/[0.025]"
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-400/12 text-rose-300">
                    <AlertOctagon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-100">{p.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
                      {faDur(used)} از سقف {faDur(p.targetMin)}
                      {over ? <span className="text-rose-300"> · جریمه: −{fa(p.points)}</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="کمتر"
                      onClick={() => onPDelta(p, -15)}
                      disabled={used <= 0}
                      className="grid size-8 cursor-pointer place-items-center rounded-xl border border-white/10 text-stone-400 transition-colors hover:border-white/25 disabled:opacity-30"
                    >
                      <Minus className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPDelta(p, 15)}
                      className="cursor-pointer rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-[11px] font-extrabold text-rose-200 transition-colors hover:bg-rose-400/20"
                    >
                      +۱۵ دقیقه
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* جامانده از دیروز */}
      {carried.length > 0 ? (
        <div className="mt-4 rounded-[26px] border border-rose-300/15 bg-rose-400/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-rose-200">جامانده از دیروز</h2>
            <span className="text-[11px] font-bold text-stone-500">به امروز منتقل شدند</span>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {carried.map((b) => {
              const c = catOf(b.cat);
              const Icon = c.icon;
              return (
                <div key={b.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <Icon className="size-4" style={{ color: c.fg }} />
                  <span className="text-xs font-bold text-stone-200">{b.title || b.cat}</span>
                  <span className="text-[10px] font-semibold text-stone-500">
                    {faClock(b.fromMin)}–{faClock(b.toMin)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(b, true, blockMinutes(b), yesterday)}
                    className="cursor-pointer rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-[10px] font-extrabold text-rose-200 transition-colors hover:bg-rose-400/20"
                  >
                    جبران برای دیروز
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* عبادت‌ها — نماز و مستحبات، تیکی و بدون گیت */}
      <div className="glass mt-4 rounded-[28px] p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-sm font-black text-stone-200">عبادت‌ها</h2>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-extrabold tabular-nums text-stone-500">
            {fa(prayersDoneCount + musDoneCount)} از {fa(state.kv.prayerNames.length + todaysMustahabbs.length)}
          </span>
          <span className="ms-auto text-[11px] font-bold text-stone-500">
            فقط کشش مثبت — نبودنش جریمه ندارد
          </span>
        </div>

        {/* نمازها — سه حالت: نخوانده ← اول وقت ← دیر */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] font-extrabold tracking-wide text-stone-500">نمازهای واجب</p>
          <p className="text-[9.5px] font-bold text-stone-600">
            ضربه‌زدن = چرخه: نخوانده ← اول وقت ← دیر
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {state.kv.prayerNames.map((name) => {
            const p = state.prayers.find((x) => x.day === today && x.name === name);
            const done = p?.done ?? false;
            const onTime = (p?.onTime ?? false) && done;
            const w = state.kv.weights;
            const pts = !done ? 0 : onTime ? w.perPrayer : Math.max(1, Math.round(w.perPrayer / 2));
            return (
              <button
                key={name}
                type="button"
                onClick={() => onPrayer(name)}
                title={!done ? "علامت: اول وقت" : onTime ? "علامت: دیر خوانده شد" : "پاک کن"}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border px-4 py-2.5 text-xs font-extrabold transition-all hover:-translate-y-0.5 ${
                  onTime
                    ? "border-teal-200/50 bg-teal-300/14 text-teal-100 shadow-[0_0_24px_-6px_rgba(94,234,212,0.55)]"
                    : done
                      ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                      : "border-white/10 text-stone-500 hover:border-teal-200/30 hover:text-stone-300"
                }`}
              >
                <span>{name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[8.5px] font-extrabold ${
                    onTime
                      ? "bg-teal-300/20 text-teal-200"
                      : done
                        ? "bg-amber-300/15 text-amber-200"
                        : "bg-white/6 text-stone-600"
                  }`}
                >
                  {!done ? "نخوانده" : onTime ? `اول وقت ✓ +${fa(pts)}` : `دیر +${fa(pts)}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* مستحبات — تیکی */}
        <p className="mt-5 text-[10px] font-extrabold tracking-wide text-stone-500">مستحبات امروز</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {todaysMustahabbs.map((m) => {
            const done = (mCounts.get(m.id) ?? 0) > 0;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onMDelta(m, done ? -1 : 1)}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-extrabold transition-all hover:-translate-y-0.5 ${
                  done
                    ? "border-violet-300/45 bg-violet-300/12 text-violet-100 shadow-[0_0_20px_-6px_rgba(196,181,253,0.45)]"
                    : "border-white/10 text-stone-400 hover:border-violet-300/30 hover:text-stone-200"
                }`}
              >
                <span className={`grid size-5 place-items-center rounded-md border ${done ? "border-violet-300/60 bg-violet-300/20" : "border-white/20"}`}>
                  {done ? <Check className="size-3" /> : null}
                </span>
                {m.title}
                <span className="text-[9px] font-bold opacity-60">+{fa(state.kv.weights.perMustahabb)}</span>
              </button>
            );
          })}
          {todaysMustahabbs.length === 0 ? (
            <p className="py-2 text-xs text-stone-500">مستحبی برای امروز تعریف نشده.</p>
          ) : null}
        </div>

        {(prayersDoneCount === state.kv.prayerNames.length && state.kv.prayerNames.length > 0) ||
        (musDoneCount === todaysMustahabbs.length && todaysMustahabbs.length > 0) ? (
          <p className="mt-4 rounded-2xl border border-teal-200/20 bg-teal-300/[0.07] px-4 py-2.5 text-[11px] font-extrabold leading-6 text-teal-100">
            {prayersDoneCount === state.kv.prayerNames.length && state.kv.prayerNames.length > 0
              ? `نمازها کامل شد — بونوس +${fa(state.kv.weights.allPrayersBonus)}`
              : ""}
            {prayersDoneCount === state.kv.prayerNames.length &&
            musDoneCount === todaysMustahabbs.length &&
            todaysMustahabbs.length > 0
              ? " · "
              : ""}
            {musDoneCount === todaysMustahabbs.length && todaysMustahabbs.length > 0
              ? `مستحبات کامل — بونوس +${fa(state.kv.weights.allMustahabbBonus)}`
              : ""}
          </p>
        ) : null}
      </div>

      {/* لایه‌ها */}
      <AnimatePresence>
        {pending ? (
          <TimeSheet
            key={pending.id}
            block={pending}
            onCancel={() => setPending(null)}
            onSkip={() => {
              onToggle(pending, true, 0);
              setPending(null);
            }}
            onSave={(mins) => {
              onToggle(pending, true, mins);
              setPending(null);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {focusBlock !== null ? (
          <FocusOverlay
            block={focusBlock === "free" ? null : focusBlock}
            routines={state.routines.filter((r) => r.active && r.type === "min")}
            onClose={() => setFocusBlock(null)}
            onSave={(bid, rid, sec) => onSession(bid, rid, sec)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {nightOpen ? (
          <NightCurtain
            outcome={outcome}
            walletPoints={state.kv.wallet.points}
            alreadyClosed={score.closed}
            passesUsed={passesThisMonth(state.dayMeta)}
            passesPerMonth={state.kv.passesPerMonth}
            sleepTarget={sleepRoutine?.targetClock ?? 1290}
            adjCap={state.kv.adjCap}
            onClose={() => setNightOpen(false)}
            onConfirm={onCloseNight}
            onPass={(reason) => onPass(true, reason)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- pieces ---------------------------------- */

/** خط باریک پیشرفت روز — «چقدر از امروز گذشته» */
function DayProgress() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const now = new Date();
  const pct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/6">
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-teal-300/80 to-violet-300/80"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
      </div>
      <span className="shrink-0 text-[10px] font-bold tabular-nums text-stone-600">
        ٪{fa(Math.round(pct))} از امروز گذشته
      </span>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {  return (
    <div>
      <p className="text-sm font-black tabular-nums" style={{ color: tone }}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-stone-500">{label}</p>
    </div>
  );
}

function RoutineCheckRow({
  routine,
  done,
  onToggle,
}: {
  routine: Routine;
  done: boolean;
  onToggle: (r: Routine, done: boolean) => void;
}) {
  return (
    <motion.button
      layout
      type="button"
      onClick={() => onToggle(routine, !done)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-right transition-all hover:-translate-y-[2px] ${
        done
          ? "border-teal-200/30 bg-teal-300/[0.07]"
          : "border-white/8 bg-white/[0.025] hover:border-white/16"
      }`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-all ${
          done
            ? "border-teal-200/50 bg-teal-300/20 text-teal-200"
            : "border-white/15 text-stone-600"
        }`}
      >
        {done ? <Check className="size-5" /> : <Square className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold ${done ? "text-stone-200" : "text-stone-100"}`}>
          {routine.title}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          روتین تیکی{done ? " · انجام شد" : " — یک ضربه کافی است"}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold tabular-nums ${
          done ? "bg-teal-300/15 text-teal-200" : "bg-white/6 text-stone-500"
        }`}
      >
        +{fa(routine.weight)}
      </span>
    </motion.button>
  );
}

function RoutineRow({
  routine,
  minutes,
  onDelta,
}: {
  routine: Routine;
  minutes: number;
  onDelta: (r: Routine, deltaMin: number) => void;
}) {
  const pctW = Math.min(100, routine.targetMin > 0 ? (minutes / routine.targetMin) * 100 : 0);
  const done = minutes >= routine.targetMin && routine.targetMin > 0;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-3.5 transition-colors ${
        done ? "border-teal-200/25 bg-teal-300/[0.05]" : "border-white/8 bg-white/[0.025]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${done ? "bg-teal-300/15 text-teal-200" : "bg-white/6 text-stone-400"}`}>
          {done ? <BadgeCheck className="size-4.5" /> : <Flame className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-stone-100">{routine.title}</p>
            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[9px] font-extrabold text-stone-400 tabular-nums">
              +{fa(routine.weight)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-stone-500 tabular-nums">
            {faDur(minutes)} از {faDur(routine.targetMin)}
            {done ? " · تکمیل شد" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="کمتر"
            onClick={() => onDelta(routine, -15)}
            disabled={minutes <= 0}
            className="grid size-8 cursor-pointer place-items-center rounded-xl border border-white/10 text-stone-400 transition-colors hover:border-white/25 disabled:opacity-30"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelta(routine, 15)}
            className="cursor-pointer rounded-xl bg-gradient-to-br from-teal-300/90 to-violet-300/90 px-3 py-2 text-[11px] font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95"
          >
            +۱۵ دقیقه
          </button>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/7">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-teal-300 to-violet-300"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, pctW)}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />
      </div>
    </motion.div>
  );
}

function CommitmentRow({
  block,
  missed,
  actualMin,
  mandatoryCat,
  onMiss,
  onRestore,
  onLogTime,
  onFocus,
}: {
  block: Block;
  /** جا ریخت = استثنای صریح (done=false) */
  missed: boolean;
  actualMin: number;
  mandatoryCat: boolean;
  onMiss: () => void;
  onRestore: () => void;
  onLogTime: () => void;
  onFocus: () => void;
}) {
  const c = catOf(block.cat);
  const Icon = c.icon;
  const now = nowMinutes();
  const mins = blockMinutes(block);
  const end = (block.fromMin + mins) % 1440;
  const isLive = !missed && now >= block.fromMin && now < block.fromMin + mins;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className={`relative flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-[2px] ${
        missed
          ? "border-rose-300/30 bg-rose-400/[0.07]"
          : isLive
            ? "border-teal-200/30 bg-teal-300/[0.05] shadow-[0_0_30px_-14px_rgba(94,234,212,0.5)]"
            : "border-teal-200/10 bg-white/[0.025] hover:border-white/16"
      }`}
    >
      <span aria-hidden className="absolute inset-y-3 right-0 w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, ${missed ? "#FB7185" : c.fg}, transparent)` }} />
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/8" style={{ background: `${c.fg}1f`, color: c.fg }}>
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-bold ${missed ? "text-rose-200 line-through" : "text-stone-100"}`}>
            {block.title || block.cat}
          </p>
          {!missed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-300/10 px-2 py-0.5 text-[9px] font-extrabold text-teal-200">
              <BadgeCheck className="size-3" />
              خودکار ✓
            </span>
          ) : (
            <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[9px] font-extrabold text-rose-200">
              امروز جا ریخت
            </span>
          )}
          {mandatoryCat ? null : (
            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[9px] font-extrabold text-stone-500">اختیاری</span>
          )}
          {isLive ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-teal-300" />
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] font-semibold text-stone-500">
          {faClock(block.fromMin)} تا {faClock(end)} · {faDur(mins)}
          {actualMin > 0 ? <span className="text-teal-200/80"> · زمان‌نگاشت: {faDur(actualMin)}</span> : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!missed ? (
          <>
            <button
              type="button"
              onClick={onLogTime}
              aria-label="زمان‌نگاشت (اختیاری)"
              title="ثبت زمان واقعی برای کالیبراسیون"
              className="grid size-9 cursor-pointer place-items-center rounded-xl border border-white/10 text-stone-500 transition-all hover:border-sky-200/40 hover:text-sky-200"
            >
              <Clock className="size-4" />
            </button>
            <button
              type="button"
              onClick={onFocus}
              aria-label="شروع تمرکز"
              title="شروع تمرکز (کرنومتر)"
              className="grid size-9 cursor-pointer place-items-center rounded-xl border border-white/10 text-stone-400 transition-all hover:border-teal-200/40 hover:text-teal-200"
            >
              <Timer className="size-4" />
            </button>
            <button
              type="button"
              onClick={onMiss}
              aria-label="جا ریخت"
              title="امروز انجام نشد (استثنا)"
              className="cursor-pointer rounded-xl border border-rose-300/25 bg-rose-400/[0.06] px-3 py-2 text-[11px] font-extrabold text-rose-300/90 transition-colors hover:border-rose-300/50 hover:bg-rose-400/15"
            >
              جا ریخت
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-teal-200/30 bg-teal-300/10 px-3 py-2 text-[11px] font-extrabold text-teal-100 transition-colors hover:bg-teal-300/20"
          >
            <BadgeCheck className="size-4" />
            برگردان به انجام‌شده
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------- برنامه‌های روز (کارت) ---------------------------- */

function DayTasksCard({
  state,
  onAdd,
  onPatch,
  onDelete,
}: {
  state: AppState;
  onAdd: (p: { title: string; estMin: number; weight: number; billable: boolean }) => Promise<void>;
  onPatch: (id: number, patch: Partial<Pick<DayTask, "title" | "estMin" | "weight" | "billable" | "done">> & { action?: "start" | "stop" }) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const today = todayKey();
  const tasks = state.daytasks
    .filter((t) => t.day === today)
    .sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  const estTotal = tasks.reduce((n, t) => n + t.estMin, 0);
  const donePts = tasks.filter((t) => t.done && t.billable).reduce((n, t) => n + t.weight, 0);
  const capReached = tasks.length >= state.kv.maxTasks;
  const wd0 = weekDayIndex(today);
  const planGoal = state.kv.baseMinByDay?.[wd0] ?? state.kv.planTarget;

  const [title, setTitle] = useState("");
  const [est, setEst] = useState(30);
  const [weight, setWeight] = useState(5);
  const [busy, setBusy] = useState(false);

  // پالت فرمان: فوکوس روی ورودی کار
  useEffect(() => {
    const h = () => {
      const el = document.getElementById("daytask-title") as HTMLInputElement | null;
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("nafs:focus-add-task", h);
    return () => window.removeEventListener("nafs:focus-add-task", h);
  }, []);

  // پیشنهاد خودکار تخمین از میانگینِ واقعیِ هم‌نام‌ها در تاریخچه
  const suggestion = useMemo(() => {
    const q = title.trim();
    if (q.length < 3) return null;
    const matches = state.daytasks.filter(
      (t) => t.title.trim() === q && t.elapsedSec > 0,
    );
    if (matches.length === 0) return null;
    const avg = Math.round(
      matches.reduce((n, t) => n + t.elapsedSec, 0) / matches.length / 60,
    );
    return avg >= 5 && avg !== est ? { minutes: avg, n: matches.length } : null;
  }, [title, state.daytasks, est]);

  async function add() {
    const t = title.trim();
    if (!t || busy || capReached) return;
    setBusy(true);
    try {
      await onAdd({ title: t, estMin: est, weight, billable: true });
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass mt-4 rounded-[28px] p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-sm font-black text-stone-200">برنامه‌های روز</h2>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-extrabold text-stone-500 tabular-nums">
          {fa(tasks.length)}/{fa(state.kv.maxTasks)} کار
        </span>
        <span className="ms-auto text-[11px] font-bold text-stone-500">
          جمع تخمین: <span className="text-stone-300">{faDur(estTotal)}</span>
          {planGoal > 0 ? ` · هدف روز: ${faDur(planGoal)}` : ""}
          {planGoal > 0 && estTotal > planGoal ? (
            <span className="text-amber-300"> (بیش از هدف!)</span>
          ) : null}
          {donePts > 0 ? ` · +${fa(donePts)} امتیاز گرفته‌شده` : ""}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <DayTaskRow key={t.id} task={t} onPatch={onPatch} onDelete={onDelete} />
          ))}
        </AnimatePresence>
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs leading-6 text-stone-500">
            کارهای خاص امروز را اینجا بنویس و وزن بده — از روتین‌ها جداست.
            <br />
            هر کار تخمین دقیقه دارد و تایمر زنده: «ادامه/توقف» تا «پایان و تیک».
          </p>
        ) : null}
      </div>

      {/* افزودن سریع */}
      <form
        className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/12 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          id="daytask-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={capReached ? "به سقف روز رسیدی (maxTasks)" : "کار امروز…"}
          disabled={capReached}
          className="w-44 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600 disabled:opacity-40"
        />
        {suggestion ? (
          <button
            type="button"
            onClick={() => setEst(suggestion.minutes)}
            className="cursor-pointer rounded-xl border border-sky-300/30 bg-sky-300/10 px-2.5 py-1.5 text-[10px] font-extrabold text-sky-200 transition-colors hover:bg-sky-300/20"
            title="میانگین زمان واقعی همین کار در روزهای قبل"
          >
            میانگین قبلی: {faDur(suggestion.minutes)} — اعمال
          </button>
        ) : null}
        <MiniStepper label="تخمین" value={est} min={5} max={720} step={15} suffix="د" onChange={setEst} />
        <MiniStepper label="وزن" value={weight} min={1} max={10} step={1} onChange={setWeight} />
        <button
          type="submit"
          disabled={!title.trim() || busy || capReached}
          className="ms-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-l from-teal-300 to-violet-300 px-4 py-2 text-xs font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          افزودن کار
        </button>
      </form>
    </div>
  );
}

function MiniStepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">
      <span className="text-[9px] font-bold text-stone-500">{label}</span>
      <button
        type="button"
        aria-label={`${label} کمتر`}
        onClick={() => onChange(Math.max(min, value - step))}
        className="grid size-6 cursor-pointer place-items-center rounded-md text-stone-400 hover:bg-white/8 hover:text-stone-200"
      >
        <Minus className="size-3" />
      </button>
      <span className="min-w-10 text-center text-xs font-black tabular-nums text-stone-100">
        {fa(value)}{suffix}
      </span>
      <button
        type="button"
        aria-label={`${label} بیشتر`}
        onClick={() => onChange(Math.min(max, value + step))}
        className="grid size-6 cursor-pointer place-items-center rounded-md text-stone-300 hover:bg-white/8 hover:text-teal-200"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

/** ساعت زنده روی ردیف کار — تایمر سمت سرور ماندگار است */
function LiveTaskClock({ task }: { task: DayTask }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!task.startedAt) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [task.startedAt]);
  return (
    <span className="font-sans text-sm font-black tabular-nums text-teal-200" dir="ltr">
      {secToClock(taskElapsedSec(task))}
    </span>
  );
}

function DayTaskRow({
  task,
  onPatch,
  onDelete,
}: {
  task: DayTask;
  onPatch: (id: number, patch: Partial<Pick<DayTask, "title" | "estMin" | "weight" | "billable" | "done">> & { action?: "start" | "stop" }) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const tone = taskWeightTone(task.weight);
  const measured = taskElapsedSec(task);
  const estSec = Math.max(1, task.estMin * 60);
  const ratio = Math.min(1.4, measured / estSec);
  const running = task.startedAt !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className={`rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-[2px] ${
        task.done
          ? "border-teal-200/25 bg-teal-300/[0.05]"
          : running
            ? "border-teal-200/30 bg-teal-300/[0.04] shadow-[0_0_28px_-12px_rgba(94,234,212,0.5)]"
            : "border-white/8 bg-white/[0.025] hover:border-white/16"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* تایمر */}
        {!task.done ? (
          <button
            type="button"
            onClick={() => void onPatch(task.id, { action: running ? "stop" : "start" })}
            aria-label={running ? "توقف" : "ادامه"}
            title={running ? "توقف" : "شروع تایمر"}
            className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl transition-all hover:scale-105 active:scale-95 ${
              running
                ? "bg-amber-300/20 text-amber-200 ring-1 ring-amber-200/40"
                : "bg-gradient-to-br from-teal-300/25 to-violet-300/25 text-teal-100"
            }`}
          >
            {running ? <Square className="size-4" /> : <Play className="size-4" />}
          </button>
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-300/15 text-teal-200">
            <Check className="size-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editingTitle ? (
              <input
                autoFocus
                defaultValue={task.title}
                aria-label="ویرایش عنوان کار"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== task.title) void onPatch(task.id, { title: v });
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="min-w-0 max-w-60 flex-1 rounded-xl border border-teal-200/40 bg-ink-950/80 px-2.5 py-1.5 text-sm font-bold text-stone-100 outline-none"
              />
            ) : (
              <p
                className={`cursor-text truncate text-sm font-bold ${task.done ? "text-stone-400 line-through" : "text-stone-100"}`}
                title="برای ویرایش دابل‌کلیک کن"
                onDoubleClick={() => setEditingTitle(true)}
              >
                {task.title}
              </p>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-extrabold tabular-nums"
              style={{ color: tone.color, background: `${tone.color}1a` }}
              title={`${tone.label} — وزن از ۱۰`}
            >
              وزن {fa(task.weight)}/۱۰
            </span>
            {!task.billable ? (
              <span className="rounded-full bg-white/6 px-2 py-0.5 text-[9px] font-extrabold text-stone-500">
                بدون امتیاز
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-stone-500">
            <span>تخمین {fa(task.estMin)} د</span>
            {measured > 0 ? (
              <>
                <span className="text-stone-700">·</span>
                <LiveTaskClock task={task} />
                {measured > estSec ? <span className="text-amber-300">بیش از تخمین</span> : null}
              </>
            ) : task.done ? null : (
              <span className="text-stone-600">هنوز چیزی اندازه نگرفته</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void onPatch(task.id, { billable: !task.billable })}
            aria-label="اثر در امتیاز"
            title={task.billable ? "در امتیاز حساب می‌شود" : "اثر ندارد"}
            className={`grid size-8 cursor-pointer place-items-center rounded-xl border text-[10px] font-black transition-colors ${
              task.billable
                ? "border-violet-300/35 bg-violet-300/10 text-violet-200"
                : "border-white/10 text-stone-600"
            }`}
          >
            ⚡
          </button>
          {!task.done ? (
            <button
              type="button"
              onClick={() => void onPatch(task.id, { done: true })}
              className="cursor-pointer rounded-xl bg-gradient-to-l from-teal-300 to-violet-300 px-3.5 py-2 text-[11px] font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95"
            >
              پایان و تیک
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onPatch(task.id, { done: false })}
              className="cursor-pointer rounded-xl border border-teal-200/25 bg-teal-300/10 px-3 py-2 text-[11px] font-extrabold text-teal-100"
            >
              برگردان
            </button>
          )}
          <button
            type="button"
            aria-label="حذف کار"
            onClick={() => (confirm ? onDelete(task.id) : (setConfirm(true), setTimeout(() => setConfirm(false), 3000)))}
            className={`grid h-8 cursor-pointer place-items-center rounded-xl transition-all ${
              confirm ? "w-auto bg-rose-400/20 px-2.5 text-[10px] font-extrabold text-rose-200" : "w-8 text-stone-500 hover:bg-rose-400/10 hover:text-rose-300"
            }`}
          >
            {confirm ? "؟" : <Trash2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* نوار اندازه‌گیری‌شده در برابر تخمین */}
      {measured > 0 || running ? (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/7">
            <motion.div
              className="absolute inset-y-0 right-0 rounded-full"
              style={{
                background: ratio > 1 ? "#FBBF24" : "linear-gradient(90deg,#5EEAD4,#8B7CF6)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ratio * 100)}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 18 }}
            />
            {/* نشانگر تخمین روی ۱۰۰٪ */}
            <span className="absolute inset-y-0 left-0 w-px bg-white/20" />
          </div>
          <span className="shrink-0 text-[9px] font-bold tabular-nums text-stone-600">
            {fa(Math.round(ratio * 100))}٪
          </span>
        </div>
      ) : null}
    </motion.div>
  );
}

function TimeSheet({
  block,
  onCancel,
  onSkip,
  onSave,
}: {
  block: Block;
  onCancel: () => void;
  onSkip: () => void;
  onSave: (minutes: number) => void;
}) {
  const [from, setFrom] = useState(hhmmLabel(block.fromMin));
  const [to, setTo] = useState(hhmmLabel(block.toMin));

  function save() {
    const f = from.match(/^(\d{2}):(\d{2})$/);
    const t = to.match(/^(\d{2}):(\d{2})$/);
    if (!f || !t) return onSkip();
    const fm = +f[1] * 60 + +f[2];
    const tm = +t[1] * 60 + +t[2];
    const diff = tm > fm ? tm - fm : 1440 + tm - fm;
    onSave(Math.max(0, Math.min(720, diff)));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 90, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong w-full max-w-md rounded-t-[28px] p-6 pb-8 sm:rounded-[28px] sm:pb-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <h3 className="text-sm font-black text-stone-100">«{block.title || block.cat}» انجام شد — چقدر طول کشید؟</h3>
        <p className="mt-1.5 text-[11px] leading-5 text-stone-500">
          این عدد برای کالیبراسیون تخمین و دفتر زمان است.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-stone-500">از</span>
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/4 px-3.5 py-3 text-center font-sans text-lg font-bold text-stone-100 outline-none focus:border-teal-200/40" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-stone-500">تا</span>
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/4 px-3.5 py-3 text-center font-sans text-lg font-bold text-stone-100 outline-none focus:border-teal-200/40" />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onSkip} className="cursor-pointer rounded-2xl border border-white/12 px-4 py-3 text-xs font-bold text-stone-400 transition-colors hover:border-white/25">
            بدون زمان
          </button>
          <button type="button" onClick={save} className="flex-1 cursor-pointer rounded-2xl bg-gradient-to-l from-teal-300 to-violet-300 px-5 py-3 text-sm font-extrabold text-ink-950 transition-transform hover:scale-[1.02] active:scale-95">
            ثبت زمان واقعی
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
