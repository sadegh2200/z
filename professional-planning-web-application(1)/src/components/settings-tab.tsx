"use client";

import { motion } from "framer-motion";
import {
  Accessibility,
  BedDouble,
  Download,
  MoonStar,
  Orbit,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sunrise,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { DragDayEditor } from "./drag-day-editor";
import { useMemo, useState } from "react";
import {
  blockMinutes,
  CATS,
  catOf,
  fa,
  faClock,
  faDur,
  mustahabbDays,
  parseHHMM,
  routineDays,
  WEEKDAY_FA,
  todayKey,
  type AppState,
  type Block,
  type CatKey,
  type Mustahabb,
  type Pen,
  type Routine,
} from "@/lib/core";
import type { BlockPayload, PenPayload, RoutinePayload } from "./app-shell";

export function SettingsTab({
  state,
  focusDay = null,
  onBlockAdd,
  onBlockUpdate,
  onBlockDelete,
  onMustahabbAdd,
  onMustahabbUpdate,
  onMustahabbDelete,
  onRoutineAdd,
  onRoutineUpdate,
  onRoutineDelete,
  onPen,
  onKv,
  onReset,
}: {
  state: AppState;
  /** اگر از تب هفته با «ویرایش الگوی روز X» آمده باشیم */
  focusDay?: number | null;
  onBlockAdd: (p: BlockPayload) => Promise<void>;
  onBlockUpdate: (id: number, patch: Partial<BlockPayload> & { active?: boolean }) => Promise<void>;
  onBlockDelete: (id: number) => void;
  onMustahabbAdd: (title: string, days: number[]) => Promise<void>;
  onMustahabbUpdate: (id: number, patch: { title?: string; days?: number[]; active?: boolean }) => Promise<void>;
  onMustahabbDelete: (id: number) => void;
  onRoutineAdd: (p: Required<RoutinePayload>) => Promise<void>;
  onRoutineUpdate: (id: number, patch: RoutinePayload & { active?: boolean }) => Promise<void>;
  onRoutineDelete: (id: number) => void;
  onPen: (p: PenPayload) => Promise<void>;
  onKv: (key: string, value: unknown) => void;
  onReset: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selDay, setSelDay] = useState(focusDay ?? 0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busyReset, setBusyReset] = useState(false);

  const q = query.trim();
  const match = (t: string) => q === "" || t.includes(q);

  const dayBlocks = state.blocks
    .filter((b) => b.day === selDay && (match(b.title) || match(b.cat)))
    .sort((a, b) => a.fromMin - b.fromMin);

  const musts = state.mustahabbs.filter((m) => match(m.title));
  const checklist = state.kv.checklist.filter((c) => match(c.title));

  const weeklyLoad = useMemo(
    () =>
      state.blocks
        .filter((b) => b.active && b.counts && catOf(b.cat).counts)
        .reduce((n, b) => n + blockMinutes(b), 0),
    [state.blocks],
  );

  /* ---- کالیبراسیون تخمین — بر مبنای برنامه‌های روز با زمان واقعی ---- */
  const suggestions = useMemo(() => {
    const byTitle = new Map<string, { est: number[]; meas: number[] }>();
    for (const t of state.daytasks) {
      if (t.elapsedSec <= 0 || t.estMin <= 0) continue;
      const g = byTitle.get(t.title) ?? { est: [], meas: [] };
      g.est.push(t.estMin);
      g.meas.push(Math.round(t.elapsedSec / 60));
      byTitle.set(t.title, g);
    }
    const out: { title: string; avg: number; planned: number }[] = [];
    for (const [title, g] of byTitle) {
      if (g.meas.length < 2) continue;
      const avg = Math.round(g.meas.reduce((a, b) => a + b, 0) / g.meas.length);
      const planned = Math.round(g.est.reduce((a, b) => a + b, 0) / g.est.length);
      if (Math.abs(avg - planned) >= 10) out.push({ title, avg, planned });
    }
    return out.slice(0, 4);
  }, [state.daytasks]);

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ app: "muhasabat-v2", exportedAt: new Date().toISOString(), ...state }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `muhasabat-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onKv("lastBackupAt", todayKey());
  }

  // یادآور پشتیبان: اگر بیش از ۷ روز از آخرین بکاپ گذشته
  const backupStale =
    !state.kv.lastBackupAt ||
    (Date.now() - new Date(`${state.kv.lastBackupAt}T12:00:00`).getTime()) / 86400000 > 7;

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3500);
      return;
    }
    setBusyReset(true);
    try {
      await onReset();
      setConfirmReset(false);
    } finally {
      setBusyReset(false);
    }
  }

  return (
    <div>
      <header>
        <p className="text-xs font-bold tracking-wide text-stone-500 sm:text-sm">
          سه سطح: الگو، اعمال، سیستم
        </p>
        <h1 className="mt-2 text-3xl font-black leading-[1.25] sm:text-4xl lg:text-[40px]">
          تنظیمات <span className="text-gradient">و الگو</span>
        </h1>
      </header>

      {/* جست‌وجو */}
      <div className="glass mt-6 flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-4 shrink-0 text-stone-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو در بلوک‌ها، مستحبات و چک‌لیست…"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-100 outline-none placeholder:text-stone-600"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="cursor-pointer text-[11px] font-bold text-teal-200"
          >
            پاک کن
          </button>
        ) : null}
      </div>

      {/* الگوی هفتگی */}
      <Section
        title="الگوی هفتگی"
        hint={`بار جبری هفته: ${faDur(weeklyLoad)}`}
      >
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {WEEKDAY_FA.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelDay(i)}
              className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
                selDay === i
                  ? "border-teal-200/50 bg-teal-300/10 text-teal-100"
                  : "border-white/10 text-stone-400 hover:border-white/25"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <DragDayEditor
          day={selDay}
          blocks={state.blocks}
          onCreate={(fromMin, toMin) =>
            void onBlockAdd({ day: selDay, fromMin, toMin, cat: "کلاس", counts: true, title: "" })
          }
          onMove={(id, fromMin, toMin) => void onBlockUpdate(id, { fromMin, toMin })}
        />

        <div className="space-y-2.5">
          {dayBlocks.map((b) => (
            <BlockRow
              key={b.id}
              block={b}
              onPatch={(patch) => void onBlockUpdate(b.id, patch)}
              onDelete={() => onBlockDelete(b.id)}
            />
          ))}
          {dayBlocks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-stone-500">
              {q ? "چیزی با این جست‌وجو پیدا نشد." : `برای ${WEEKDAY_FA[selDay]} بلوکی نیست.`}
            </p>
          ) : null}
        </div>

        <BlockAdder day={selDay} onAdd={onBlockAdd} />
      </Section>

      {/* مستحبات */}
      <Section title="مستحبات" hint="مستقل از امتیاز و پاداش">
        <div className="space-y-2.5">
          {musts.map((m) => (
            <MustahabbRow
              key={m.id}
              m={m}
              onPatch={(p) => void onMustahabbUpdate(m.id, p)}
              onDelete={() => onMustahabbDelete(m.id)}
            />
          ))}
          {musts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-stone-500">
              موردی نیست.
            </p>
          ) : null}
        </div>
        <MustahabbAdder onAdd={onMustahabbAdd} />
      </Section>

      {/* پنجره‌ی شب + چک‌لیست */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="پنجره‌ی شب" hint="بازه‌ی «پرده‌ی پایان شب»" compact>
          <div className="flex items-center gap-3">
            <MoonStar className="size-5 shrink-0 text-amber-200" />
            <input
              type="time"
              value={toHHMM(state.kv.night.from)}
              onChange={(e) => {
                const v = parseHHMM(e.target.value);
                if (v !== null) onKv("night", { ...state.kv.night, from: v });
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/4 px-3 py-2.5 text-center font-sans text-base font-bold text-stone-100 outline-none focus:border-amber-200/40"
            />
            <span className="text-xs font-bold text-stone-500">تا</span>
            <input
              type="time"
              value={toHHMM(state.kv.night.to)}
              onChange={(e) => {
                const v = parseHHMM(e.target.value);
                if (v !== null) onKv("night", { ...state.kv.night, to: v });
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/4 px-3 py-2.5 text-center font-sans text-base font-bold text-stone-100 outline-none focus:border-amber-200/40"
            />
          </div>
        </Section>

        <Section title="چک‌لیست هفتگی" hint="تکمیل همه = بونوس +۲۰" compact>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-200">{item.title}</span>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() =>
                    onKv("checklist", state.kv.checklist.filter((x) => x.id !== item.id))
                  }
                  className="grid size-7 cursor-pointer place-items-center rounded-lg text-stone-500 transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <ChecklistAdder
            onAdd={(title) =>
              onKv("checklist", [
                ...state.kv.checklist,
                { id: `c${Date.now()}`, title },
              ])
            }
          />
        </Section>
      </div>

      {/* کالیبراسیون تخمین — از برنامه‌های روز با زمان واقعی */}
      {suggestions.length > 0 ? (
        <Section title="پیشنهاد خودکار — کالیبراسیون تخمین" hint="از تخمین در برابر واقعیتِ کارهای روز">
          <div className="space-y-2.5">
            {suggestions.map((s) => (
              <div
                key={s.title}
                className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-amber-200/15 bg-amber-300/[0.05] px-4 py-3"
              >
                <Wand2 className="size-4 shrink-0 text-amber-200" />
                <p className="min-w-0 flex-1 text-xs leading-6 text-stone-300">
                  «{s.title}» معمولاً {faDur(s.avg)} طول می‌کشد، نه {faDur(s.planned)} — بار
                  بعد دقیق‌تر تخمین بزن؛ پیشنهاد خودکار در فرم افزودن کار انجام می‌شود.
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* روتین‌ها */}
      <Section title="روتین‌ها" hint="عادت‌های دقیقه‌محور با وزن امتیاز">
        <div className="space-y-2.5">
          {state.routines
            .filter((r) => match(r.title))
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((r) => (
              <RoutineRow
                key={r.id}
                r={r}
                onPatch={(p) => void onRoutineUpdate(r.id, p)}
                onDelete={() => onRoutineDelete(r.id)}
              />
            ))}
        </div>
        <RoutineAdder onAdd={onRoutineAdd} />
      </Section>

      {/* جریمه‌ها */}
      <Section title="جریمه‌ها" hint="بیش از سقف مصرف ⇒ کسر امتیاز">
        <div className="space-y-2.5">
          {state.pens.filter((p) => match(p.title)).map((p) => (
            <PenRow
              key={p.id}
              p={p}
              onPatch={(patch) => void onPen({ id: p.id, ...patch })}
              onDelete={() => void onPen({ id: p.id, delete: true })}
            />
          ))}
        </div>
        <PenAdder onAdd={(t) => void onPen({ title: t })} />
      </Section>

      {/* موتور پاداش — کنترل کامل */}
      <Section
        title="موتور پاداش"
        hint="همه‌چیز قابل تنظیم · فلسفه: کشش مثبت، نه تنبیه"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="امتیاز هر ساعت تعهد" value={state.kv.weights.blockPerHour} min={0} max={30} onChange={(v) => onKv("weights", { ...state.kv.weights, blockPerHour: v })} />
          <NumField label="ضریب وزن کار روز ×۱۰" value={Math.round(state.kv.weights.taskWeightMul * 10)} min={5} max={40} onChange={(v) => onKv("weights", { ...state.kv.weights, taskWeightMul: v / 10 })} />
          <NumField label="بونوس صداقت تخمین" value={state.kv.weights.estAccuracy} min={0} max={10} onChange={(v) => onKv("weights", { ...state.kv.weights, estAccuracy: v })} />
          <NumField label="هر وقت نماز" value={state.kv.weights.perPrayer} min={0} max={20} onChange={(v) => onKv("weights", { ...state.kv.weights, perPrayer: v })} />
          <NumField label="بونوس نمازِ کامل" value={state.kv.weights.allPrayersBonus} min={0} max={50} onChange={(v) => onKv("weights", { ...state.kv.weights, allPrayersBonus: v })} />
          <NumField label="هر مستحب" value={state.kv.weights.perMustahabb} min={0} max={20} onChange={(v) => onKv("weights", { ...state.kv.weights, perMustahabb: v })} />
          <NumField label="بونوس مستحباتِ کامل" value={state.kv.weights.allMustahabbBonus} min={0} max={50} onChange={(v) => onKv("weights", { ...state.kv.weights, allMustahabbBonus: v })} />
          <NumField label="شتاب هر روز زنجیره ٪" value={state.kv.weights.chainStep} min={0} max={15} onChange={(v) => onKv("weights", { ...state.kv.weights, chainStep: v })} />
          <NumField label="سقف پله‌های شتاب" value={state.kv.weights.chainMaxSteps} min={0} max={20} onChange={(v) => onKv("weights", { ...state.kv.weights, chainMaxSteps: v })} />
        </div>
        <p className="mt-3 rounded-2xl border border-teal-200/15 bg-teal-300/[0.05] px-4 py-3 text-[11px] leading-6 text-teal-100/80">
          <strong>فلسفه‌ی موتور v4:</strong> نماز و مستحبات دیگر «دروازه» نیستند — هر کدام امتیاز
          مثبت خودشان را دارند و تکمیل‌شان بونوس می‌دهد. جا ریختن تعهد فقط همان سهم را پس
          می‌گیرد (بدون تنبیه مضاعف). روتین‌ها منحنی نرم دارند تا قدم‌های اول ارزشمند باشد و
          پاداش تکمیل، آخرین ۲۰٪ را شیرین کند. امتیاز روز هرگز منفی نمی‌شود.
        </p>
      </Section>

      {/* نام اوقات نماز */}
      <Section title="اوقات نماز" hint="فهرست قابل ویرایش" compact>
        <div className="flex flex-wrap items-center gap-2">
          {state.kv.prayerNames.map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-stone-300"
            >
              {n}
              <button
                type="button"
                aria-label={`حذف ${n}`}
                onClick={() => onKv("prayerNames", state.kv.prayerNames.filter((x) => x !== n))}
                className="cursor-pointer text-stone-600 transition-colors hover:text-rose-300"
              >
                ×
              </button>
            </span>
          ))}
          <PrayerAdder
            onAdd={(name) => {
              if (!state.kv.prayerNames.includes(name))
                onKv("prayerNames", [...state.kv.prayerNames, name]);
            }}
          />
        </div>
      </Section>

      {/* چرخ و نمایش */}
      <Section title="چرخ و نمایش" hint="خط‌کش، تم چرخ، نشانگر بیداری" compact>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={() => onKv("dialMarks", !state.kv.dialMarks)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-[11px] font-extrabold transition-all ${
              state.kv.dialMarks
                ? "border-teal-200/50 bg-teal-300/10 text-teal-100"
                : "border-white/10 text-stone-500"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            خط‌کش ساعت چرخ {state.kv.dialMarks ? "روشن" : "خاموش"}
          </button>
          <div className="flex items-center gap-2">
            <Orbit className="size-4 text-stone-500" />
            <span className="text-[11px] font-bold text-stone-500">تم چرخ:</span>
            {(["nafs", "calm"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onKv("dialTheme", t)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                  state.kv.dialTheme === t
                    ? "border-teal-200/50 bg-teal-300/10 text-teal-100"
                    : "border-white/10 text-stone-500 hover:border-white/25"
                }`}
              >
                {t === "nafs" ? "نفس (زنده)" : "آرام"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] font-bold text-stone-500">
            <Sunrise className="size-4 text-amber-200" />
            ساعت بیداری (نشانگر روی چرخ روز):
            <input
              type="time"
              dir="ltr"
              value={`${String(Math.floor(state.kv.wakeTime / 60)).padStart(2, "0")}:${String(state.kv.wakeTime % 60).padStart(2, "0")}`}
              onChange={(e) => {
                const v = parseHHMM(e.target.value);
                if (v !== null) onKv("wakeTime", v);
              }}
              className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none focus:border-amber-200/40"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/6 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-500">تم:</span>
            {(["dark", "light", "auto"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onKv("theme", t)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                  state.kv.theme === t
                    ? "border-teal-200/50 bg-teal-300/10 text-teal-100"
                    : "border-white/10 text-stone-500 hover:border-white/25"
                }`}
              >
                {t === "dark" ? "تیره" : t === "light" ? "روشن" : "خودکار"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onKv("askTime", !state.kv.askTime)}
            className={`cursor-pointer rounded-xl border px-3.5 py-2 text-[11px] font-extrabold transition-all ${
              state.kv.askTime
                ? "border-teal-200/50 bg-teal-300/10 text-teal-100"
                : "border-white/10 text-stone-500"
            }`}
          >
            پرسش زمان بعد از تیک {state.kv.askTime ? "روشن" : "خاموش"}
          </button>
        </div>

        {/* نوار خانه‌ی نیمه‌رنگ */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
          <span className="text-[11px] font-extrabold" style={{ color: catOf("خانه").fg }}>
            نوار خانه (نیمه‌رنگ):
          </span>
          <input
            type="time"
            dir="ltr"
            aria-label="از"
            value={`${String(Math.floor(state.kv.homeBand.from / 60)).padStart(2, "0")}:${String(state.kv.homeBand.from % 60).padStart(2, "0")}`}
            onChange={(e) => {
              const v = parseHHMM(e.target.value);
              if (v !== null) onKv("homeBand", { ...state.kv.homeBand, from: v });
            }}
            className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none"
          />
          <span className="text-[10px] text-stone-600">تا</span>
          <input
            type="time"
            dir="ltr"
            aria-label="تا"
            value={`${String(Math.floor(state.kv.homeBand.to / 60)).padStart(2, "0")}:${String(state.kv.homeBand.to % 60).padStart(2, "0")}`}
            onChange={(e) => {
              const v = parseHHMM(e.target.value);
              if (v !== null) onKv("homeBand", { ...state.kv.homeBand, to: v });
            }}
            className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none"
          />
          <div className="flex items-center gap-1">
            {WEEKDAY_FA.map((d, i) => {
              const on = state.kv.homeBand.days.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={d}
                  title={d}
                  onClick={() =>
                    onKv("homeBand", {
                      ...state.kv.homeBand,
                      days: on
                        ? state.kv.homeBand.days.filter((x) => x !== i)
                        : [...state.kv.homeBand.days, i].sort(),
                    })
                  }
                  className={`grid size-7 cursor-pointer place-items-center rounded-lg text-[10px] font-extrabold transition-all ${
                    on ? "bg-rose-200/20 text-rose-100" : "bg-white/5 text-stone-600 hover:text-stone-400"
                  }`}
                >
                  {d.slice(0, 1)}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* موتور پیشرفته */}
      <Section title="موتور اقتصاد — پیشرفته" hint="سقف‌ها و ضرایب نسخه‌ی ۱٫۰، قابل تنظیم">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="سقف کسب پایه (earnMax)" value={state.kv.earnMax} min={5} max={500} onChange={(v) => onKv("earnMax", v)} />
          <NumField label="سقف جریمه‌ی روز (penCap)" value={state.kv.penCap} min={5} max={300} onChange={(v) => onKv("penCap", v)} />
          <NumField label="انقضای کیف پول (روز)" value={state.kv.walletExp} min={3} max={180} onChange={(v) => onKv("walletExp", v)} />
          <NumField label="سقف تعدیل دستی (±)" value={state.kv.adjCap} min={0} max={100} onChange={(v) => onKv("adjCap", v)} />
          <NumField label="سقف تعهد روز (maxTasks)" value={state.kv.maxTasks} min={1} max={15} onChange={(v) => onKv("maxTasks", v)} />
          <NumField label="هدف برنامه روز (دقیقه)" value={state.kv.planTarget} min={0} max={960} onChange={(v) => onKv("planTarget", v)} />
          <NumField label="کف امتیاز روز (floorMin)" value={state.kv.floorMin} min={0} max={100} onChange={(v) => onKv("floorMin", v)} />
        </div>
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
          <p className="text-[10px] font-bold text-stone-500">
            کف هدف برنامه‌ی هر روز (دقیقه) — خالی = هدف کلی {fa(state.kv.planTarget)}
          </p>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {WEEKDAY_FA.map((d, i) => {
              const v = state.kv.baseMinByDay[i];
              return (
                <label key={d} className="block text-center">
                  <span className="mb-1 block text-[9px] font-extrabold text-stone-500">{d}</span>
                  <input
                    type="number"
                    dir="ltr"
                    aria-label={d}
                    value={v ?? ""}
                    placeholder="–"
                    onChange={(e) => {
                      const raw = e.target.value === "" ? null : Number(e.target.value);
                      const arr = [...state.kv.baseMinByDay];
                      arr[i] = raw === null || !Number.isFinite(raw) ? null : Math.max(0, Math.min(960, Math.round(raw)));
                      onKv("baseMinByDay", arr);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/4 px-1 py-1.5 text-center font-sans text-xs font-black tabular-nums text-stone-100 outline-none focus:border-teal-200/40"
                  />
                </label>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onKv("quran", !state.kv.quran)}
          className={`mt-3 cursor-pointer rounded-xl border px-3.5 py-2 text-[11px] font-extrabold transition-all ${
            state.kv.quran
              ? "border-sky-300/50 bg-sky-300/10 text-sky-100"
              : "border-white/10 text-stone-500 hover:border-white/25"
          }`}
        >
          افزوده‌ی عبادی نیازمند قرآن خووانده‌شده {state.kv.quran ? "است" : "نیست"}
        </button>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <StepTable
            icon={<BedDouble className="size-4 text-violet-200" />}
            title="ضرایب خواب به‌موقع"
            hint="تأخیر (دقیقه از هدف) → ضریب (٪)"
            colA="تأخیر (دقیقه)"
            colB="ضریب ٪"
            rows={state.kv.sleepSteps.map(([m, c]) => [m, Math.round(c * 100)])}
            onChange={(rows) => onKv("sleepSteps", rows.map(([m, c]) => [m, c / 100] as [number, number]))}
            maxA={180}
          />
          <StepTable
            icon={<SlidersHorizontal className="size-4 text-sky-200" />}
            title="جدول ضریب بار"
            hint="اگر کار روز بیش از حد شد، ضریب مهربان‌تر شود"
            colA="حد کار روز (دقیقه)"
            colB="ضریب ٪"
            rows={state.kv.loads.map(([m, c]) => [m, Math.round(c * 100)])}
            onChange={(rows) =>
              onKv("loads", rows.map(([m, c]) => [m, c / 100] as [number, number]).sort((a, b) => a[0] - b[0]))
            }
            maxA={1440}
          />
        </div>
      </Section>

      {/* اقتصاد و آستانه‌ها */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="اقتصاد کیف پول" hint="همان اعداد نسخه‌ی ۱٫۰" compact>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="سقف کیف پول" value={state.kv.economy.walletCap} min={30} max={5000} onChange={(v) => onKv("economy", { ...state.kv.economy, walletCap: v })} />
            <NumField label="سقف خرج روز" value={state.kv.economy.dayUseCap} min={10} max={1000} onChange={(v) => onKv("economy", { ...state.kv.economy, dayUseCap: v })} />
            <NumField label="سقف بدهی" value={state.kv.economy.debtCap} min={0} max={200} onChange={(v) => onKv("economy", { ...state.kv.economy, debtCap: v })} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/6 pt-3">
            <NumField label="افزوده‌ی عبادی ٪" value={state.kv.devotionalPct} min={0} max={50} onChange={(v) => onKv("devotionalPct", v)} />
            <NumField label="پاس در ماه" value={state.kv.passesPerMonth} min={0} max={10} onChange={(v) => onKv("passesPerMonth", v)} />
          </div>
        </Section>

        <Section title="زنجیره و بونوس هفتگی" hint="آستانه‌ها به درصد" compact>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="روز معتبر ≥ ٪" value={state.kv.streakCfg.thresh} min={10} max={100} onChange={(v) => onKv("streakCfg", { ...state.kv.streakCfg, thresh: v })} />
            <NumField label="کف زنجیره ≥ ٪" value={state.kv.streakCfg.floor} min={0} max={100} onChange={(v) => onKv("streakCfg", { ...state.kv.streakCfg, floor: v })} />
            <NumField label="بونوس هفته ≥ ٪" value={state.kv.weeklyCfg.minPct} min={10} max={100} onChange={(v) => onKv("weeklyCfg", { ...state.kv.weeklyCfg, minPct: v })} />
            <NumField label="امتیاز بونوس" value={state.kv.weeklyCfg.bonusMin} min={0} max={200} onChange={(v) => onKv("weeklyCfg", { ...state.kv.weeklyCfg, bonusMin: v })} />
          </div>
        </Section>
      </div>

      {/* دسترس‌پذیری */}
      <Section title="دسترس‌پذیری" hint="مقیاس متن و کنتراست">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Accessibility className="size-4 text-stone-500" />
            <span className="text-xs font-bold text-stone-400">مقیاس متن:</span>
            <div className="flex gap-1.5">
              {([100, 112, 125] as const).map((s) => {
                const active = state.kv.a11y.textScale === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onKv("a11y", { ...state.kv.a11y, textScale: s })}
                    className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                      active
                        ? "border-teal-200/50 bg-teal-300/10 text-teal-100"
                        : "border-white/10 text-stone-500 hover:border-white/25"
                    }`}
                  >
                    {s === 100 ? "استاندارد" : s === 112 ? "درشت" : "خیلی درشت"}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onKv("a11y", { ...state.kv.a11y, contrast: !state.kv.a11y.contrast })}
            className={`cursor-pointer rounded-xl border px-3.5 py-2 text-[11px] font-extrabold transition-all ${
              state.kv.a11y.contrast
                ? "border-amber-200/50 bg-amber-300/10 text-amber-100"
                : "border-white/10 text-stone-500 hover:border-white/25"
            }`}
          >
            کنتراست بالا {state.kv.a11y.contrast ? "روشن" : "خاموش"}
          </button>
        </div>
      </Section>

      {/* نصب اپ */}
      <Section title="نصب به‌صورت اپلیکیشن (PWA)" hint="مانند نسخه‌ی ۱٫۰، مستقل روی گوشی">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold text-stone-200">
              <Smartphone className="size-4 text-teal-200" />
              اندروید (کروم)
            </p>
            <p className="mt-2 text-[11px] leading-6 text-stone-500">
              منوی ⋮ → «Add to Home screen» / «نصب اپلیکیشن». میان‌برها: امروز، چرخ هفته، گزارش.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold text-stone-200">
              <Share2 className="size-4 text-violet-200" />
              آیفون (سافاری)
            </p>
            <p className="mt-2 text-[11px] leading-6 text-stone-500">
              دکمه‌ی Share → «Add to Home Screen». تم تیره و آیکون گرادیانی خودکار اعمال می‌شود.
            </p>
          </div>
        </div>
      </Section>

      {/* داده‌ها */}
      <Section title="داده‌ها" hint="پشتیبان و بازنشانی">
        {backupStale ? (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] px-4 py-3 text-[11px] font-bold leading-6 text-amber-100/90">
            <ShieldAlert className="size-4 shrink-0" />
            {state.kv.lastBackupAt
              ? "بیش از یک هفته از آخرین پشتیبان گذشته — یک نسخه بگیر."
              : "تاکنون پشتیبان نگرفته‌ای — همین حالا یک نسخه بگیر."}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-extrabold text-stone-300 transition-colors hover:border-teal-200/40 hover:text-teal-200"
          >
            <Download className="size-4" />
            دانلود پشتیبان JSON
          </button>
          <ImportButton />
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={busyReset}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-extrabold transition-colors ${
              confirmReset
                ? "border-rose-300/50 bg-rose-400/15 text-rose-200"
                : "border-white/12 text-stone-400 hover:border-rose-300/40 hover:text-rose-300"
            }`}
          >
            <RefreshCcw className={`size-4 ${busyReset ? "animate-spin" : ""}`} />
            {confirmReset ? "مطمئنی؟ یک بار دیگر بزن" : "بازنشانی کامل به الگوی پیش‌فرض"}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-600">
            <ShieldAlert className="size-3.5" />
            بازنشانی، همه‌ی تاریخچه را پاک می‌کند.
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-6 text-stone-600">
          <Sparkles className="size-3.5" />
          داده‌ها روی PostgreSQL امن‌اند؛ نسخه‌ی ۱٫۰ فقط یک localStorage شکننده داشت.
        </p>
      </Section>
    </div>
  );
}

/* ---------------------------------- parts ---------------------------------- */

function Section({
  title,
  hint,
  compact = false,
  children,
}: {
  title: string;
  hint?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass mt-4 rounded-[26px] ${compact ? "p-5" : "p-5 sm:p-6"}`}
    >
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-sm font-black text-stone-200">{title}</h2>
        {hint ? <span className="text-[10px] font-bold text-stone-500">{hint}</span> : null}
      </div>
      {children}
    </motion.section>
  );
}

function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/* --------------------------------- blocks ---------------------------------- */

function BlockRow({
  block,
  onPatch,
  onDelete,
}: {
  block: Block;
  onPatch: (patch: Partial<BlockPayload> & { active?: boolean }) => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const c = catOf(block.cat);

  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 rounded-2xl border p-3 transition-colors ${
        block.active ? "border-white/8 bg-white/[0.02]" : "border-white/6 opacity-45"
      }`}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.fg, boxShadow: `0 0 8px ${c.fg}` }} />
      <input
        value={block.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        aria-label="عنوان بلوک"
        className="w-28 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none sm:w-40"
      />
      <div className="flex items-center gap-1.5" dir="ltr">
        <input
          type="time"
          aria-label="از"
          value={toHHMM(block.fromMin)}
          onChange={(e) => {
            const v = parseHHMM(e.target.value);
            if (v !== null && v !== block.toMin) onPatch({ fromMin: v });
          }}
          className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none focus:border-teal-200/40"
        />
        <span className="text-[10px] text-stone-600">→</span>
        <input
          type="time"
          aria-label="تا"
          value={toHHMM(block.toMin)}
          onChange={(e) => {
            const v = parseHHMM(e.target.value);
            if (v !== null && v !== block.fromMin) onPatch({ toMin: v });
          }}
          className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none focus:border-teal-200/40"
        />
      </div>
      <select
        value={block.cat}
        aria-label="دسته"
        onChange={(e) => onPatch({ cat: e.target.value as CatKey })}
        className="cursor-pointer rounded-xl border border-white/10 bg-ink-900 px-2.5 py-1.5 text-xs font-bold text-stone-100 outline-none"
      >
        {CATS.map((cc) => (
          <option key={cc.key} value={cc.key} className="bg-ink-900">
            {cc.key}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onPatch({ counts: !block.counts })}
        className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold transition-colors ${
          block.counts
            ? "border-teal-200/35 bg-teal-300/10 text-teal-100"
            : "border-white/10 text-stone-500"
        }`}
        title="آیا در امتیاز و تعهد روز حساب شود؟"
      >
        {block.counts ? "جبری" : "اختیاری"}
      </button>
      <button
        type="button"
        onClick={() => onPatch({ active: !block.active })}
        className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-stone-500 transition-colors hover:border-white/25"
      >
        {block.active ? "خاموش" : "روشن"}
      </button>
      <button
        type="button"
        onClick={() => (confirm ? onDelete() : (setConfirm(true), setTimeout(() => setConfirm(false), 3000)))}
        aria-label="حذف بلوک"
        className={`ms-auto grid h-8 cursor-pointer place-items-center rounded-xl transition-all ${
          confirm ? "w-auto bg-rose-400/20 px-2.5 text-[10px] font-extrabold text-rose-200" : "w-8 text-stone-500 hover:bg-rose-400/10 hover:text-rose-300"
        }`}
      >
        {confirm ? "حذف شود؟" : <Trash2 className="size-4" />}
      </button>
    </div>
  );
}

function BlockAdder({ day, onAdd }: { day: number; onAdd: (p: BlockPayload) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("19:30");
  const [cat, setCat] = useState<CatKey>("کلاس");
  const [busy, setBusy] = useState(false);

  async function add() {
    const f = parseHHMM(from);
    const t = parseHHMM(to);
    if (f === null || t === null || f === t || busy) return;
    setBusy(true);
    try {
      await onAdd({ day, fromMin: f, toMin: t, cat, counts: catOf(cat).counts, title: title.trim() });
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/12 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان بلوک تازه…"
        className="w-32 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
      />
      <div className="flex items-center gap-1.5" dir="ltr">
        <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="از" className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none" />
        <span className="text-[10px] text-stone-600">→</span>
        <input type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label="تا" className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none" />
      </div>
      <select value={cat} onChange={(e) => setCat(e.target.value as CatKey)} aria-label="دسته" className="cursor-pointer rounded-xl border border-white/10 bg-ink-900 px-2.5 py-1.5 text-xs font-bold text-stone-100 outline-none">
        {CATS.map((cc) => (
          <option key={cc.key} value={cc.key}>{cc.key}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void add()}
        disabled={busy}
        className="ms-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-l from-teal-300 to-violet-300 px-4 py-2 text-xs font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        <Plus className="size-3.5" />
        افزودن به {WEEKDAY_FA[day]}
      </button>
    </div>
  );
}

/* -------------------------------- mustahabbs -------------------------------- */

function MustahabbRow({
  m,
  onPatch,
  onDelete,
}: {
  m: Mustahabb;
  onPatch: (p: { title?: string; days?: number[]; active?: boolean }) => void;
  onDelete: () => void;
}) {
  const days = mustahabbDays(m);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={`flex flex-wrap items-center gap-2.5 rounded-2xl border p-3 ${m.active ? "border-white/8 bg-white/[0.02]" : "border-white/6 opacity-45"}`}>
      <input
        value={m.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        aria-label="عنوان مستحب"
        className="w-36 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none"
      />
      <div className="flex items-center gap-1">
        {WEEKDAY_FA.map((d, i) => {
          const on = days.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPatch({ days: on ? days.filter((x) => x !== i) : [...days, i].sort() })}
              aria-label={d}
              title={d}
              className={`grid size-7 cursor-pointer place-items-center rounded-lg text-[10px] font-extrabold transition-all ${
                on ? "bg-violet-300/20 text-violet-100" : "bg-white/5 text-stone-600 hover:text-stone-400"
              }`}
            >
              {d.slice(0, 1)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onPatch({ active: !m.active })}
        className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-stone-500 transition-colors hover:border-white/25"
      >
        {m.active ? "خاموش" : "روشن"}
      </button>
      <button
        type="button"
        onClick={() => (confirm ? onDelete() : (setConfirm(true), setTimeout(() => setConfirm(false), 3000)))}
        aria-label="حذف مستحب"
        className={`ms-auto grid h-8 cursor-pointer place-items-center rounded-xl transition-all ${
          confirm ? "w-auto bg-rose-400/20 px-2.5 text-[10px] font-extrabold text-rose-200" : "w-8 text-stone-500 hover:bg-rose-400/10 hover:text-rose-300"
        }`}
      >
        {confirm ? "حذف شود؟" : <Trash2 className="size-4" />}
      </button>
    </div>
  );
}

function MustahabbAdder({ onAdd }: { onAdd: (title: string, days: number[]) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/12 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="مستحب تازه…"
        className="w-36 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
      />
      <div className="flex items-center gap-1">
        {WEEKDAY_FA.map((d, i) => {
          const on = days.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i].sort())}
              className={`grid size-7 cursor-pointer place-items-center rounded-lg text-[10px] font-extrabold transition-all ${
                on ? "bg-violet-300/20 text-violet-100" : "bg-white/5 text-stone-600"
              }`}
            >
              {d.slice(0, 1)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!title.trim() || days.length === 0 || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onAdd(title.trim(), days);
            setTitle("");
          } finally {
            setBusy(false);
          }
        }}
        className="ms-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-l from-violet-300 to-teal-300 px-4 py-2 text-xs font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
      >
        <Plus className="size-3.5" />
        افزودن مستحب
      </button>
    </div>
  );
}

function ChecklistAdder({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        onAdd(t);
        setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="آیتم تازه…"
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
      />
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 px-3.5 py-2 text-xs font-extrabold text-stone-300 transition-colors hover:border-teal-200/40 hover:text-teal-200"
      >
        <Plus className="size-3.5" />
        افزودن
      </button>
    </form>
  );
}

/** بازیابی پشتیبان: انتخاب فایل → پیش‌نمای → جایگزینی تراکنشی */
function ImportButton() {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (parsed.app !== "muhasabat-v2") {
          setMsg("فایل معتبر نیست (امضای muhasabat-v2 لازم است)");
          return;
        }
        setPayload(parsed);
        setCount(
          ["blocks", "routines", "mustahabbs", "daytasks", "checks"].reduce(
            (n, k) => n + (Array.isArray(parsed[k]) ? (parsed[k] as unknown[]).length : 0),
            0,
          ),
        );
        setMsg(null);
      } catch {
        setMsg("خواندن فایل ممکن نشد");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  async function doImport() {
    if (!payload || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("fail");
      window.location.reload();
    } catch {
      setMsg("بازیابی ناموفق بود");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-extrabold text-stone-300 transition-colors hover:border-violet-300/40 hover:text-violet-200">
        <Upload className="size-4" />
        بازیابی از فایل…
        <input type="file" accept="application/json" onChange={onFile} className="hidden" />
      </label>
      {payload ? (
        <button
          type="button"
          onClick={() => void doImport()}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-300/45 bg-violet-300/10 px-4 py-2.5 text-xs font-extrabold text-violet-100 transition-colors hover:bg-violet-300/20 disabled:opacity-50"
        >
          {busy ? "در حال بازیابی…" : `جایگزینی کامل (${fa(count)} رکورد)`}
        </button>
      ) : null}
      {msg ? <span className="text-[11px] font-bold text-rose-300">{msg}</span> : null}
    </span>
  );
}

/* --------------------------- routines & pens ------------------------------- */

function NumField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <span className="mb-1.5 block text-[10px] font-bold text-stone-500">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, Math.round(v))));
        }}
        className="w-full bg-transparent text-center font-sans text-lg font-black tabular-nums text-stone-100 outline-none"
      />
    </label>
  );
}

function RoutineRow({
  r,
  onPatch,
  onDelete,
}: {
  r: Routine;
  onPatch: (p: RoutinePayload & { active?: boolean }) => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  if (r.type === "sleep") {
    return (
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-violet-300/20 bg-violet-300/[0.04] p-3">
        <span className="text-xs font-extrabold text-violet-200">خواب:</span>
        <input
          value={r.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          className="w-36 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none"
        />
        <input
          type="time"
          aria-label="ساعت هدف خواب"
          dir="ltr"
          value={`${String(Math.floor(r.targetClock / 60)).padStart(2, "0")}:${String(r.targetClock % 60).padStart(2, "0")}`}
          onChange={(e) => {
            const v = parseHHMM(e.target.value);
            if (v !== null) onPatch({ targetClock: v });
          }}
          className="rounded-xl border border-white/10 bg-white/4 px-2 py-1.5 font-sans text-xs font-bold text-stone-100 outline-none focus:border-violet-300/40"
        />
        <NumMini label="وزن" value={r.weight} min={1} max={60} onChange={(v) => onPatch({ weight: v })} />
        <p className="text-[10px] font-bold text-stone-600">
          ضرایب پلکانی: به‌موقع ×۱ · تا ۳۰ دقیقه ×۰٫۵ · تا ۶۰ دقیقه ×۰٫۲۵
        </p>
      </div>
    );
  }

  const days = routineDays(r);
  return (
    <div className={`flex flex-wrap items-center gap-2.5 rounded-2xl border p-3 ${r.active ? "border-white/8 bg-white/[0.02]" : "border-white/6 opacity-45"}`}>
      <input
        value={r.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        aria-label="عنوان روتین"
        className="w-36 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none"
      />
      <button
        type="button"
        onClick={() => onPatch({ type: r.type === "check" ? "min" : "check" })}
        title="تغییر نوع: دقیقه‌محور ↔ تیکی"
        className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold transition-colors ${
          r.type === "check"
            ? "border-teal-200/40 bg-teal-300/10 text-teal-100"
            : "border-sky-200/30 bg-sky-300/10 text-sky-100"
        }`}
      >
        {r.type === "check" ? "تیکی ✓" : "دقیقه‌محور"}
      </button>
      {r.type !== "check" ? (
        <NumMini label="هدف (دقیقه)" value={r.targetMin} min={5} max={720} onChange={(v) => onPatch({ targetMin: v })} />
      ) : null}
      <NumMini label="وزن" value={r.weight} min={1} max={60} onChange={(v) => onPatch({ weight: v })} />
      <button
        type="button"
        onClick={() => onPatch({ scope: r.scope === "daily" ? "days" : "daily" })}
        className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold transition-colors ${
          r.scope === "daily"
            ? "border-teal-200/35 bg-teal-300/10 text-teal-100"
            : "border-violet-300/35 bg-violet-300/10 text-violet-100"
        }`}
      >
        {r.scope === "daily" ? "هر روز" : "روزهای خاص"}
      </button>
      {r.scope === "days" ? (
        <div className="flex items-center gap-1">
          {WEEKDAY_FA.map((d, i) => {
            const on = days.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-label={d}
                title={d}
                onClick={() => onPatch({ days: on ? days.filter((x) => x !== i) : [...days, i].sort() })}
                className={`grid size-6 cursor-pointer place-items-center rounded-md text-[9px] font-extrabold transition-all ${
                  on ? "bg-violet-300/20 text-violet-100" : "bg-white/5 text-stone-600"
                }`}
              >
                {d.slice(0, 1)}
              </button>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onPatch({ active: !r.active })}
        className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-stone-500 transition-colors hover:border-white/25"
      >
        {r.active ? "خاموش" : "روشن"}
      </button>
      <button
        type="button"
        aria-label="حذف روتین"
        onClick={() => (confirm ? onDelete() : (setConfirm(true), setTimeout(() => setConfirm(false), 3000)))}
        className={`ms-auto grid h-8 cursor-pointer place-items-center rounded-xl transition-all ${
          confirm ? "w-auto bg-rose-400/20 px-2.5 text-[10px] font-extrabold text-rose-200" : "w-8 text-stone-500 hover:bg-rose-400/10 hover:text-rose-300"
        }`}
      >
        {confirm ? "حذف شود؟" : <Trash2 className="size-4" />}
      </button>
    </div>
  );
}

function NumMini({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1">
      <span className="text-[9px] font-bold text-stone-500">{label}</span>
      <input
        type="number"
        dir="ltr"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, Math.round(v))));
        }}
        className="w-14 bg-transparent text-center font-sans text-xs font-black tabular-nums text-stone-100 outline-none"
      />
    </label>
  );
}

function RoutineAdder({ onAdd }: { onAdd: (p: Required<RoutinePayload>) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/12 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t || busy) return;
        setBusy(true);
        try {
          await onAdd({
            title: t,
            type: "min",
            targetMin: 30,
            targetClock: 0,
            weight: 10,
            scope: "daily",
            days: [0, 1, 2, 3, 4, 5, 6],
          });
          setTitle("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="روتین تازه (۳۰ دقیقه، وزن ۱۰)…"
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-l from-teal-300 to-violet-300 px-4 py-2 text-xs font-extrabold text-ink-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        <Plus className="size-3.5" />
        افزودن روتین
      </button>
    </form>
  );
}

function PenRow({
  p,
  onPatch,
  onDelete,
}: {
  p: Pen;
  onPatch: (patch: Partial<PenPayload>) => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={`flex flex-wrap items-center gap-2.5 rounded-2xl border p-3 ${p.active ? "border-white/8 bg-white/[0.02]" : "border-white/6 opacity-45"}`}>
      <input
        value={p.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        aria-label="عنوان جریمه"
        className="w-40 min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none"
      />
      <NumMini label="سقف (دقیقه)" value={p.targetMin} min={15} max={480} onChange={(v) => onPatch({ targetMin: v })} />
      <NumMini label="جریمه" value={p.points} min={5} max={100} onChange={(v) => onPatch({ points: v })} />
      <button
        type="button"
        onClick={() => onPatch({ active: !p.active })}
        className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-extrabold text-stone-500 transition-colors hover:border-white/25"
      >
        {p.active ? "خاموش" : "روشن"}
      </button>
      <button
        type="button"
        aria-label="حذف جریمه"
        onClick={() => (confirm ? onDelete() : (setConfirm(true), setTimeout(() => setConfirm(false), 3000)))}
        className={`ms-auto grid h-8 cursor-pointer place-items-center rounded-xl transition-all ${
          confirm ? "w-auto bg-rose-400/20 px-2.5 text-[10px] font-extrabold text-rose-200" : "w-8 text-stone-500 hover:bg-rose-400/10 hover:text-rose-300"
        }`}
      >
        {confirm ? "حذف شود؟" : <Trash2 className="size-4" />}
      </button>
    </div>
  );
}

function PrayerAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="inline-flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = v.trim().slice(0, 20);
        if (!n) return;
        onAdd(n);
        setV("");
      }}
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="وقت تازه…"
        className="w-24 rounded-full border border-dashed border-white/15 bg-transparent px-3 py-1.5 text-xs font-bold text-stone-100 outline-none placeholder:text-stone-600 focus:border-teal-200/40"
      />
      <button
        type="submit"
        aria-label="افزودن وقت"
        className="grid size-7 cursor-pointer place-items-center rounded-full border border-white/12 text-stone-400 transition-colors hover:border-teal-200/40 hover:text-teal-200"
      >
        <Plus className="size-3.5" />
      </button>
    </form>
  );
}

function PenAdder({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="relative mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/12 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        onAdd(t);
        setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="جریمه‌ی تازه (سقف ۱۲۰ دقیقه، ۲۵ امتیاز)…"
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-stone-100 outline-none placeholder:text-stone-600"
      />
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 px-3.5 py-2 text-xs font-extrabold text-stone-300 transition-colors hover:border-rose-300/40 hover:text-rose-200"
      >
        <Plus className="size-3.5" />
        افزودن جریمه
      </button>
    </form>
  );
}

/* جدول دو ستونه‌ی [عدد، درصد] — برای ضرایب خواب و جدول بار */
function StepTable({
  icon,
  title,
  hint,
  colA,
  colB,
  rows,
  onChange,
  maxA,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  colA: string;
  colB: string;
  rows: [number, number][];
  onChange: (rows: [number, number][]) => void;
  maxA: number;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2.5">
        {icon}
        <p className="text-xs font-black text-stone-200">{title}</p>
      </div>
      <p className="mt-1 text-[10px] leading-5 text-stone-600">{hint}</p>
      <div className="mt-3 space-y-2">
        {rows.map(([a, b], i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5">
              <span className="text-[9px] font-bold text-stone-500">{colA}</span>
              <input
                type="number"
                dir="ltr"
                value={a}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  const next = rows.map((r, j) => (j === i ? ([Math.max(0, Math.min(maxA, Math.round(v))), r[1]] as [number, number]) : r));
                  onChange(next);
                }}
                className="w-full bg-transparent text-center font-sans text-xs font-black tabular-nums text-stone-100 outline-none"
              />
            </label>
            <span className="text-[10px] text-stone-600">←</span>
            <label className="flex flex-1 items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5">
              <span className="text-[9px] font-bold text-stone-500">{colB}</span>
              <input
                type="number"
                dir="ltr"
                value={b}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  const next = rows.map((r, j) => (j === i ? ([r[0], Math.max(0, Math.min(100, Math.round(v)))] as [number, number]) : r));
                  onChange(next);
                }}
                className="w-full bg-transparent text-center font-sans text-xs font-black tabular-nums text-teal-200 outline-none"
              />
            </label>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...rows, [rows.length === 0 ? 0 : rows[rows.length - 1][0] + 30, 50]])}
          className="cursor-pointer rounded-xl border border-white/10 px-3 py-1.5 text-[10px] font-extrabold text-stone-400 transition-colors hover:border-white/25"
        >
          + پله
        </button>
        {rows.length > 1 ? (
          <button
            type="button"
            onClick={() => onChange(rows.slice(0, -1))}
            className="cursor-pointer rounded-xl border border-white/10 px-3 py-1.5 text-[10px] font-extrabold text-stone-500 transition-colors hover:border-rose-300/30 hover:text-rose-300"
          >
            − حذف آخرین
          </button>
        ) : null}
      </div>
    </div>
  );
}
