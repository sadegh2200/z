"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Flame,
  Orbit,
  Scale,
  Settings2,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bestChain,
  currentChain,
  cyclePrayer,
  earnableTokens,
  fa,
  mustahabbDays,
  routineDays,
  todayKey,
  type AppState,
  type Block,
  type CatKey,
  type Mustahabb,
  type Pen,
  type Routine,
} from "@/lib/core";
import { fireConfetti } from "@/lib/confetti";
import { playPop } from "@/lib/sound";
import { DEFAULT_KV } from "@/lib/seed-data";
import { CommandPalette } from "./command-palette";
import { DialTab } from "./dial-tab";
import { FocusOverlay } from "./focus-overlay";
import { FocusPip } from "./focus-pip";
import { Onboarding } from "./onboarding";
import { ReportTab } from "./report-tab";
import { SettingsTab } from "./settings-tab";
import { Snackbar, type Snack } from "./snackbar";
import { Splash } from "./splash";
import { TodayTab } from "./today-tab";
import { WeekTab } from "./week-tab";

export type Tab = "today" | "dial" | "week" | "report" | "settings";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "today", label: "امروز", icon: Sun },
  { key: "dial", label: "چرخ هفته", icon: Orbit },
  { key: "week", label: "هفته", icon: CalendarRange },
  { key: "report", label: "گزارش", icon: BarChart3 },
  { key: "settings", label: "تنظیمات", icon: Settings2 },
];

export interface BlockPayload {
  day: number;
  fromMin: number;
  toMin: number;
  cat: CatKey;
  counts: boolean;
  title: string;
}

export interface RoutinePayload {
  title?: string;
  type?: "min" | "sleep" | "check";
  targetMin?: number;
  targetClock?: number;
  weight?: number;
  scope?: "daily" | "days";
  days?: number[];
}

export interface PenPayload {
  id?: number;
  title?: string;
  targetMin?: number;
  points?: number;
  active?: boolean;
  delete?: boolean;
}

export default function AppShell() {
  const [state, setState] = useState<AppState | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [savedPulse, setSavedPulse] = useState(0);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [freeFocus, setFreeFocus] = useState(false);

  const today = todayKey();
  const markSaved = useCallback(() => setSavedPulse(Date.now()), []);
  const notify = useCallback(
    (msg: string, onUndo?: () => void, actionLabel?: string) =>
      setSnack({ id: Date.now(), msg, onUndo: onUndo ?? null, actionLabel }),
    [],
  );

  // میان‌برهای PWA: ?tab=…
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TABS.some((x) => x.key === t)) setTab(t as Tab);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as AppState;
      data.kv = { ...(DEFAULT_KV as object), ...(data.kv ?? {}) } as AppState["kv"];
      setState(data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // بازگشت به تب ⇒ بازخوانی تازه (همگام با دستگاه/پنجره‌های دیگر)
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [reload]);

  useEffect(() => {
    if (savedPulse === 0) return;
    const t = setTimeout(() => setSavedPulse(0), 1400);
    return () => clearTimeout(t);
  }, [savedPulse]);

  const a11y = state?.kv.a11y;
  useEffect(() => {
    const scale = a11y?.textScale ?? 100;
    document.documentElement.style.fontSize = `${(16 * scale) / 100}px`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [a11y?.textScale]);

  // تم: تیره / روشن / خودکار
  const themePref = state?.kv.theme ?? "dark";
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const eff = themePref === "auto" ? (mq.matches ? "light" : "dark") : themePref;
      document.documentElement.dataset.theme = eff;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", eff === "light" ? "#eef1ef" : "#05050a");
    };
    apply();
    if (themePref === "auto") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    return () => {
      document.documentElement.dataset.theme = "dark";
    };
  }, [themePref]);

  // میان‌برهای کیبورد تب‌ها: کلیدهای ۱ تا ۵ + ⌘K برای پالت فرمان
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.tagName === "SELECT")
      )
        return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= TABS.length) setTab(TABS[n - 1].key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ------------------------------- generic KV ------------------------------- */

  const saveKv = useCallback(
    (key: string, value: unknown) => {
      markSaved();
      setState((prev) =>
        prev ? { ...prev, kv: { ...prev.kv, [key]: value } } : prev,
      );
      void fetch("/api/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    },
    [markSaved],
  );

  /* --------------------------------- checks --------------------------------- */

  const toggleCheck = useCallback(
    (block: Block, done: boolean, actualMin = 0, day = today) => {
      markSaved();
      if (done) playPop();
      else {
        const before = state?.checks.find(
          (c) => c.blockId === block.id && c.day === day && c.done,
        );
        notify("تیک برداشته شد", () => toggleCheck(block, true, before?.actualMin ?? 0, day));
      }
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.checks.findIndex((c) => c.blockId === block.id && c.day === day);
        const checks = [...prev.checks];
        if (idx >= 0) checks[idx] = { ...checks[idx], done, actualMin };
        else checks.push({ id: -Date.now(), blockId: block.id, day, done, actualMin });
        return { ...prev, checks };
      });
      void fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id, day, done, actualMin }),
      })
        .then(async (res) => {
          if (!res.ok) return void reload();
          const row = (await res.json()) as AppState["checks"][number];
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  checks: prev.checks.map((c) =>
                    c.blockId === row.blockId && c.day === row.day ? row : c,
                  ),
                }
              : prev,
          );
        })
        .catch(() => void reload());
    },
    [today, state, markSaved, notify, reload],
  );

  /* ------------------------------- focus/session ----------------------------- */

  const saveSession = useCallback(
    (blockId: number | null, routineId: number | null, seconds: number) => {
      markSaved();
      void fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, routineId, day: today, seconds }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const row = (await res.json()) as AppState["sessions"][number];
          setState((prev) =>
            prev ? { ...prev, sessions: [...prev.sessions, row] } : prev,
          );
        })
        .catch(() => {});
    },
    [today, markSaved],
  );

  /* -------------------------------- routines --------------------------------- */

  const rDelta = useCallback(
    (r: Routine, deltaMin: number) => {
      markSaved();
      const mins = Math.round(deltaMin / 15) * 15 || deltaMin;
      if (deltaMin > 0) playPop();
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.rlogs.findIndex((l) => l.routineId === r.id && l.day === today);
        const rlogs = [...prev.rlogs];
        if (idx >= 0)
          rlogs[idx] = { ...rlogs[idx], minutes: Math.max(0, Math.min(720, rlogs[idx].minutes + deltaMin)) };
        else rlogs.push({ id: -Date.now(), routineId: r.id, day: today, minutes: Math.max(0, deltaMin), done: false });
        return { ...prev, rlogs };
      });
      void fetch("/api/rlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId: r.id, day: today, deltaMin: deltaMin }),
      })
        .then(async (res) => {
          if (!res.ok) return void reload();
          const row = (await res.json()) as AppState["rlogs"][number];
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  rlogs: prev.rlogs.map((l) =>
                    l.routineId === row.routineId && l.day === row.day
                      ? { ...l, id: row.id, minutes: row.minutes }
                      : l,
                  ),
                }
              : prev,
          );
        })
        .catch(() => void reload());
      void mins;
    },
    [today, markSaved, reload],
  );

  const rToggle = useCallback(
    (r: Routine, done: boolean) => {
      markSaved();
      if (done) playPop();
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.rlogs.findIndex((l) => l.routineId === r.id && l.day === today);
        const rlogs = [...prev.rlogs];
        if (idx >= 0) rlogs[idx] = { ...rlogs[idx], done };
        else rlogs.push({ id: -Date.now(), routineId: r.id, day: today, minutes: 0, done });
        return { ...prev, rlogs };
      });
      void fetch("/api/rlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId: r.id, day: today, done }),
      }).catch(() => void reload());
    },
    [today, markSaved, reload],
  );

  const addRoutine = useCallback(
    async (p: Required<RoutinePayload>) => {
      markSaved();
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) return;
      const row = (await res.json()) as Routine;
      setState((prev) => (prev ? { ...prev, routines: [...prev.routines, row] } : prev));
    },
    [markSaved],
  );

  const updateRoutine = useCallback(
    async (id: number, patch: RoutinePayload & { active?: boolean }) => {
      markSaved();
      setState((prev) =>
        prev
          ? {
              ...prev,
              routines: prev.routines.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      ...patch,
                      daysJson: patch.days ? JSON.stringify(patch.days) : r.daysJson,
                    }
                  : r,
              ),
            }
          : prev,
      );
      await fetch(`/api/routines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [markSaved],
  );

  const deleteRoutine = useCallback(
    (id: number) => {
      markSaved();
      const removed = state?.routines.find((r) => r.id === id);
      setState((prev) =>
        prev
          ? {
              ...prev,
              routines: prev.routines.filter((r) => r.id !== id),
              rlogs: prev.rlogs.filter((l) => l.routineId !== id),
            }
          : prev,
      );
      void fetch(`/api/routines/${id}`, { method: "DELETE" });
      if (removed)
        notify("روتین حذف شد", () =>
          void addRoutine({
            title: removed.title,
            type: removed.type,
            targetMin: removed.targetMin,
            targetClock: removed.targetClock,
            weight: removed.weight,
            scope: removed.scope,
            days: routineDays(removed),
          }),
        );
    },
    [state, markSaved, notify, addRoutine],
  );

  /* ---------------------------------- pens ----------------------------------- */

  const pDelta = useCallback(
    (p: Pen, deltaMin: number) => {
      markSaved();
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.plogs.findIndex((l) => l.penId === p.id && l.day === today);
        const plogs = [...prev.plogs];
        if (idx >= 0)
          plogs[idx] = { ...plogs[idx], minutes: Math.max(0, Math.min(720, plogs[idx].minutes + deltaMin)) };
        else plogs.push({ id: -Date.now(), penId: p.id, day: today, minutes: Math.max(0, deltaMin) });
        return { ...prev, plogs };
      });
      void fetch("/api/plog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penId: p.id, day: today, deltaMin }),
      })
        .then(async (res) => {
          if (!res.ok) return void reload();
          const row = (await res.json()) as AppState["plogs"][number];
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  plogs: prev.plogs.map((l) =>
                    l.penId === row.penId && l.day === row.day
                      ? { ...l, id: row.id, minutes: row.minutes }
                      : l,
                  ),
                }
              : prev,
          );
        })
        .catch(() => void reload());
    },
    [today, markSaved, reload],
  );

  const patchPen = useCallback(
    async (p: PenPayload) => {
      markSaved();
      const res = await fetch("/api/pens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) return;
      if (p.delete) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                pens: prev.pens.filter((x) => x.id !== p.id),
                plogs: prev.plogs.filter((l) => l.penId !== p.id),
              }
            : prev,
        );
        return;
      }
      const row = (await res.json()) as Pen;
      setState((prev) =>
        prev
          ? {
              ...prev,
              pens: p.id
                ? prev.pens.map((x) => (x.id === row.id ? row : x))
                : [...prev.pens, row],
            }
          : prev,
      );
    },
    [markSaved],
  );

  /* --------------------------------- prayers --------------------------------- */

  /** چرخه‌ی سه‌حالته: نخوانده → اول وقت → دیر → نخوانده */
  const cyclePrayerHandler = useCallback(
    (name: string) => {
      markSaved();
      const cur = state?.prayers.find((p) => p.day === today && p.name === name);
      const next = cyclePrayer(cur);
      if (next.done && !cur?.done) playPop();
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.prayers.findIndex((p) => p.day === today && p.name === name);
        const prayers = [...prev.prayers];
        if (idx >= 0) prayers[idx] = { ...prayers[idx], done: next.done, onTime: next.onTime };
        else prayers.push({ id: -Date.now(), day: today, name, done: next.done, onTime: next.onTime });
        return { ...prev, prayers };
      });
      void fetch("/api/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: today, name, done: next.done, onTime: next.onTime }),
      }).catch(() => void reload());
    },
    [today, state, markSaved, reload],
  );

  /* ------------------------------ mustahabbs --------------------------------- */

  const mDelta = useCallback(
    (m: Mustahabb, delta: number) => {
      markSaved();
      if (delta > 0) playPop();
      else notify("یک ثبت کم شد", () => mDelta(m, 1));
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.mlogs.findIndex((l) => l.mustahabbId === m.id && l.day === today);
        const mlogs = [...prev.mlogs];
        if (idx >= 0) mlogs[idx] = { ...mlogs[idx], count: Math.max(0, mlogs[idx].count + delta) };
        else mlogs.push({ id: -Date.now(), mustahabbId: m.id, day: today, count: Math.max(0, delta) });
        return { ...prev, mlogs };
      });
      void fetch("/api/mlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mustahabbId: m.id, day: today, delta }),
      })
        .then(async (res) => {
          if (!res.ok) return void reload();
          const row = (await res.json()) as AppState["mlogs"][number];
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  mlogs: prev.mlogs.map((l) =>
                    l.mustahabbId === row.mustahabbId && l.day === row.day
                      ? { ...l, id: row.id, count: row.count }
                      : l,
                  ),
                }
              : prev,
          );
        })
        .catch(() => void reload());
    },
    [today, markSaved, notify, reload],
  );

  /* -------------------------------- day meta --------------------------------- */

  const upsertDayMeta = useCallback((meta: AppState["dayMeta"][number]) => {
    setState((prev) => {
      if (!prev) return prev;
      const idx = prev.dayMeta.findIndex((m) => m.day === meta.day);
      const dayMeta = [...prev.dayMeta];
      if (idx >= 0) dayMeta[idx] = meta;
      else dayMeta.push(meta);
      return { ...prev, dayMeta };
    });
  }, []);

  /** بستن شب — معتبرسازی سرور: امتیاز واقعیِ نهایی از پاسخ سرور می‌آید. */
  const closeNight = useCallback(
    async (sleepAt: number | null, adj = 0) => {
      const res = await fetch("/api/close-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: today, sleepAt, adj }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        meta: AppState["dayMeta"][number];
        wallet: number;
        weeklyBonus: number;
      };
      markSaved();
      upsertDayMeta(data.meta);
      saveKv("wallet", { points: data.wallet });
      if (data.weeklyBonus > 0) notify(`بونوس هفتگی +${fa(data.weeklyBonus)} هم واریز شد`);
    },
    [today, markSaved, upsertDayMeta, saveKv, notify],
  );

  const setPass = useCallback(
    (pass: boolean, reason: string) => {
      markSaved();
      upsertDayMeta({
        day: today,
        closed: false,
        pass,
        passReason: pass ? reason : "",
        pointsBanked: 0,
        sleepAt: null,
        loadFactor: null,
        weeklyBonus: false,
        adjPoints: 0,
      });
      void fetch("/api/daymeta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: today, action: pass ? "pass" : "unpass", reason }),
      });
    },
    [today, upsertDayMeta, markSaved],
  );

  /* --------------------------------- blocks ---------------------------------- */

  const addBlock = useCallback(
    async (p: BlockPayload) => {
      markSaved();
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) return;
      const row = (await res.json()) as Block;
      setState((prev) => (prev ? { ...prev, blocks: [...prev.blocks, row] } : prev));
    },
    [markSaved],
  );

  const updateBlock = useCallback(
    async (id: number, patch: Partial<BlockPayload> & { active?: boolean }) => {
      markSaved();
      setState((prev) =>
        prev ? { ...prev, blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : prev,
      );
      await fetch(`/api/blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(async (res) => {
        if (!res.ok) return;
        const row = (await res.json()) as Block;
        setState((prev) =>
          prev ? { ...prev, blocks: prev.blocks.map((b) => (b.id === id ? row : b)) } : prev,
        );
      });
    },
    [markSaved],
  );

  const deleteBlock = useCallback(
    (id: number) => {
      markSaved();
      const removed = state?.blocks.find((b) => b.id === id);
      setState((prev) =>
        prev
          ? {
              ...prev,
              blocks: prev.blocks.filter((b) => b.id !== id),
              checks: prev.checks.filter((c) => c.blockId !== id),
            }
          : prev,
      );
      void fetch(`/api/blocks/${id}`, { method: "DELETE" });
      if (removed)
        notify("بلوک حذف شد", () =>
          void addBlock({
            day: removed.day,
            fromMin: removed.fromMin,
            toMin: removed.toMin,
            cat: removed.cat,
            counts: removed.counts,
            title: removed.title,
          }),
        );
    },
    [state, markSaved, notify, addBlock],
  );

  /* -------------------------------- mustahabbs -------------------------------- */

  const addMustahabb = useCallback(
    async (title: string, days: number[]) => {
      markSaved();
      const res = await fetch("/api/mustahabbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, days }),
      });
      if (!res.ok) return;
      const row = (await res.json()) as Mustahabb;
      setState((prev) => (prev ? { ...prev, mustahabbs: [...prev.mustahabbs, row] } : prev));
    },
    [markSaved],
  );

  const updateMustahabb = useCallback(
    async (id: number, patch: { title?: string; days?: number[]; active?: boolean }) => {
      markSaved();
      setState((prev) =>
        prev
          ? {
              ...prev,
              mustahabbs: prev.mustahabbs.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      title: patch.title ?? m.title,
                      daysJson: patch.days ? JSON.stringify(patch.days) : m.daysJson,
                      active: patch.active ?? m.active,
                    }
                  : m,
              ),
            }
          : prev,
      );
      await fetch(`/api/mustahabbs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [markSaved],
  );

  const deleteMustahabb = useCallback(
    (id: number) => {
      markSaved();
      const removed = state?.mustahabbs.find((m) => m.id === id);
      setState((prev) =>
        prev
          ? {
              ...prev,
              mustahabbs: prev.mustahabbs.filter((m) => m.id !== id),
              mlogs: prev.mlogs.filter((l) => l.mustahabbId !== id),
            }
          : prev,
      );
      void fetch(`/api/mustahabbs/${id}`, { method: "DELETE" });
      if (removed)
        notify("مستحب حذف شد", () => void addMustahabb(removed.title, mustahabbDays(removed)));
    },
    [state, markSaved, notify, addMustahabb],
  );

  /* ------------------------- برنامه‌های روز (DayTasks) ------------------------- */

  const addDayTask = useCallback(
    async (p: { title: string; estMin: number; weight: number; billable: boolean }) => {
      markSaved();
      const res = await fetch("/api/daytasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, day: today }),
      });
      if (!res.ok) return;
      const row = (await res.json()) as import("@/lib/core").DayTask;
      setState((prev) =>
        prev ? { ...prev, daytasks: [...prev.daytasks, row] } : prev,
      );
    },
    [today, markSaved],
  );

  const patchDayTask = useCallback(
    async (id: number, patch: Partial<Pick<import("@/lib/core").DayTask, "title" | "estMin" | "weight" | "billable" | "done">> & { action?: "start" | "stop" }) => {
      markSaved();
      // تایمر: خوش‌بینانه روی کلاینت
      setState((prev) => {
        if (!prev) return prev;
        const list = [...prev.daytasks];
        const idx = list.findIndex((t) => t.id === id);
        if (idx < 0) return prev;
        const cur = list[idx];
        const now = Date.now();
        let next = { ...cur, ...patch };
        if (patch.action === "start") {
          // تک‌تایمر: بقیه را ببند
          for (let i = 0; i < list.length; i += 1) {
            const t = list[i];
            if (t.id !== id && t.startedAt) {
              list[i] = {
                ...t,
                startedAt: null,
                elapsedSec: t.elapsedSec + Math.floor((now - new Date(t.startedAt).getTime()) / 1000),
              };
            }
          }
          next = { ...next, startedAt: new Date(now).toISOString(), done: false };
        } else if (patch.action === "stop" || patch.done === true) {
          if (cur.startedAt)
            next = {
              ...next,
              startedAt: null,
              elapsedSec: cur.elapsedSec + Math.floor((now - new Date(cur.startedAt).getTime()) / 1000),
            };
          else next = { ...next, startedAt: null };
        }
        list[idx] = next;
        return { ...prev, daytasks: list };
      });
      await fetch(`/api/daytasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(async (res) => {
        if (!res.ok) return void reload();
        const row = (await res.json()) as import("@/lib/core").DayTask;
        setState((prev) =>
          prev
            ? {
                ...prev,
                daytasks: prev.daytasks.map((t) => (t.id === row.id ? row : t)),
              }
            : prev,
        );
      });
    },
    [markSaved, reload],
  );

  const deleteDayTask = useCallback(
    (id: number) => {
      markSaved();
      const removed = state?.daytasks.find((t) => t.id === id);
      setState((prev) =>
        prev ? { ...prev, daytasks: prev.daytasks.filter((t) => t.id !== id) } : prev,
      );
      void fetch(`/api/daytasks/${id}`, { method: "DELETE" });
      if (removed)
        notify("کار حذف شد", () =>
          void addDayTask({
            title: removed.title,
            estMin: removed.estMin,
            weight: removed.weight,
            billable: removed.billable,
          }),
        );
    },
    [state, markSaved, notify, addDayTask],
  );

  /* ----------------------------- کیف پول: خرج ----------------------------- */

  const addSpend = useCallback(
    async (amount: number, title: string, kind: "spend" | "token" = "spend") => {
      const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: today, amount, title, kind }),
      });
      const data = (await res.json()) as {
        error?: string;
        spend?: import("@/lib/core").Spend;
        wallet?: number;
        spentToday?: number;
      };
      if (!res.ok || !data.spend) throw new Error(data.error ?? "ثبت نشد");
      markSaved();
      setState((prev) =>
        prev
          ? {
              ...prev,
              spends: [...prev.spends, data.spend!],
              kv: {
                ...prev.kv,
                wallet: { points: data.wallet ?? prev.kv.wallet.points },
                spentToday: { day: today, amount: data.spentToday ?? 0 },
              },
            }
          : prev,
      );
      notify(`${fa(amount)} امتیاز خرج شد — ${title}`);
    },
    [today, markSaved, notify],
  );

  const deleteSpend = useCallback(
    (id: number) => {
      markSaved();
      const removed = state?.spends.find((s) => s.id === id);
      setState((prev) =>
        prev ? { ...prev, spends: prev.spends.filter((s) => s.id !== id) } : prev,
      );
      void fetch(`/api/spend?id=${id}`, { method: "DELETE" })
        .then(async (res) => {
          if (!res.ok) return void reload();
          const d = (await res.json()) as { wallet?: number };
          setState((prev) =>
            prev && d.wallet !== undefined
              ? { ...prev, kv: { ...prev.kv, wallet: { points: d.wallet } } }
              : prev,
          );
        })
        .catch(() => void reload());
      if (removed) notify(`خرج «${removed.title}» برگشت خورد`);
    },
    [state, markSaved, notify, reload],
  );

  const resetAll = useCallback(async () => {
    await fetch("/api/reset", { method: "POST" });
    await reload();
    notify("به الگوی پیش‌فرض برگشت");
  }, [reload, notify]);

  /* خرج ژتون: هزینه بر اساس پله، با سقف خرج روز و اجازه‌ی بدهی تا debtCap */
  const TOKEN_COSTS: Record<number, number> = { 7: 30, 14: 60, 30: 120 };
  const [settingsDay, setSettingsDay] = useState<number | null>(null);

  const spendToken = useCallback(
    (tokenId: string) => {
      if (!state) return;
      const token = state.kv.tokens.find((t) => t.id === tokenId);
      if (!token || token.used) return;
      const cost = TOKEN_COSTS[token.tier] ?? 30;
      const spentRec =
        state.kv.spentToday.day === today
          ? state.kv.spentToday
          : { day: today, amount: 0 };
      if (spentRec.amount + cost > state.kv.economy.dayUseCap) {
        notify("سقف خرج امروز پر است — فردا اقدام کن");
        return;
      }
      const balance = state.kv.wallet.points;
      if (balance - cost < -state.kv.economy.debtCap) {
        notify("سقف بدهی هم پر است؛ اول امتیاز جمع کن");
        return;
      }
      markSaved();
      saveKv(
        "tokens",
        state.kv.tokens.map((t) => (t.id === tokenId ? { ...t, used: true } : t)),
      );
      void addSpend(cost, token.label, "token").catch(() => undefined);
      fireConfetti();
      notify(
        balance - cost < 0
          ? `ژتون اجرا شد — کیف پول ${fa(balance - cost)} (بدهی)`
          : `ژتون اجرا شد — ${fa(cost)} امتیاز از کیف پول رفت`,
      );
    },
    [state, today, saveKv, notify, markSaved],
  );

  /* ------------------------- derived: chains & tokens ------------------------ */

  const chains = useMemo(() => {
    if (!state) return { current: 0, best: 0 };
    const cfg = state.kv.streakCfg;
    return {
      current: currentChain(state.blocks, state.checks, state.dayMeta, cfg),
      best: bestChain(state.blocks, state.checks, state.dayMeta, cfg),
    };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const merged = earnableTokens(chains.best, state.kv.tokens);
    if (merged.length > state.kv.tokens.length) {
      saveKv("tokens", merged);
      fireConfetti();
      notify("ژتون تازه ساخته شد — به قفسه‌ی گزارش ببین!");
    }
  }, [chains.best, state, saveKv, notify]);

  const ready = state !== null && !failed;

  const admitOnboarding = useMemo(
    () => ready && !state?.kv.onboarded,
    [ready, state],
  );

  // جلسه‌ی جامانده‌ی تمرکز
  useEffect(() => {
    if (!ready) return;
    try {
      const raw = localStorage.getItem("nafs_focus_start");
      if (!raw) return;
      localStorage.removeItem("nafs_focus_start");
      const rec = JSON.parse(raw) as { start: number; blockId: number | null; routineId?: number | null };
      const sec = Math.floor((Date.now() - rec.start) / 1000);
      if (sec < 300 || sec > 6 * 3600) return;
      notify(
        `جلسه‌ی تمرکز جامانده: ${fa(Math.floor(sec / 60))} دقیقه`,
        () => saveSession(rec.blockId, rec.routineId ?? null, sec),
        "ثبت جلسه",
      );
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* --------------------------------- render ---------------------------------- */

  return (
    <div className={`relative mx-auto flex min-h-screen w-full max-w-[1460px] ${a11y?.contrast ? "hc" : ""}`}>
      <Splash />

      <AnimatePresence>
        {savedPulse > 0 ? (
          <motion.div
            key={savedPulse}
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-strong fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-full px-4 py-2"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-200">
              <CheckCircle2 className="size-3.5" />
              ذخیره شد
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[296px] shrink-0 border-l border-white/6 lg:block">
        <div className="flex h-full flex-col px-6 py-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-teal-300/20 to-violet-300/20">
              <Scale className="size-5 text-teal-200" />
            </span>
            <div>
              <p className="text-xl font-black leading-7">محاسبهٔ نفس</p>
              <p className="mt-0.5 text-[11px] text-stone-500">نسخهٔ ۲٫۰ — مهندسی‌شده از نو</p>
            </div>
          </div>

          <nav className="mt-10 space-y-1.5">
            {TABS.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                    active ? "text-stone-50" : "text-stone-500 hover:text-stone-200"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="nafs2-nav-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-2xl border border-teal-200/25 bg-gradient-to-l from-teal-300/12 to-violet-300/12"
                    />
                  ) : null}
                  <Icon className={`relative size-[18px] ${active ? "text-teal-200" : ""}`} />
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="glass relative overflow-hidden rounded-3xl p-4">
              <div className="relative flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-amber-300">
                  <Flame className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-stone-100">
                    زنجیره: {fa(chains.current)} روز
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-stone-500">
                    رکورد: {fa(chains.best)} روز
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-5 px-1 text-center text-[10px] leading-5 text-stone-700">
              محاسبهٔ نفس · چرخ، زنجیره، کیف پول
            </p>
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="min-w-0 flex-1 px-4 pb-32 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pt-9 lg:pb-20">
        {failed ? (
          <FailedState onRetry={() => void reload()} />
        ) : !ready ? (
          <LoadingState />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {tab === "today" ? (
                <TodayTab
                  state={state}
                  chain={chains.current}
                  onToggle={toggleCheck}
                  onSession={saveSession}
                  onMDelta={mDelta}
                  onRDelta={rDelta}
                  onRToggle={rToggle}
                  onPDelta={pDelta}
                  onPrayer={cyclePrayerHandler}
                  onCloseNight={closeNight}
                  onPass={setPass}
                  onTaskAdd={addDayTask}
                  onTaskPatch={patchDayTask}
                  onTaskDelete={deleteDayTask}
                  onSpend={addSpend}
                  onDeleteSpend={deleteSpend}
                />
              ) : tab === "dial" ? (
                <DialTab state={state} />
              ) : tab === "week" ? (
                <WeekTab
                  state={state}
                  onKv={saveKv}
                  onEditDay={(wd) => {
                    setSettingsDay(wd);
                    setTab("settings");
                  }}
                />
              ) : tab === "report" ? (
                <ReportTab state={state} chains={chains} onKv={saveKv} onSpendToken={spendToken} />
              ) : (
                <SettingsTab
                  state={state}
                  focusDay={settingsDay}
                  onBlockAdd={addBlock}
                  onBlockUpdate={updateBlock}
                  onBlockDelete={deleteBlock}
                  onMustahabbAdd={addMustahabb}
                  onMustahabbUpdate={updateMustahabb}
                  onMustahabbDelete={deleteMustahabb}
                  onRoutineAdd={addRoutine}
                  onRoutineUpdate={updateRoutine}
                  onRoutineDelete={deleteRoutine}
                  onPen={patchPen}
                  onKv={saveKv}
                  onReset={resetAll}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* mobile dock */}
      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass-strong flex items-stretch gap-0.5 rounded-[26px] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-[20px] py-2.5 text-[10px] font-bold transition-colors ${
                  active ? "text-stone-50" : "text-stone-500"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="nafs2-dock-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-[20px] border border-teal-200/25 bg-gradient-to-l from-teal-300/15 to-violet-300/15"
                  />
                ) : null}
                <Icon className={`relative size-5 ${active ? "text-teal-200" : ""}`} />
                <span className="relative">{t.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Snackbar snack={snack} onDismiss={() => setSnack(null)} />

      {/* پالت فرمان ⌘K */}
      <CommandPalette
        open={paletteOpen && ready}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(t) => {
          setTab(t);
        }}
        onFocusFree={() => setFreeFocus(true)}
        onAddTask={() => {
          setTab("today");
          setTimeout(() => window.dispatchEvent(new Event("nafs:focus-add-task")), 300);
        }}
        onTonight={() => {
          setTab("today");
          setTimeout(() => window.dispatchEvent(new Event("nafs:open-night")), 300);
        }}
      />

      {/* مینی‌پیپ تایمر جاری — روی همه‌ی تب‌ها قابل دیدن */}
      <AnimatePresence>
        {ready
          ? (() => {
              const running = state.daytasks.find((t) => t.day === today && t.startedAt);
              return running && tab !== "today" ? (
                <FocusPip
                  task={running}
                  onStop={() => void patchDayTask(running.id, { action: "stop" })}
                  onGoToday={() => setTab("today")}
                />
              ) : null;
            })()
          : null}
      </AnimatePresence>

      {/* تمرکز آزاد از پالت */}
      <AnimatePresence>
        {freeFocus && ready ? (
          <FocusOverlay
            block={null}
            routines={state.routines.filter((r) => r.active && r.type === "min")}
            onClose={() => setFreeFocus(false)}
            onSave={(bid, rid, sec) => saveSession(bid, rid, sec)}
          />
        ) : null}
      </AnimatePresence>

      {/* راه‌اندازی اولیه */}
      <AnimatePresence>
        {admitOnboarding ? (
          <Onboarding onDone={() => saveKv("onboarded", true)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- states ---------------------------------- */

function LoadingState() {
  return (
    <div className="grid place-items-center py-32">
      <div className="flex flex-col items-center gap-4">
        <span className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-teal-300/20" />
          <span className="grid size-14 place-items-center rounded-3xl border border-white/10 bg-gradient-to-br from-teal-300/20 to-violet-300/20">
            <Scale className="size-6 text-teal-200" />
          </span>
        </span>
        <p className="text-sm font-bold text-stone-400">در حال آماده‌سازی چرخ و ترازو…</p>
      </div>
    </div>
  );
}

function FailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[28px] border border-rose-300/20 bg-rose-400/5 px-6 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-3xl border border-rose-300/20 bg-rose-400/10 text-rose-300">
        <TriangleAlert className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-black text-rose-200">اتصال برقرار نشد</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-stone-400">
        دریافت داده از پایگاه‌داده ممکن نشد.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mx-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-l from-teal-300 to-violet-300 px-5 py-2.5 text-sm font-extrabold text-ink-950"
      >
        تلاش دوباره
      </button>
    </div>
  );
}
