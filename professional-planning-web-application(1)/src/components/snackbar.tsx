"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Undo2, X } from "lucide-react";
import { useEffect } from "react";

export interface Snack {
  id: number;
  msg: string;
  onUndo?: (() => void) | null;
  /** برچسب دکمه‌ی کنش — پیش‌فرض «بازگردانی» */
  actionLabel?: string;
}

/** اسنک‌بار با بازگردانی — نقش status و aria-live برای صفحه‌خوان. */
export function Snackbar({
  snack,
  onDismiss,
}: {
  snack: Snack | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(onDismiss, 4600);
    return () => clearTimeout(t);
  }, [snack, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 lg:bottom-8"
    >
      <AnimatePresence>
        {snack ? (
          <motion.div
            key={snack.id}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-strong pointer-events-auto flex items-center gap-3 rounded-2xl py-2.5 pe-3 ps-4 shadow-[0_20px_60px_-18px_rgba(0,0,0,0.9)]"
          >
            <span className="text-xs font-bold text-stone-200">{snack.msg}</span>
            {snack.onUndo ? (
              <button
                type="button"
                onClick={() => {
                  snack.onUndo?.();
                  onDismiss();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-300/15 px-3 py-1.5 text-[11px] font-extrabold text-teal-100 transition-colors hover:bg-teal-300/25"
              >
                <Undo2 className="size-3.5" />
                {snack.actionLabel ?? "بازگردانی"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="بستن"
              className="grid size-7 cursor-pointer place-items-center rounded-lg text-stone-500 transition-colors hover:bg-white/10 hover:text-stone-200"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
