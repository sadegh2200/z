"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarRange,
  Coins,
  MoonStar,
  Orbit,
  Plus,
  Search,
  Settings2,
  Sun,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Tab } from "./app-shell";

interface Action {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
}

/** پالت فرمان — ⌘K / Ctrl+K */
export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onFocusFree,
  onAddTask,
  onTonight,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: Tab) => void;
  onFocusFree: () => void;
  onAddTask: () => void;
  onTonight: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo<Action[]>(
    () =>
      [
        { id: "today", label: "برو به امروز", hint: "تب ۱", icon: Sun, run: () => onNavigate("today") },
        { id: "dial", label: "چرخ هفته", hint: "تب ۲", icon: Orbit, run: () => onNavigate("dial") },
        { id: "week", label: "تحلیل هفته", hint: "تب ۳", icon: CalendarRange, run: () => onNavigate("week") },
        { id: "report", label: "گزارش و کیف پول", hint: "تب ۴", icon: BarChart3, run: () => onNavigate("report") },
        { id: "settings", label: "تنظیمات و الگو", hint: "تب ۵", icon: Settings2, run: () => onNavigate("settings") },
        { id: "add", label: "افزودن برنامه‌ی امروز", hint: "تخمین + وزن", icon: Plus, run: onAddTask },
        { id: "focus", label: "تمرکز آزاد (کرنومتر)", hint: "با یا بدون هدف", icon: Timer, run: onFocusFree },
        { id: "night", label: "پرده‌ی پایان شب", hint: "بستن روز و واریز", icon: MoonStar, run: onTonight },
        { id: "wallet", label: "کیف پول و ژتون‌ها", hint: "گزارش", icon: Coins, run: () => onNavigate("report") },
      ],
    [onNavigate, onFocusFree, onAddTask, onTonight],
  );

  const filtered = actions.filter(
    (a) => q.trim() === "" || a.label.includes(q.trim()) || a.hint.includes(q.trim()),
  );

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setI((x) => Math.min(filtered.length - 1, x + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setI((x) => Math.max(0, x - 1));
      } else if (e.key === "Enter") {
        const a = filtered[i];
        if (a) {
          a.run();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, filtered, i, onClose]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[92] grid place-items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="پالت فرمان"
        className="glass-strong w-[min(92vw,560px)] overflow-hidden rounded-[24px] shadow-[0_40px_120px_-24px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <Search className="size-4.5 shrink-0 text-stone-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            placeholder="بنویس یا فرمان را انتخاب کن…"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
          />
          <kbd className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-stone-500">esc</kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-stone-500">فرمانی پیدا نشد.</p>
          ) : (
            filtered.map((a, idx) => {
              const Icon = a.icon;
              const active = idx === i;
              return (
                <button
                  key={a.id}
                  type="button"
                  onMouseEnter={() => setI(idx)}
                  onClick={() => {
                    a.run();
                    onClose();
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-right transition-colors ${
                    active ? "bg-teal-300/10" : ""
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border transition-colors ${
                      active
                        ? "border-teal-200/30 bg-teal-300/15 text-teal-200"
                        : "border-white/8 bg-white/4 text-stone-400"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-stone-100">{a.label}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-extrabold text-stone-600">
                    {a.hint}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <p className="border-t border-white/6 px-5 py-3 text-[10px] font-bold text-stone-600">
          ↑↓ حرکت · Enter اجرا · esc بستن — هرجای اپ ⌘K
        </p>
      </motion.div>
    </motion.div>
  );
}
