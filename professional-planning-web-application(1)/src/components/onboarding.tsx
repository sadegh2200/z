"use client";

import { motion } from "framer-motion";
import { Coins, Orbit, Flame, MoveLeft, Scale } from "lucide-react";
import { useState } from "react";

/** راه‌اندازی اولیه — همان نسخه‌ی ۱٫۰، ولی کوتاه و زیبا. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Orbit,
      title: "چرخِ هفته",
      body: "هفت روز هفته به‌صورت هفت حلقه‌ی هم‌مرکز ۲۴ ساعته؛ هر رنگ یک دسته. الگویت را یک بار بچین، چرخ همیشه پاسدار برنامه است.",
      tone: "text-teal-200",
      ring: "border-teal-200/25 bg-teal-300/10",
    },
    {
      icon: Flame,
      title: "زنجیره و آستانه‌ها",
      body: "روز با پوشش ≥۷۰٪ «معتبر» است و بالای ۵۰٪ زنجیره را زنده نگه می‌دارد. ماهی دو پاس با دلیل داری — نه بیشتر.",
      tone: "text-amber-200",
      ring: "border-amber-200/25 bg-amber-300/10",
    },
    {
      icon: Coins,
      title: "کیف پول و ژتون‌ها",
      body: "هر شب پاداشت را با «پرده‌ی پایان شب» واریز کن؛ ضریب بار، خواب به‌موقع، افزوده‌ی عبادی و جریمه‌ها همه حساب می‌شوند. زنجیره‌های ۷/۱۴/۳۰ روزه ژتون می‌سازند.",
      tone: "text-violet-200",
      ring: "border-violet-300/25 bg-violet-300/10",
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const last = step === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] grid place-items-center bg-ink-950/90 p-4 backdrop-blur-2xl"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="glass-strong w-full max-w-md rounded-[30px] p-8 text-center"
      >
        <span className="mx-auto mb-6 grid size-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-teal-300/20 to-violet-300/20">
          <Scale className="size-6 text-teal-200" />
        </span>
        <motion.span
          key={`ic-${step}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`mx-auto grid size-20 place-items-center rounded-[24px] border ${current.ring}`}
        >
          <Icon className={`size-9 ${current.tone}`} />
        </motion.span>
        <h2 className="mt-5 text-xl font-black">{current.title}</h2>
        <p className="mt-3 text-sm leading-8 text-stone-400">{current.body}</p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-teal-300" : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (last) onDone();
            else setStep((s) => s + 1);
          }}
          className="mt-7 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-300 to-violet-300 px-6 py-3.5 text-sm font-extrabold text-ink-950 shadow-[0_14px_40px_-12px_rgba(94,234,212,0.55)] transition-transform hover:scale-[1.02] active:scale-95"
        >
          {last ? "بزن بریم" : "بعدی"}
          <MoveLeft className="size-4" />
        </button>
        {!last ? (
          <button
            type="button"
            onClick={onDone}
            className="mt-3 cursor-pointer text-[11px] font-bold text-stone-600 transition-colors hover:text-stone-300"
          >
            رد کن — خودم کشفش می‌کنم
          </button>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
