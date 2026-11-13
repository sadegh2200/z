"use client";

import { motion } from "framer-motion";
import { BedDouble, Coins, Flag, Loader2, MoonStar, X } from "lucide-react";
import { useState } from "react";
import { fa, faClock, faDur, type DayOutcome } from "@/lib/core";
import { fireConfetti } from "@/lib/confetti";

/**
 * پرده‌ی پایان شب — خط تولید کامل پاداش:
 * پایه × ضریب بار + افزوده‌ی عبادی + خواب به‌موقع + بونوس بازگشت − جریمه‌ها
 * سپس واریز معتبر توسط سرور.
 */
export function NightCurtain({
  outcome,
  walletPoints,
  alreadyClosed,
  passesUsed,
  passesPerMonth,
  sleepTarget,
  adjCap,
  onClose,
  onConfirm,
  onPass,
}: {
  outcome: DayOutcome;
  walletPoints: number;
  alreadyClosed: boolean;
  passesUsed: number;
  passesPerMonth: number;
  /** ساعت هدف خواب (دقیقه از نیمه‌شب) */
  sleepTarget: number;
  /** سقف تعدیل دستی (±) */
  adjCap: number;
  onClose: () => void;
  onConfirm: (sleepAt: number | null, adj: number) => Promise<void>;
  onPass: (reason: string) => void;
}) {
  const [passMode, setPassMode] = useState(false);
  const [reason, setReason] = useState("");
  const [sleepAt, setSleepAt] = useState<number | null>(sleepTarget);
  const [adj, setAdj] = useState(0); // تعدیل دستی (±adjCap)
  const [busy, setBusy] = useState(false);

  const o = outcome;
  const passesLeft = Math.max(0, passesPerMonth - passesUsed);
  const sleepChoices = [sleepTarget, sleepTarget + 30, sleepTarget + 60].filter((x) => x < 1440);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      fireConfetti();
      await onConfirm(sleepAt, adj);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="پرده‌ی پایان شب"
        className="glass-strong glow-conic w-full max-w-md overflow-hidden rounded-[28px] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        <div className="relative border-b border-white/8 bg-gradient-to-b from-violet-300/10 to-transparent px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="absolute left-4 top-4 grid size-9 cursor-pointer place-items-center rounded-xl text-stone-500 transition-colors hover:bg-white/8 hover:text-stone-200"
          >
            <X className="size-4.5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-amber-200">
              <MoonStar className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-black">پرده‌ی پایان شب</h3>
              <p className="mt-0.5 text-[11px] text-stone-500">
                روز را صادقانه ببند، پاداشش را بگیر
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-6">
          {alreadyClosed ? (
            <div className="py-6 text-center">
              <Coins className="mx-auto size-10 text-amber-300" />
              <p className="mt-4 text-sm font-extrabold text-stone-200">امروز بسته شده است.</p>
              <p className="mt-2 text-xs leading-6 text-stone-500">
                {fa(outcome.score.pointsBanked)} امتیاز به کیف پول رفت. منتظر فردا باش!
              </p>
            </div>
          ) : passMode ? (
            <div>
              <p className="text-xs font-bold leading-6 text-stone-400">
                دلیل پاس را بنویس — زنجیره حفظ می‌شود اما امتیازی واریز نمی‌شود. سهمیه‌ی این ماه:{" "}
                {fa(passesLeft)} پاس مانده.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus
                placeholder="مثلاً: مهمان غافلگیرکننده، مریضی…"
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-amber-200/40"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPassMode(false)}
                  className="cursor-pointer rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-bold text-stone-400"
                >
                  برگرد
                </button>
                <button
                  type="button"
                  disabled={!reason.trim() || passesLeft <= 0}
                  onClick={() => {
                    onPass(reason.trim());
                    onClose();
                  }}
                  className="ms-auto cursor-pointer rounded-2xl bg-gradient-to-l from-amber-300 to-amber-400 px-5 py-2.5 text-xs font-extrabold text-ink-950 disabled:opacity-40"
                >
                  <Flag className="ms-auto inline size-3.5" /> ثبت پاس
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* خط تولید پاداش v3 — شفاف و حسابرسی‌پذیر */}
              <div className="space-y-1.5">
                {o.lines.map((l) => (
                  <Line
                    key={l.key}
                    label={l.label}
                    value={l.value}
                    minus={l.kind === "minus"}
                    plus={l.kind === "plus" && l.value > 0}
                  />
                ))}
                {adj !== 0 ? <Line label="تعدیل دستی" value={adj} plus={adj > 0} minus={adj < 0} /> : null}
                {o.floorApplied ? (
                  <p className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-3.5 py-2.5 text-[11px] font-bold leading-6 text-sky-200">
                    کف امتیاز روز اعمال شد — تلاش تو صفر نمی‌شود.
                  </p>
                ) : null}
                {o.score.missed === 0 && o.score.mandatoryTotal > 0 ? (
                  <p className="rounded-xl border border-teal-200/25 bg-teal-300/10 px-3.5 py-2.5 text-[11px] font-bold leading-6 text-teal-100">
                    روز بدون جا ریخت — تعهدات کامل ماندند.
                  </p>
                ) : null}
                <div className="mt-1 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                  <span className="text-xs font-black text-stone-300">جمع پیش از سقف</span>
                  <span className="text-sm font-black tabular-nums text-stone-100">{fa(o.total)}</span>
                </div>
              </div>

              {/* ساعت خواب */}
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
                <p className="flex items-center gap-2 text-[11px] font-extrabold text-stone-400">
                  <BedDouble className="size-4 text-violet-200" />
                  امشب چه زمانی می‌خوابی؟ (هدف: {faClock(sleepTarget)})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {sleepChoices.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSleepAt(t)}
                      className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold tabular-nums transition-all ${
                        sleepAt === t
                          ? "border-violet-300/50 bg-violet-300/15 text-violet-100"
                          : "border-white/10 text-stone-500 hover:border-white/25"
                      }`}
                    >
                      {faClock(t)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSleepAt(null)}
                    className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                      sleepAt === null
                        ? "border-white/30 bg-white/10 text-stone-200"
                        : "border-white/10 text-stone-500 hover:border-white/25"
                    }`}
                  >
                    بدون ثبت
                  </button>
                </div>
              </div>

              {/* تعدیل دستی — adjCap */}
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between text-[11px] font-extrabold">
                  <span className="text-stone-400">تعدیل دستی (گرفتگی/پشتکار ویژه)</span>
                  <span className="tabular-nums text-stone-200">
                    {adj === 0 ? "۰" : adj > 0 ? `+${fa(adj)}` : `−${fa(-adj)}`}
                  </span>
                </div>
                <input
                  type="range"
                  dir="ltr"
                  min={-adjCap}
                  max={adjCap}
                  step={1}
                  value={adj}
                  onChange={(e) => setAdj(Number(e.target.value))}
                  aria-label="تعدیل دستی"
                  className="mt-2.5 w-full accent-teal-300"
                />
                <div className="flex justify-between text-[9px] font-bold text-stone-600">
                  <span>−{fa(adjCap)}</span>
                  <span>۰</span>
                  <span>+{fa(adjCap)}</span>
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] font-bold tracking-[0.2em] text-stone-500">
                پاداش امروز <span className="text-stone-600">(سقف: {fa(o.cap)})</span>
              </p>
              <p className="mt-2 text-center text-6xl font-black tabular-nums">
                <span className="text-gradient">≈{fa(o.total + adj)}</span>
              </p>
              <p className="mt-1 text-center text-[10px] font-bold text-stone-600">
                مقدار نهایی را سرور حساب و واریز می‌کند
              </p>

              <div className="mx-auto mt-4 flex max-w-[260px] items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs font-bold">
                <span className="text-stone-500">کیف پول</span>
                <span className="tabular-nums text-amber-200">
                  {fa(walletPoints)} → {fa(walletPoints + o.total)}
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirm()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-300 to-violet-300 px-5 py-3.5 text-sm font-extrabold text-ink-950 shadow-[0_14px_40px_-12px_rgba(94,234,212,0.55)] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  بستن روز و واریز به کیف پول
                </button>
                <button
                  type="button"
                  onClick={() => setPassMode(true)}
                  disabled={passesLeft <= 0}
                  className="w-full cursor-pointer rounded-2xl border border-white/12 px-5 py-3 text-xs font-bold text-stone-400 transition-colors hover:border-amber-200/40 hover:text-amber-200 disabled:opacity-40"
                >
                  {passesLeft > 0
                    ? `امروز را با دلیل پاس می‌کنم (${fa(passesLeft)} مانده)`
                    : "سهمیه‌ی ماهانه‌ی پاس تمام شده"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Line({
  label,
  value,
  plus = false,
  minus = false,
  isResult = false,
}: {
  label: string;
  value: number;
  plus?: boolean;
  minus?: boolean;
  isResult?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
      <span className="font-bold text-stone-400">{label}</span>
      <span
        className={`font-black tabular-nums ${
          minus ? "text-rose-300" : isResult ? "text-stone-100" : "text-teal-200"
        }`}
      >
        {minus ? "−" : plus ? "+" : ""}
        {fa(Math.abs(value))}
      </span>
    </div>
  );
}
