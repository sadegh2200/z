"use client";

import { motion } from "framer-motion";
import { Award, BadgeCheck, Coins, Download, Gem, Newspaper, Share2 } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { useMemo, useRef, useState } from "react";
import {
  blockMinutes,
  catOf,
  dayScore,
  dayMonthFa,
  dayPoints,
  fa,
  faDur,
  shiftKey,
  todayKey,
  weekDayIndex,
  weekStartKey,
  WEEKDAY_FA,
  type AppState,
} from "@/lib/core";

const TOKEN_COSTS: Record<number, number> = { 7: 30, 14: 60, 30: 120 };

export function ReportTab({
  state,
  chains,
  onKv,
  onSpendToken,
}: {
  state: AppState;
  chains: { current: number; best: number };
  onKv: (key: string, value: unknown) => void;
  /** خرج واقعی از کیف پول برای اجرای ژتون (با سقف روز و اجازه‌ی بدهی) */
  onSpendToken: (tokenId: string) => void;
}) {
  const today = todayKey();
  const start = weekStartKey(today);
  const weekKeys = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftKey(start, i)), [start]);
  const scores = useMemo(
    () => weekKeys.map((k) => dayScore(k, state.blocks, state.checks, state.dayMeta)),
    [weekKeys, state],
  );

  const plannedTotal = scores.reduce((n, s) => n + s.plannedMin, 0);
  const doneTotal = scores.reduce((n, s) => n + s.doneMin, 0);
  const ratio = plannedTotal === 0 ? 0 : doneTotal / plannedTotal;
  const weekPoints = weekKeys.reduce((n, k) => n + dayPoints(k, state), 0);

  // هفته‌ی قبل برای مقایسه
  const prevKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftKey(shiftKey(start, -7), i)),
    [start],
  );
  const prevPoints = prevKeys.reduce((n, k) => n + dayPoints(k, state), 0);
  const pointsDelta = weekPoints - prevPoints;

  // مستحبات این هفته
  const mustahabbHits = state.mlogs
    .filter((l) => weekKeys.includes(l.day))
    .reduce((n, l) => n + l.count, 0);

  // ساعت طلایی تمرکز (از جلسات، سطل ساعتی)
  const goldenHour = useMemo(() => {
    if (state.sessions.length < 2) return null;
    const buckets = new Array<number>(24).fill(0);
    for (const s of state.sessions) {
      const h = new Date(s.createdAt).getHours();
      buckets[h] += s.seconds;
    }
    let best = 0;
    let bestSum = 0;
    for (let h = 0; h < 23; h += 1) {
      const sum = buckets[h] + buckets[h + 1];
      if (sum > bestSum) {
        bestSum = sum;
        best = h;
      }
    }
    if (bestSum === 0) return null;
    return `${fa(best)} تا ${fa(best + 2)}`;
  }, [state.sessions]);
  const bestIdx = scores.reduce((bi, s, i) => (s.points > (scores[bi]?.points ?? -1) ? i : bi), 0);
  const missedByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scores) {
      const wd = weekDayIndex(s.day);
      for (const b of state.blocks.filter((x) => x.active && x.day === wd && x.counts && catOf(x.cat).counts)) {
        const done = state.checks.some((c) => c.blockId === b.id && c.day === s.day && c.done);
        if (!done) m.set(b.cat, (m.get(b.cat) ?? 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [scores, state]);

  const narrative: string[] = useMemo(() => {
    const out: string[] = [];
    if (plannedTotal === 0) {
      out.push("هنوز الگویی برای این هفته تعریف نشده؛ از تنظیمات بلوک اضافه کن.");
      return out;
    }
    out.push(
      ratio >= 0.9
        ? `هفته‌ی استثنایی: ${fa(Math.round(ratio * 100))}٪ از بار جبری پوشش داده شد.`
        : ratio >= 0.6
          ? `هفته‌ی خوبی در جریان است: ${fa(Math.round(ratio * 100))}٪ از بار جبری انجام شده.`
          : `پوشش هفته ${fa(Math.round(ratio * 100))}٪ است؛ هنوز برای بازگشت جا داری.`,
    );
    if (scores[bestIdx] && scores[bestIdx].points > 0)
      out.push(`بهترین روز تا اینجا ${WEEKDAY_FA[bestIdx]} بود با ${fa(scores[bestIdx].points)} امتیاز.`);
    if (missedByCat.length > 0)
      out.push(`بیشترین جاماندگی: «${missedByCat[0][0]}» با ${fa(missedByCat[0][1])} بار.`);
    out.push(
      chains.current > 0
        ? `زنجیره‌ی فعلی ${fa(chains.current)} روز است${chains.current >= chains.best && chains.best > 0 ? " — در آستانه‌ی رکورد تازه" : ""}.`
        : "زنجیره‌ای فعال نیست؛ امروز می‌تواند روز اول باشد.",
    );
    return out;
  }, [plannedTotal, ratio, scores, bestIdx, missedByCat, chains]);

  /* ------------------------------- week card -------------------------------- */
  const cardRef = useRef<HTMLCanvasElement | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  async function drawCard() {
    setCardBusy(true);
    try {
      await document.fonts.ready.catch(() => undefined);
      const canvas = cardRef.current ?? document.createElement("canvas");
      const W = 1080;
      const H = 1350;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // بستر
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0A0A14");
      bg.addColorStop(1, "#05050A");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const aur1 = ctx.createRadialGradient(W * 0.18, H * 0.1, 0, W * 0.18, H * 0.1, 620);
      aur1.addColorStop(0, "rgba(94,234,212,0.16)");
      aur1.addColorStop(1, "transparent");
      ctx.fillStyle = aur1;
      ctx.fillRect(0, 0, W, H);
      const aur2 = ctx.createRadialGradient(W * 0.85, H * 0.9, 0, W * 0.85, H * 0.9, 620);
      aur2.addColorStop(0, "rgba(196,181,253,0.15)");
      aur2.addColorStop(1, "transparent");
      ctx.fillStyle = aur2;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      ctx.direction = "rtl";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "700 40px Vazirmatn, sans-serif";
      ctx.fillText("محاسبهٔ نفس — کارت هفته", W / 2, 150);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "600 30px Vazirmatn, sans-serif";
      ctx.fillText(`${dayMonthFa(weekKeys[0])} تا ${dayMonthFa(weekKeys[6])}`, W / 2, 205);

      // امتیاز بزرگ
      const grad = ctx.createLinearGradient(0, 380, 0, 620);
      grad.addColorStop(0, "#5EEAD4");
      grad.addColorStop(1, "#C4B5FD");
      ctx.fillStyle = grad;
      ctx.font = "900 200px Vazirmatn, sans-serif";
      ctx.fillText(fa(weekPoints), W / 2, 560);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 38px Vazirmatn, sans-serif";
      ctx.fillText("امتیاز این هفته", W / 2, 625);

      // حلقه‌ی پوشش
      const ringY = 830;
      ctx.lineWidth = 26;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(W / 2, ringY, 130, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#5EEAD4";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(W / 2, ringY, 130, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ratio));
      ctx.stroke();
      ctx.fillStyle = "#E7E5E4";
      ctx.font = "900 56px Vazirmatn, sans-serif";
      ctx.fillText(`٪${fa(Math.round(ratio * 100))}`, W / 2, ringY + 22);

      // میله‌های هفته
      const maxP = Math.max(...scores.map((s) => s.points), 10);
      const bw = 78;
      const gapX = 38;
      const totalW = 7 * bw + 6 * gapX;
      const baseY = H - 260;
      scores.forEach((s, i) => {
        const h = Math.max(16, (s.points / maxP) * 220);
        const x = W / 2 + totalW / 2 - i * (bw + gapX) - bw;
        const bg2 = ctx.createLinearGradient(0, baseY - h, 0, baseY);
        bg2.addColorStop(0, "#5EEAD4");
        bg2.addColorStop(1, "#8B7CF6");
        ctx.fillStyle = bg2;
        const r2 = 16;
        ctx.beginPath();
        ctx.roundRect(x, baseY - h, bw, h, r2);
        ctx.fill();
        ctx.fillStyle = i === weekDayIndex(today) ? "#5EEAD4" : "rgba(255,255,255,0.45)";
        ctx.font = "700 28px Vazirmatn, sans-serif";
        ctx.fillText(WEEKDAY_FA[i], x + bw / 2, baseY + 52);
      });

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 30px Vazirmatn, sans-serif";
      ctx.fillText(`زنجیره: ${fa(chains.current)} روز · کیف پول: ${fa(state.kv.wallet.points)} امتیاز`, W / 2, H - 110);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `week-card-${today}.png`;
      a.click();
    } finally {
      setCardBusy(false);
    }
  }

  const tokens = state.kv.tokens;

  // ترند ۳۰ روزه‌ی امتیاز مؤثر
  const trend30 = useMemo(() => {
    const arr: number[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      arr.push(dayPoints(shiftKey(today, -i), state));
    }
    return arr;
  }, [state, today]);

  async function shareCard() {
    await drawCardSilent();
    const canvas = cardRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `week-card-${today}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "کارت هفته — محاسبهٔ نفس" });
          return;
        } catch {
          /* کاربر لغو کرد */
        }
      }
      void drawCard(); // fallback دانلود
    });
  }

  const drawCardSilent = drawCard;

  return (
    <div>
      <header>
        <p className="text-xs font-bold tracking-wide text-stone-500 sm:text-sm">
          روایت هفته، نه دیوار کارت
        </p>
        <h1 className="mt-2 text-3xl font-black leading-[1.25] sm:text-4xl lg:text-[40px]">
          گزارش <span className="text-gradient">و پاداش‌ها</span>
        </h1>
      </header>

      {/* روایت */}
      <div className="glass relative mt-7 overflow-hidden rounded-[28px] p-6">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-60 rounded-full bg-teal-300/8 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-stone-500">
          <Newspaper className="size-4" />
          <p className="text-[11px] font-bold">روایت این هفته</p>
        </div>
        <div className="relative mt-4 space-y-3">
          {narrative.map((line, i) => (
            <p key={i} className="flex items-start gap-3 text-sm leading-7 text-stone-200">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.8)]" />
              {line}
            </p>
          ))}
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2.5 border-t border-white/8 pt-4">
          <Chip label="پوشش بار جبری" value={`٪${fa(Math.round(ratio * 100))}`} />
          <Chip label="زمان انجام‌شده" value={faDur(doneTotal)} />
          <Chip label="امتیاز هفته" value={fa(weekPoints)} tone="#EFD4A0" />
          <Chip
            label="نسبت به هفته‌ی قبل"
            value={`${pointsDelta === 0 ? "هم‌تراز" : pointsDelta > 0 ? `+${fa(pointsDelta)}` : `−${fa(-pointsDelta)}`}`}
            tone={pointsDelta > 0 ? "#5EEAD4" : pointsDelta < 0 ? "#FB7185" : "#94A3B8"}
          />
          <Chip label="مستحبات این هفته" value={`${fa(mustahabbHits)} بار`} tone="#C4B5FD" />
          {goldenHour ? <Chip label="ساعت طلایی تمرکز" value={goldenHour} tone="#EFD4A0" /> : null}
        </div>
      </div>

      {/* ترند ۳۰ روزه */}
      <div className="glass mt-4 rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-stone-200">ترند ۳۰ روز — امتیاز مؤثر</h2>
          <span className="text-[11px] font-bold text-stone-500">
            میانگین: {fa(Math.round(trend30.reduce((a, b) => a + b, 0) / 30))} · آخرین روز: {fa(trend30[29])}
          </span>
        </div>
        <Sparkline values={trend30} />
      </div>

      {/* اوج فعالیت بر اساس ساعت روز */}
      <div className="glass mt-4 rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-stone-200">اوج فعالیت بر مبنای ساعت روز</h2>
          <span className="text-[10px] font-bold text-stone-500">تعهدات انجام‌شده + تمرکزها</span>
        </div>
        <ActivityHeat state={state} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* کیف پول + زنجیره */}
        <div className="glass rounded-[28px] p-6">
          <div className="flex items-center gap-2.5 text-stone-500">
            <Coins className="size-4" />
            <p className="text-[11px] font-bold">کیف پول امتیاز</p>
            <span className="ms-auto text-[10px] font-bold text-stone-600">
              سقف {fa(state.kv.economy.walletCap)} · انقضا پس از {fa(state.kv.walletExp)} روز سکون
            </span>
          </div>
          <p className={`mt-4 text-5xl font-black tabular-nums ${state.kv.wallet.points < 0 ? "text-rose-300" : ""}`}>
            <span className={state.kv.wallet.points < 0 ? "" : "text-gradient"}>
              <AnimatedNumber value={state.kv.wallet.points} />
            </span>
            {state.kv.wallet.points < 0 ? (
              <span className="ms-2 align-middle text-xs font-extrabold text-rose-300/80">(بدهی)</span>
            ) : null}
          </p>
          {/* نوار سقف */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/7">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-amber-300 to-teal-300"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.max(0, Math.min(100, Math.round((state.kv.wallet.points / state.kv.economy.walletCap) * 100)))}%`,
              }}
              transition={{ type: "spring", stiffness: 60, damping: 16 }}
            />
          </div>
          <p className="mt-2 text-xs leading-6 text-stone-500">
            هر شب با «پرده‌ی پایان شب» واریز می‌شود؛ خرج ژتون‌ها سقف روزانه‌ی{" "}
            {fa(state.kv.economy.dayUseCap)} امتیاز دارد
            {state.kv.spentToday.day === today && state.kv.spentToday.amount > 0
              ? ` (امروز: ${fa(state.kv.spentToday.amount)} خرج شد)`
              : ""}
            .
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/8 pt-4 text-center">
            <div>
              <p className="text-xl font-black tabular-nums text-amber-200">{fa(chains.current)}</p>
              <p className="mt-1 text-[10px] font-bold text-stone-500">زنجیره‌ی فعلی</p>
            </div>
            <div>
              <p className="text-xl font-black tabular-nums text-stone-100">{fa(chains.best)}</p>
              <p className="mt-1 text-[10px] font-bold text-stone-500">بهترین رکورد</p>
            </div>
          </div>
        </div>

        {/* قفسه‌ی ژتون‌ها */}
        <div className="glass rounded-[28px] p-6">
          <div className="flex items-center gap-2.5 text-stone-500">
            <Gem className="size-4" />
            <p className="text-[11px] font-bold">قفسه‌ی ژتون‌ها</p>
          </div>
          <div className="mt-4 space-y-2.5">
            {tokens.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs leading-6 text-stone-500">
                هنوز ژتونی نداری.
                <br />
                زنجیره‌ی ۷، ۱۴ و ۳۰ روزه ژتون می‌سازد.
              </p>
            ) : (
              tokens.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                    t.used
                      ? "border-white/6 bg-white/[0.02] opacity-50"
                      : "border-amber-200/25 bg-amber-300/[0.07]"
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
                      t.used
                        ? "border-white/8 bg-white/5 text-stone-600"
                        : "border-amber-200/30 bg-amber-300/15 text-amber-200"
                    }`}
                  >
                    <Award className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-stone-100">{t.label}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-stone-500">{t.desc}</p>
                    <span className="mt-1 inline-block rounded-full bg-amber-300/10 px-2 py-0.5 text-[9px] font-extrabold text-amber-200 tabular-nums">
                      هزینه: {fa(TOKEN_COSTS[t.tier] ?? 30)} امتیاز
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSpendToken(t.id)}
                    disabled={t.used}
                    className={`shrink-0 cursor-pointer rounded-xl px-3 py-2 text-[10px] font-extrabold transition-colors ${
                      t.used
                        ? "cursor-default border border-white/8 text-stone-600"
                        : "border border-teal-200/30 bg-teal-300/10 text-teal-100 hover:bg-teal-300/20"
                    }`}
                  >
                    {t.used ? "مصرف شد" : "استفاده کنم"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* کارت هفته */}
      <div className="glass mt-4 rounded-[28px] p-6 text-center">
        <BadgeCheck className="mx-auto size-8 text-teal-200" />
        <h2 className="mt-3 text-base font-black">کارت هفته — خروجی تصویری بدون سرور</h2>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-stone-500">
          یک تصویر PNG زیبا از عملکرد هفته‌ات می‌سازد؛ مناسب اشتراک یا آرشیو شخصی.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => void drawCard()}
            disabled={cardBusy}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-l from-teal-300 to-violet-300 px-6 py-3 text-sm font-extrabold text-ink-950 shadow-[0_14px_36px_-12px_rgba(94,234,212,0.55)] transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
          >
            <Download className="size-4" />
            {cardBusy ? "در حال ساخت…" : "دانلود PNG"}
          </button>
          <button
            type="button"
            onClick={() => void shareCard()}
            disabled={cardBusy}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/12 px-6 py-3 text-sm font-extrabold text-stone-300 transition-colors hover:border-teal-200/40 hover:text-teal-200 disabled:opacity-50"
          >
            <Share2 className="size-4" />
            اشتراک‌گذاری
          </button>
        </div>
        <canvas ref={cardRef} className="hidden" />
      </div>
    </div>
  );
}

/** اسپارک‌لاین SVG: خط + محوطه‌ی گرادیانی + نقطه‌ی امروز */
function Sparkline({ values }: { values: number[] }) {
  const W = 560;
  const H = 128;
  const PAD = 12;
  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const stepX = (W - PAD * 2) / (values.length - 1);
  // RTL: قدیمی‌ترین راست‌ترین
  const pts = values.map((v, i) => {
    const x = W - PAD - i * stepX;
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2 - 16);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${line} L ${W - PAD} ${H - 24} L ${PAD} ${H - 24} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="ترند ۳۰ روزه‌ی امتیاز">
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-line" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#5EEAD4" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-area)" />
      <motion.path
        d={line}
        fill="none"
        stroke="url(#spark-line)"
        strokeWidth={2.4}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
      <motion.circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={4.5}
        fill="#5EEAD4"
        stroke="#07070d"
        strokeWidth={2}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.3, type: "spring", stiffness: 300, damping: 14 }}
      />
      <text
        x={pts[pts.length - 1][0]}
        y={H - 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={800}
        fill="#5EEAD4"
      >
        امروز
      </text>
    </svg>
  );
}

/** نقشه‌ی اوج فعالیت: دقیقه‌ها در هر ساعت روز (از تعهدات انجام‌شده + جلسات تمرکز) */
function ActivityHeat({ state }: { state: AppState }) {
  const data = useMemo(() => {
    const buckets = new Array<number>(24).fill(0);
    for (const c of state.checks) {
      if (!c.done) continue;
      const b = state.blocks.find((x) => x.id === c.blockId);
      if (!b) continue;
      const from = b.fromMin;
      const total = Math.max(0, blockMinutes(b));
      if (total === 0) continue;
      const to = from + total;
      for (let h = 0; h < 24; h += 1) {
        const overlap = Math.max(0, Math.min(to, (h + 1) * 60) - Math.max(from, h * 60));
        if (overlap > 0) buckets[h] += overlap;
      }
    }
    for (const s of state.sessions) {
      const h = new Date(s.createdAt).getHours();
      buckets[h] += Math.round(s.seconds / 60);
    }
    const max = Math.max(...buckets, 1);
    return { buckets, max };
  }, [state]);

  const rows = [];
  for (let h = 4; h < 24; h += 2) {
    rows.push([h, h + 1] as const);
  }

  return (
    <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {rows.map(([a, b]) => {
        const av = data.buckets[a];
        const bv = data.buckets[b];
        return (
          <div key={a} className="flex items-center gap-2.5">
            <span className="w-14 shrink-0 text-left text-[10px] font-bold tabular-nums text-stone-500">
              {fa(a)}–{fa(b % 24)}
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/6">
              <motion.div
                className="absolute inset-y-0 right-0 rounded-full"
                style={{ background: "linear-gradient(90deg,#8B7CF6,#5EEAD4)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(av / data.max) * 100}%` }}
                transition={{ type: "spring", stiffness: 70, damping: 20 }}
              />
              <motion.div
                className="absolute inset-y-0 right-0 rounded-full opacity-60"
                style={{ background: "linear-gradient(90deg,#5EEAD4,#F0ABFC)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(bv / data.max) * 100}%` }}
                transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.05 }}
              />
            </div>
            <span className="w-12 shrink-0 text-left text-[9px] font-bold tabular-nums text-stone-600">
              {fa(Math.round(av + bv))}د
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Chip({ label, value, tone = "#5EEAD4" }: { label: string; value: string; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[11px] font-bold text-stone-400">
      {label}
      <span className="font-black tabular-nums" style={{ color: tone }}>
        {value}
      </span>
    </span>
  );
}
