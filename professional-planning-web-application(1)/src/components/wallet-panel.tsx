"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Coins, Plus, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  dayPoints,
  fa,
  shiftKey,
  todayKey,
  weekStartKey,
  type AppState,
  type DayOutcome,
} from "@/lib/core";
import { AnimatedNumber } from "./animated-number";

/** پنل کیف پول امروز: چقدر تا الان پاداش گرفته‌ام · چقدر خرج کرده‌ام */
export function WalletPanel({
  state,
  outcome,
  onSpend,
  onDeleteSpend,
}: {
  state: AppState;
  outcome: DayOutcome;
  onSpend: (amount: number, title: string) => Promise<void>;
  onDeleteSpend: (id: number) => void;
}) {
  const today = todayKey();
  const meta = state.dayMeta.find((m) => m.day === today);
  const closed = meta?.closed ?? false;

  const todaySpends = state.spends.filter((s) => s.day === today);
  const spentToday = todaySpends.reduce((n, s) => n + s.amount, 0);
  const earnedToday = closed ? meta!.pointsBanked : outcome.total;

  const weekStats = useMemo(() => {
    const start = weekStartKey(today);
    const keys = Array.from({ length: 7 }, (_, i) => shiftKey(start, i));
    const earned = keys.reduce((n, k) => n + dayPoints(k, state), 0);
    const spent = state.spends
      .filter((s) => keys.includes(s.day))
      .reduce((n, s) => n + s.amount, 0);
    return { earned, spent };
  }, [state, today]);

  const balance = state.kv.wallet.points;
  const dayCapLeft = Math.max(0, state.kv.economy.dayUseCap - spentToday);
  const capPct = Math.min(100, Math.round((earnedToday / Math.max(1, outcome.cap)) * 100));

  // روند ۷ روز: کسب و خرج روزانه
  const trend = useMemo(() => {
    const out: { day: string; earned: number; spent: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const k = shiftKey(today, -i);
      out.push({
        day: k,
        earned: dayPoints(k, state),
        spent: state.spends.filter((s) => s.day === k).reduce((n, s) => n + s.amount, 0),
      });
    }
    return out;
  }, [state, today]);

  const maxTrend = Math.max(...trend.map((t) => Math.max(t.earned, t.spent)), 10);
  const saveRate =
    weekStats.earned > 0
      ? Math.round(((weekStats.earned - weekStats.spent) / weekStats.earned) * 100)
      : 0;
  const capPctWallet = Math.min(
    100,
    Math.round((Math.max(0, balance) / Math.max(1, state.kv.economy.walletCap)) * 100),
  );
  const health =
    balance < 0
      ? { label: "بدهکار", color: "#FB7185", msg: "اول چند روز کسب کن تا تراز مثبت شود." }
      : saveRate >= 50
        ? { label: "عالی", color: "#5EEAD4", msg: "پس‌انداز قوی — ژتون‌های بزرگ در دسترس‌اند." }
        : saveRate >= 20
          ? { label: "متعادل", color: "#7DD3FC", msg: "تعادل خوبی بین کسب و خرج داری." }
          : { label: "پرخرج", color: "#FBBF24", msg: "این هفته بیشتر خرج کردی تا پس‌انداز." };

  const [amount, setAmount] = useState(10);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const QUICK = [
    { label: "قهوه/خوراکی", v: 10 },
    { label: "فیلم", v: 20 },
    { label: "بازی", v: 25 },
    { label: "بیرون رفتن", v: 40 },
  ];

  async function submit(v: number, t: string) {
    if (busy || v <= 0) return;
    setBusy(true);
    setErr(null);
    try {
      await onSpend(v, t.trim() || "خرج دلخواه");
      setTitle("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ثبت نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass glass-sheen mt-4 overflow-hidden rounded-[28px] p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl border border-amber-200/20 bg-amber-300/10 text-amber-200">
          <Wallet className="size-4.5" />
        </span>
        <h2 className="text-sm font-black text-stone-200">کیف پول امروز</h2>
        <span className="ms-auto text-[11px] font-bold text-stone-500">
          موجودی:{" "}
          <span className={`font-black tabular-nums ${balance < 0 ? "text-rose-300" : "text-amber-200"}`}>
            <AnimatedNumber value={balance} />
          </span>
          {balance < 0 ? " (بدهی)" : ""}
        </span>
      </div>

      {/* سه ستون: کسب / خرج / خالص */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat
          icon={<ArrowUpRight className="size-4" />}
          label={closed ? "واریزشده امروز" : "کسب‌شده تا الان"}
          value={earnedToday}
          tone="#5EEAD4"
          hint={closed ? "روز بسته شد" : `از سقف ${fa(outcome.cap)}`}
        />
        <Stat
          icon={<ArrowDownLeft className="size-4" />}
          label="خرج امروز"
          value={spentToday}
          tone="#FB7185"
          hint={`${fa(dayCapLeft)} باقی از سقف`}
        />
        <Stat
          icon={<Coins className="size-4" />}
          label="خالص امروز"
          value={earnedToday - spentToday}
          tone={earnedToday - spentToday >= 0 ? "#EFD4A0" : "#FB7185"}
          hint={`هفته: ${fa(weekStats.earned)} / ${fa(weekStats.spent)}`}
        />
      </div>

      {/* نوار پیشرفت کسب نسبت به سقف روز */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-bold text-stone-500">
          <span>پیشرفت کسب امروز</span>
          <span className="tabular-nums">٪{fa(capPct)}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/7">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-teal-300 via-violet-300 to-amber-300"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, capPct)}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          />
        </div>
      </div>

      {/* سلامت مالی و روند هفته */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-stone-500">روند ۷ روز (کسب / خرج)</span>
            <span className="text-[9px] font-bold text-stone-600">
              ستون روشن = کسب · تیره = خرج
            </span>
          </div>
          <div className="mt-2.5 flex items-end justify-between gap-1" style={{ height: 52 }} dir="ltr">
            {trend.map((t) => (
              <div key={t.day} className="flex flex-1 items-end justify-center gap-[2px]">
                <motion.span
                  className="w-1.5 rounded-sm bg-gradient-to-t from-teal-400/40 to-teal-300"
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(2, (t.earned / maxTrend) * 48) }}
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                />
                <motion.span
                  className="w-1.5 rounded-sm bg-gradient-to-t from-rose-500/40 to-rose-400/80"
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(2, (t.spent / maxTrend) * 48) }}
                  transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.04 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-3.5 text-center sm:w-44" style={{ borderColor: `${health.color}33`, background: `${health.color}0f` }}>
          <p className="text-[10px] font-extrabold text-stone-500">سلامت مالی هفته</p>
          <p className="mt-1 text-lg font-black" style={{ color: health.color }}>
            {health.label}
          </p>
          <p className="mt-0.5 text-[11px] font-black tabular-nums text-stone-300">
            پس‌انداز ٪{fa(Math.max(0, saveRate))}
          </p>
          <p className="mt-1.5 text-[9.5px] leading-5 text-stone-500">{health.msg}</p>
        </div>
      </div>

      {/* پرشدگی کیف پول نسبت به سقف */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-bold text-stone-500">
          <span>ظرفیت کیف پول</span>
          <span className="tabular-nums">
            {fa(Math.max(0, balance))} از {fa(state.kv.economy.walletCap)}
            {capPctWallet >= 95 ? " — نزدیک سقف، خرج کن!" : ""}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/7">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: capPctWallet >= 95 ? "linear-gradient(90deg,#FBBF24,#FB7185)" : "linear-gradient(90deg,#8B7CF6,#EFD4A0)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, capPctWallet)}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          />
        </div>
      </div>

      {/* ثبت خرج */}
      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
        <p className="text-[11px] font-extrabold text-stone-400">ثبت خرج پاداش</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={busy || q.v > dayCapLeft}
              onClick={() => void submit(q.v, q.label)}
              className="cursor-pointer rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-extrabold text-stone-300 transition-colors hover:border-rose-300/40 hover:text-rose-200 disabled:opacity-30"
            >
              {q.label} <span className="tabular-nums opacity-70">−{fa(q.v)}</span>
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(amount, title);
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="بابت چه چیزی؟"
            className="w-36 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
          />
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">
            <button
              type="button"
              aria-label="کمتر"
              onClick={() => setAmount((v) => Math.max(1, v - 5))}
              className="grid size-6 cursor-pointer place-items-center rounded-md text-stone-400 hover:bg-white/8"
            >
              −
            </button>
            <span className="min-w-10 text-center text-sm font-black tabular-nums text-stone-100">
              {fa(amount)}
            </span>
            <button
              type="button"
              aria-label="بیشتر"
              onClick={() => setAmount((v) => Math.min(500, v + 5))}
              className="grid size-6 cursor-pointer place-items-center rounded-md text-stone-300 hover:bg-white/8 hover:text-amber-200"
            >
              +
            </button>
          </div>
          <button
            type="submit"
            disabled={busy || amount > dayCapLeft}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-l from-amber-300 to-rose-300 px-4 py-2 text-xs font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            <Plus className="size-3.5" />
            ثبت خرج
          </button>
        </form>
        {err ? <p className="mt-2 text-[11px] font-bold text-rose-300">{err}</p> : null}
        {amount > dayCapLeft ? (
          <p className="mt-2 text-[11px] font-bold text-amber-300">
            بیش از سقف باقی‌مانده‌ی امروز ({fa(dayCapLeft)}) است.
          </p>
        ) : null}
      </div>

      {/* دفتر خرج امروز */}
      {todaySpends.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-extrabold tracking-wide text-stone-500">دفتر خرج امروز</p>
          <AnimatePresence initial={false}>
            {todaySpends.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="group flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] px-3.5 py-2"
              >
                <ArrowDownLeft className="size-3.5 shrink-0 text-rose-300/80" />
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-stone-300">
                  {s.title}
                  {s.kind === "token" ? (
                    <span className="ms-2 rounded-full bg-amber-300/15 px-2 py-0.5 text-[9px] font-extrabold text-amber-200">
                      ژتون
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-black tabular-nums text-rose-300">
                  −{fa(s.amount)}
                </span>
                <button
                  type="button"
                  aria-label="حذف خرج"
                  onClick={() => onDeleteSpend(s.id)}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-stone-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-400/10 hover:text-rose-300"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-center">
      <span className="mx-auto grid size-8 place-items-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {icon}
      </span>
      <p className="mt-2 text-xl font-black tabular-nums" style={{ color: tone }}>
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-0.5 text-[10px] font-bold text-stone-400">{label}</p>
      <p className="mt-0.5 text-[9px] font-bold text-stone-600">{hint}</p>
    </div>
  );
}
