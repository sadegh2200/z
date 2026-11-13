import {
  Clock,
  Dumbbell,
  GraduationCap,
  Home,
  MessageCircleQuestion,
  Moon,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/* ---------------------------------- types ---------------------------------- */

export type CatKey = "کلاس" | "کارگاه" | "سوال" | "ورزش" | "خانه" | "شبانه";

export interface Block {
  id: number;
  day: number; // 0=شنبه .. 6=جمعه
  fromMin: number;
  toMin: number;
  cat: CatKey;
  counts: boolean;
  title: string;
  active: boolean;
}

export interface Check {
  id: number;
  blockId: number;
  day: string;
  done: boolean;
  actualMin: number;
}

export interface Mustahabb {
  id: number;
  title: string;
  daysJson: string;
  active: boolean;
  sortOrder: number;
}

export interface Mlog {
  id: number;
  mustahabbId: number;
  day: string;
  count: number;
}

export interface Session {
  id: number;
  blockId: number | null;
  routineId: number | null;
  day: string;
  seconds: number;
  createdAt: string;
}

/** روتین دقیقه‌محور با وزن */
export interface Routine {
  id: number;
  title: string;
  /** min: دقیقه‌محور · check: تیکی · sleep: ساعت خواب */
  type: "min" | "sleep" | "check";
  targetMin: number;
  targetClock: number;
  weight: number;
  scope: "daily" | "days";
  daysJson: string;
  active: boolean;
  sortOrder: number;
}

export interface Rlog {
  id: number;
  routineId: number;
  day: string;
  minutes: number;
  done: boolean;
}

/** آیا روتین تیکی امروز انجام شده؟ */
export function routineChecked(routineId: number, day: string, rlogs: Rlog[]): boolean {
  return rlogs.some((l) => l.routineId === routineId && l.day === day && l.done);
}

/** جریمه: بیش از هدف ⇒ کسر امتیاز */
export interface Pen {
  id: number;
  title: string;
  targetMin: number;
  points: number;
  active: boolean;
}

export interface Plog {
  id: number;
  penId: number;
  day: string;
  minutes: number;
}

export interface Prayer {
  id: number;
  day: string;
  name: string;
  done: boolean;
  /** اول وقت = کامل */
  onTime: boolean;
}

/**
 * چرخه‌ی سه‌حالته‌ی نماز:
 * نخوانده → اول وقت (کامل) → خوانده ولی نه اول وقت (دیر) → نخوانده
 */
export function cyclePrayer(p: Prayer | undefined): { done: boolean; onTime: boolean } {
  if (!p || !p.done) return { done: true, onTime: true }; // → اول وقت
  if (p.onTime) return { done: true, onTime: false }; // → دیر
  return { done: false, onTime: false }; // → نخوانده
}

/** خرج کیف پول */
export interface Spend {
  id: number;
  day: string;
  title: string;
  amount: number;
  kind: "spend" | "token";
  createdAt: string;
}

/** برنامه‌ی روز — مجزا از روتین‌ها */
export interface DayTask {
  id: number;
  day: string;
  title: string;
  estMin: number;
  /** وزن پاداش ۱ تا ۱۰ */
  weight: number;
  done: boolean;
  billable: boolean;
  elapsedSec: number;
  startedAt: string | null;
  sortOrder: number;
}

/** ثانیه‌های واقعی کار — تایمر ماندگار سرور را هم حساب می‌کند */
export function taskElapsedSec(t: DayTask, now = Date.now()): number {
  if (!t.startedAt) return t.elapsedSec;
  return t.elapsedSec + Math.max(0, Math.floor((now - new Date(t.startedAt).getTime()) / 1000));
}

/** برچسب وزن با تون نسخه‌ی ۱٫۰: ≤۳ کم · ≥۸ سنگین */
export function taskWeightTone(w: number): { label: string; color: string } {
  if (w <= 3) return { label: "سبک", color: "#94A3B8" };
  if (w >= 8) return { label: "سنگین", color: "#FB7185" };
  return { label: "متعادل", color: "#7DD3FC" };
}

export interface DayMeta {
  day: string;
  closed: boolean;
  pass: boolean;
  passReason: string;
  pointsBanked: number;
  sleepAt: number | null;
  loadFactor: number | null; // ×۱۰۰
  weeklyBonus: boolean;
  adjPoints: number;
}

export interface Wallet {
  points: number;
}

export interface Token {
  id: string;
  tier: 7 | 14 | 30;
  label: string;
  desc: string;
  earnedAt: string;
  used: boolean;
}

export interface NightWindow {
  from: number; // minutes
  to: number;
}

export interface WeekChecklistItem {
  id: string;
  title: string;
}

export interface AppState {
  blocks: Block[];
  checks: Check[];
  routines: Routine[];
  rlogs: Rlog[];
  pens: Pen[];
  plogs: Plog[];
  prayers: Prayer[];
  mustahabbs: Mustahabb[];
  mlogs: Mlog[];
  sessions: Session[];
  dayMeta: DayMeta[];
  daytasks: DayTask[];
  spends: Spend[];
  kv: {
    night: NightWindow;
    checklist: WeekChecklistItem[];
    checklistWeek: { weekKey: string; doneIds: string[] };
    wallet: Wallet;
    tokens: Token[];
    weekReviews: Record<string, { mood: "great" | "ok" | "hard"; note: string; at: string }>;
    lastBackupAt: string;
    a11y: { textScale: number; contrast: boolean };
    /** اقتصاد کیف پول */
    economy: { walletCap: number; dayUseCap: number; debtCap: number };
    /** آستانه‌های زنجیره (٪) */
    streakCfg: { thresh: number; floor: number };
    prayerGate: "soft" | "hard";
    prayerNames: string[];
    devotionalPct: number;
    passesPerMonth: number;
    weeklyCfg: { minPct: number; bonusMin: number };
    /** خرج امروز */
    spentToday: { day: string; amount: number };
    onboarded: boolean;
    /** ضرایب خواب: [تأخیر به دقیقه، ضریب] نزولی */
    sleepSteps: [number, number][];
    /** جدول ضریب بار: [حد دقیقه‌ی کار، ضریب] صعودی */
    loads: [number, number][];
    dialMarks: boolean;
    dialTheme: "nafs" | "calm";
    /** ساعت بیداری (دقیقه) — نشانگر روی چرخ */
    wakeTime: number;
    maxTasks: number;
    planTarget: number;
    /** سقف کسب پایه‌ی تعهدات در روز */
    earnMax: number;
    /** سقف مجموع جریمه‌های یک روز */
    penCap: number;
    /** انقضای امتیاز متوقف (روز) */
    walletExp: number;
    /** سقف تعدیل دستی (±) */
    adjCap: number;
    /** کف هدف برنامه‌ی هر روزِ هفته (دقیقه) — null = planTarget */
    baseMinByDay: (number | null)[];
    /** وزن‌های موتور پاداش */
    weights: RewardWeights;
    /** نوار خانه‌ی نیمه‌رنگ روی چرخ */
    homeBand: { from: number; to: number; days: number[] };
    /** تم: تیره / روشن / خودکار */
    theme: "dark" | "light" | "auto";
    /** پرسش زمان بعد از تیک */
    askTime: boolean;
    /** اگر روشن باشد، افزوده‌ی عبادی نیازمند «قرآن»ی خوانده‌شده است */
    quran: boolean;
    /** کف امتیاز روز: هر تلاشی صفر برنمی‌گردد */
    floorMin: number;
  };
}

/* -------------------------------- categories ------------------------------- */

export interface CatMeta {
  key: CatKey;
  fg: string; // accent on dark bg
  ink: string; // deep tone for gradients
  counts: boolean; // دارای تعهد جبری؟
  icon: LucideIcon;
}

export const CATS: CatMeta[] = [
  { key: "کلاس", fg: "#BFD7F0", ink: "#2C4A72", counts: true, icon: GraduationCap },
  { key: "کارگاه", fg: "#DBCBEB", ink: "#463A6B", counts: true, icon: Wrench },
  { key: "سوال", fg: "#B3D8CB", ink: "#1E5748", counts: true, icon: MessageCircleQuestion },
  { key: "ورزش", fg: "#CDE1BA", ink: "#31582B", counts: false, icon: Dumbbell },
  { key: "خانه", fg: "#F8C8D2", ink: "#5A3A46", counts: false, icon: Home },
  { key: "شبانه", fg: "#EFD4A0", ink: "#7A5A20", counts: true, icon: Moon },
];

export const catOf = (key: string): CatMeta =>
  CATS.find((c) => c.key === key) ?? CATS[0];

export const WEEKDAY_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/* --------------------------------- dates ----------------------------------- */

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayKey(): string {
  return dateKey(new Date());
}
export function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
/** شنبه=۰ … جمعه=۶ */
export function weekDayIndex(key: string): number {
  return (new Date(`${key}T12:00:00`).getDay() + 1) % 7;
}
export function weekStartKey(key: string): string {
  return shiftKey(key, -weekDayIndex(key));
}

export const fa = (n: number): string => n.toLocaleString("fa-IR");
export function faClock(min: number): string {
  const h = Math.floor((((min % 1440) + 1440) % 1440) / 60);
  const m = ((min % 60) + 60) % 60;
  return `${fa(h)}:${String(m).padStart(2, "0").replace(/[0-9]/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])}`;
}
export function faDur(min: number): string {
  if (min < 60) return `${fa(min)} دقیقه`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${fa(h)} ساعت` : `${fa(h)} ساعت و ${fa(m)} دقیقه`;
}

const fullFmt = new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" });
const dayMonthFmt = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" });
export const fullDateFa = (d = new Date()) => fullFmt.format(d);
export const dayMonthFa = (key: string) => dayMonthFmt.format(new Date(`${key}T12:00:00`));

export function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return "شب بخیر";
  if (hour < 12) return "صبح بخیر";
  if (hour < 15) return "ظهر بخیر";
  if (hour < 19) return "عصر بخیر";
  return "شب بخیر";
}

/** دقیقه‌های از نیمه‌شب — همین حالا */
export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* ---------------------------------- engine --------------------------------- */

export function blockMinutes(b: Block): number {
  const m = b.toMin - b.fromMin;
  return m > 0 ? m : m < 0 ? 1440 + m : 0; // عبور از نیمه‌شب
}

export function blocksForDay(blocks: Block[], wd: number): Block[] {
  return blocks
    .filter((b) => b.active && b.day === wd)
    .sort((a, b) => a.fromMin - b.fromMin || a.id - b.id);
}

export interface DayScore {
  day: string;
  mandatoryTotal: number;
  mandatoryDone: number;
  plannedMin: number;
  doneMin: number;
  /** جا ریخت‌ها (استثناهای صریح) */
  missed: number;
  missedMin: number;
  ratio: number; // 0..1
  points: number;
  valid: boolean;
  /** زنجیره با کفِ ۵۰٪ یا پاس حفظ می‌شود */
  chainOk: boolean;
  pass: boolean;
  passReason: string;
  closed: boolean;
  pointsBanked: number;
}

export function dayScore(
  day: string,
  blocks: Block[],
  checks: Check[],
  metas: DayMeta[],
  streakCfg: { thresh: number; floor: number } = { thresh: 70, floor: 50 },
): DayScore {
  const wd = weekDayIndex(day);
  const dayBlocks = blocksForDay(blocks, wd).filter((b) => catOf(b.cat).counts && b.counts);
  const meta = metas.find((m) => m.day === day);
  // تعهدات خودکار: انجام‌شدن پیش‌فرض است — فقط «جا ریخت‌ها» (done=false) کم می‌کنند
  const missedSet = new Set(
    checks.filter((c) => c.day === day && c.done === false).map((c) => c.blockId),
  );
  let doneMin = 0;
  let plannedMin = 0;
  let missedMin = 0;
  let missed = 0;
  let mandatoryDone = 0;
  for (const b of dayBlocks) {
    const mins = blockMinutes(b);
    plannedMin += mins;
    if (missedSet.has(b.id)) {
      missed += 1;
      missedMin += mins;
    } else {
      mandatoryDone += 1;
      doneMin += mins;
    }
  }
  const ratio = plannedMin === 0 ? 1 : doneMin / plannedMin;
  const points = Math.round(doneMin / 20) + (ratio >= 1 && plannedMin > 0 ? 10 : 0);
  const pass = meta?.pass ?? false;
  const pct = ratio * 100;
  // روز معتبر: پوشش ≥ آستانه؛ زنجیره: ≥ کف یا پاس
  const isFreeDay = plannedMin === 0;
  const valid =
    (!isFreeDay && pct >= streakCfg.thresh) ||
    (isFreeDay && (meta?.closed ?? false) && !pass);
  const chainOk = (!isFreeDay && pct >= streakCfg.floor) || pass || (isFreeDay && (meta?.closed ?? false) && !pass);
  return {
    ...{ chainOk },
    day,
    mandatoryTotal: dayBlocks.length,
    mandatoryDone,
    plannedMin,
    doneMin,
    missed,
    missedMin,
    ratio,
    points,
    valid,
    pass,
    passReason: meta?.passReason ?? "",
    closed: meta?.closed ?? false,
    pointsBanked: meta?.pointsBanked ?? 0,
  };
}

export type StreakCfg = { thresh: number; floor: number };
const DEFAULT_STREAK: StreakCfg = { thresh: 70, floor: 50 };

export function currentChain(
  blocks: Block[],
  checks: Check[],
  metas: DayMeta[],
  cfg: StreakCfg = DEFAULT_STREAK,
): number {
  // از امروز؛ اگر امروز هنوز تعیین‌تکلیف نشده، از دیروز به عقب
  let cursor = todayKey();
  if (!dayScore(cursor, blocks, checks, metas, cfg).chainOk) cursor = shiftKey(cursor, -1);
  let n = 0;
  while (dayScore(cursor, blocks, checks, metas, cfg).chainOk) {
    n += 1;
    cursor = shiftKey(cursor, -1);
  }
  return n;
}

export function chainHistory(
  blocks: Block[],
  checks: Check[],
  metas: DayMeta[],
  cfg: StreakCfg = DEFAULT_STREAK,
): string[] {
  const days = new Set<string>();
  for (const c of checks) if (c.done) days.add(c.day);
  for (const m of metas) if (m.closed || m.pass) days.add(m.day);
  return [...days].filter((d) => dayScore(d, blocks, checks, metas, cfg).valid).sort();
}

export function bestChain(
  blocks: Block[],
  checks: Check[],
  metas: DayMeta[],
  cfg: StreakCfg = DEFAULT_STREAK,
): number {
  const days = chainHistory(blocks, checks, metas, cfg);
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of days) {
    run = prev && shiftKey(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

/* --------------------------- موتور پاداش v3 ------------------------------- */

/** یک سطر از خط تولید پاداش برای نمایش شفاف در پرده‌ی شب */
export interface OutLine {
  key: string;
  label: string;
  /** ± امتیاز یا ضریب */
  value: number;
  kind: "plus" | "minus" | "mul";
}

/** ضریب بار روز — جدول نسخه‌ی ۱٫۰: هرچه بار سنگین‌تر، ضریب مهربان‌تر */
export const LOAD_STEPS: [number, number][] = [
  [180, 1],
  [300, 0.9],
  [420, 0.8],
  [510, 0.7],
];

export function loadFactorFor(doneMin: number, steps: [number, number][] = LOAD_STEPS): number {
  for (const [limit, f] of steps) {
    if (doneMin <= limit) return f;
  }
  return steps.length > 0 ? steps[steps.length - 1][1] * (2 / 3) : 0.6;
}

/** ضرایب خواب به‌موقع — پلکانی از ساعت هدف (پیش‌فرض نسخه‌ی ۱٫۰) */
export const SLEEP_STEPS: [number, number][] = [
  [0, 1], // تا هدف: ضریب کامل
  [30, 0.5],
  [60, 0.25],
];

export function sleepCoef(
  sleepAt: number,
  targetClock: number,
  steps: [number, number][] = SLEEP_STEPS,
): number {
  const late = sleepAt - targetClock;
  for (const [mins, c] of steps) {
    if (late <= mins) return c;
  }
  return 0;
}

export function routineDays(r: Routine): number[] {
  try {
    const arr = JSON.parse(r.daysJson) as unknown;
    return Array.isArray(arr)
      ? arr.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6)
      : [];
  } catch {
    return [];
  }
}

export function routinesForDay(routines: Routine[], wd: number): Routine[] {
  return routines
    .filter((r) => r.active && (r.scope === "daily" || routineDays(r).includes(wd)))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** دقیقه‌های ثبت‌شده‌ی یک روتین در یک روز: دستی + جلسات تمرکز متصل */
export function routineMinutes(routineId: number, day: string, rlogs: Rlog[], sessions: Session[]): number {
  const manual = rlogs.find((l) => l.routineId === routineId && l.day === day)?.minutes ?? 0;
  const fromFocus = sessions
    .filter((s) => s.routineId === routineId && s.day === day)
    .reduce((n, s) => n + Math.round(s.seconds / 60), 0);
  return manual + fromFocus;
}

/** خروجی کامل یک روز — خط تولید پاداش v3 (دقیق و قابل حسابرسی) */
export interface DayOutcome {
  score: DayScore;
  basePoints: number;
  routinePoints: number;
  loadFactor: number;
  afterLoad: number;
  devotionalBonus: number;
  sleepPoints: number;
  penPenalty: number;
  bonus: number;
  taskPoints: number;
  adjPoints: number;
  total: number;
  cap: number;
  prayerRatio: number; // 0..1
  gated: boolean;
  floorApplied: boolean;
  /* v3 — جزئیات دقیق */
  missPenalty: number; // جریمه‌ی جاماندگی خودکار
  prayerPoints: number; // هر وقت نماز = ۲ امتیاز
  estBonus: number; // بونوس دقت تخمین برنامه‌های روز
  routineOverBonus: number; // مازاد روی هدف روتین‌ها
  chainBoost: number;
  chainDepth: number;
  pointsBeforeMultipliers: number;
  routinesDue: number;
  routinesDone: number;
  musDone: number;
  musDue: number;
  /** خط تولید برای نمایش */
  lines: OutLine[];
}

/** وزن‌های موتور پاداش — همه از تنظیمات قابل کنترل */
export interface RewardWeights {
  /** امتیاز هر ساعت تعهد خودکار */
  blockPerHour: number;
  /** ضریب وزن کارهای روز */
  taskWeightMul: number;
  /** بونوس صداقت تخمین (هر کار) */
  estAccuracy: number;
  /** امتیاز هر وقت نماز */
  perPrayer: number;
  /** بونوس تکمیل همه‌ی نمازها */
  allPrayersBonus: number;
  /** امتیاز هر مستحب */
  perMustahabb: number;
  /** بونوس تکمیل همه‌ی مستحبات */
  allMustahabbBonus: number;
  /** درصد شتاب هر روز زنجیره */
  chainStep: number;
  /** حداکثر پله‌های شتاب */
  chainMaxSteps: number;
}

export const DEFAULT_WEIGHTS: RewardWeights = {
  blockPerHour: 4,
  taskWeightMul: 1.5,
  estAccuracy: 2,
  perPrayer: 3,
  allPrayersBonus: 10,
  perMustahabb: 3,
  allMustahabbBonus: 8,
  chainStep: 4,
  chainMaxSteps: 5,
};

export function computeOutcome(day: string, s: AppState, adj = 0): DayOutcome {
  const wd = weekDayIndex(day);
  const score = dayScore(day, s.blocks, s.checks, s.dayMeta, s.kv.streakCfg);
  const meta = s.dayMeta.find((m) => m.day === day);
  const lines: OutLine[] = [];
  const push = (key: string, label: string, value: number, kind: OutLine["kind"] = "plus") => {
    if (value !== 0) lines.push({ key, label, value, kind });
  };
  const W = s.kv.weights;

  /* ═══ ۱) تعهدات خودکار — «حفظ وضعیت» نه «کسب» ═══
     روان‌شناسی: انجام‌شدن عادی است؛ پاداشش آرام است، اما جا ریختن
     فقط همان سهم را پس می‌گیرد (زیان‌گریزی ملایم، بدون تنبیه مضاعف). */
  const blockUnit = W.blockPerHour / 60; // امتیاز بر دقیقه
  const blockEarned = Math.min(Math.round(score.doneMin * blockUnit), s.kv.earnMax);
  push("base", "تعهدات خودکار", blockEarned);
  const missPenalty = Math.round(score.missedMin * blockUnit);
  push("miss", "جا ریخت تعهد", -missPenalty, "minus");

  /* ═══ ۲) روتین‌ها — پاداش پیوسته با کشش «آخرین قدم» ═══
     منحنی: sqrt-ease تا هدف (قدم‌های اول ارزشمندتر = ضد اهمال‌کاری)
     + پاداش تکمیل (completion bonus) که آخرین ۲۰٪ را شیرین می‌کند. */
  let routinePoints = 0;
  let routineOverBonus = 0;
  let routineMinTotal = 0;
  let routinesDue = 0;
  let routinesDone = 0;
  for (const r of routinesForDay(s.routines, wd)) {
    if (r.type === "sleep") continue;
    routinesDue += 1;
    if (r.type === "check") {
      if (routineChecked(r.id, day, s.rlogs)) {
        routinesDone += 1;
        routinePoints += r.weight;
      }
      continue;
    }
    const mins = routineMinutes(r.id, day, s.rlogs, s.sessions);
    routineMinTotal += mins;
    const ratio = r.targetMin > 0 ? mins / r.targetMin : 0;
    const eased = Math.min(1, Math.sqrt(Math.min(1, ratio))); // 50% زمان ⇒ ~71% امتیاز
    routinePoints += Math.round(r.weight * 0.8 * eased);
    if (ratio >= 1) {
      routinesDone += 1;
      routinePoints += Math.round(r.weight * 0.2); // پاداش تکمیل
      const over = Math.min(1.5, ratio) - 1;
      if (over > 0) routineOverBonus += Math.round(r.weight * 0.2 * (over / 0.5));
    }
  }
  push("routines", "روتین‌ها", routinePoints);
  push("routineOver", "مازاد روی هدف", routineOverBonus);

  /* ═══ ۳) برنامه‌های روز — وزن + صداقت تخمین ═══ */
  let taskPoints = 0;
  let estBonus = 0;
  for (const t of s.daytasks.filter((x) => x.day === day && x.done)) {
    if (t.billable) taskPoints += Math.round(t.weight * W.taskWeightMul);
    if (t.elapsedSec > 0 && t.estMin > 0) {
      const r = t.elapsedSec / 60 / t.estMin;
      if (r >= 0.8 && r <= 1.25) estBonus += W.estAccuracy; // خودشناسی
    }
  }
  push("tasks", "برنامه‌های روز", taskPoints);
  push("est", "صداقت تخمین", estBonus);

  /* ═══ ۴) عبادت‌ها (نماز + مستحبات) — فقط کشش مثبت، بدون گیت ═══ */
  const dayPrayers = s.prayers.filter((p) => p.day === day);
  const prayerDone = dayPrayers.filter((p) => p.done).length;
  const prayerOnTime = dayPrayers.filter((p) => p.done && p.onTime).length;
  const prayerNames = s.kv.prayerNames;
  const prayerRatio = prayerNames.length === 0 ? 1 : prayerDone / prayerNames.length;
  // اول وقت = کامل · دیر = نصف
  let prayerPoints = dayPrayers
    .filter((p) => p.done)
    .reduce((n, p) => n + (p.onTime ? W.perPrayer : Math.max(1, Math.round(W.perPrayer / 2))), 0);
  if (prayerNames.length > 0 && prayerDone === prayerNames.length) {
    // همه خوانده شدند: اگر همه اول وقت ⇒ بونوس کامل، وگرنه نیم‌بونوس
    prayerPoints +=
      prayerOnTime === prayerNames.length
        ? W.allPrayersBonus
        : Math.round(W.allPrayersBonus / 2);
  }
  push(
    "prayers",
    prayerDone === prayerNames.length && prayerNames.length > 0
      ? prayerOnTime === prayerNames.length
        ? `نمازها (همه اول وقت — ${fa(prayerOnTime)} وقت)`
        : `نمازها (${fa(prayerDone)} وقت · ${fa(prayerOnTime)} اول وقت)`
      : `نمازها (${fa(prayerDone)} از ${fa(prayerNames.length)})`,
    prayerPoints,
  );

  const todaysMus = s.mustahabbs.filter((m) => m.active && mustahabbDays(m).includes(wd));
  const musDone = todaysMus.filter((m) =>
    s.mlogs.some((l) => l.mustahabbId === m.id && l.day === day && l.count > 0),
  ).length;
  const allMus = todaysMus.length > 0 && musDone === todaysMus.length;
  const quranOk =
    !s.kv.quran ||
    todaysMus.some(
      (m) => m.title.includes("قرآن") && s.mlogs.some((l) => l.mustahabbId === m.id && l.day === day && l.count > 0),
    );
  let devotionalBonus = musDone * W.perMustahabb;
  if (allMus && quranOk) devotionalBonus += W.allMustahabbBonus;
  push(
    "devo",
    allMus ? `مستحبات (کامل ${fa(musDone)})` : `مستحبات (${fa(musDone)} از ${fa(todaysMus.length)})`,
    devotionalBonus,
  );

  /* ═══ ۵) خواب به‌موقع ═══ */
  const sleepRoutine = s.routines.find((r) => r.type === "sleep" && r.active);
  const sleepPoints =
    sleepRoutine && meta?.sleepAt != null
      ? Math.round(sleepRoutine.weight * sleepCoef(meta.sleepAt, sleepRoutine.targetClock, s.kv.sleepSteps))
      : 0;
  push("sleep", "خواب به‌موقع", sleepPoints);

  /* ═══ سقف واقعی روز (همه‌ی منابع ممکن) ═══ */
  const dueRoutines = routinesForDay(s.routines, wd).filter((r) => r.type !== "sleep");
  const cap =
    Math.min(Math.round(score.plannedMin * blockUnit), s.kv.earnMax) +
    dueRoutines.reduce((n, r) => n + r.weight, 0) +
    s.daytasks
      .filter((t) => t.day === day && t.billable)
      .reduce((n, t) => n + Math.round(t.weight * W.taskWeightMul), 0) +
    prayerNames.length * W.perPrayer +
    W.allPrayersBonus +
    todaysMus.length * W.perMustahabb +
    W.allMustahabbBonus +
    (sleepRoutine?.weight ?? 0);

  /* ═══ ۶) ضرایب کیفی ═══ */
  const raw =
    blockEarned - missPenalty + routinePoints + routineOverBonus + taskPoints + estBonus +
    prayerPoints + devotionalBonus + sleepPoints;
  const pointsBeforeMultipliers = Math.max(0, raw);

  const loadFactor = loadFactorFor(score.doneMin + routineMinTotal, s.kv.loads);
  const afterLoad = Math.round(pointsBeforeMultipliers * loadFactor);
  push("load", `ضریب بار (×${fa(Math.round(loadFactor * 100) / 100)})`, afterLoad - pointsBeforeMultipliers, "minus");

  // شتاب زنجیره — پاداش ثبات، سقف ملایم
  let chainDepth = 0;
  {
    let cursor = shiftKey(day, -1);
    while (
      chainDepth < W.chainMaxSteps &&
      dayScore(cursor, s.blocks, s.checks, s.dayMeta, s.kv.streakCfg).valid
    ) {
      chainDepth += 1;
      cursor = shiftKey(cursor, -1);
    }
  }
  const chainBoost = 1 + (W.chainStep / 100) * chainDepth;
  const afterBoost = Math.round(afterLoad * chainBoost);
  push(
    "boost",
    `شتاب زنجیره (×${fa(Math.round(chainBoost * 100) / 100)} · ${fa(chainDepth)} روز)`,
    afterBoost - afterLoad,
  );

  /* ═══ ۷) اقلام پایانی ═══ */
  let penRaw = 0;
  for (const p of s.pens.filter((x) => x.active)) {
    const used = s.plogs.find((l) => l.penId === p.id && l.day === day)?.minutes ?? 0;
    if (used > p.targetMin) {
      // جریمه‌ی تدریجی: به ازای هر ۳۰ دقیقه فراتر، سهمی از points (نه کل)
      const over = used - p.targetMin;
      penRaw += Math.min(p.points, Math.ceil((over / 30) * (p.points / 2)));
    }
  }
  const penPenalty = Math.min(penRaw, s.kv.penCap);
  push("pen", "جریمه‌ها (تدریجی)", -penPenalty, "minus");

  const bonus = returnBonus(day, s.blocks, s.checks, s.dayMeta);
  push("ret", "بونوس بازگشت", bonus);

  const adjClamped = Math.max(-s.kv.adjCap, Math.min(s.kv.adjCap, Math.round(adj)));

  let total = afterBoost + bonus + adjClamped - penPenalty;

  let floorApplied = false;
  if (total > 0 && total < s.kv.floorMin) {
    total = s.kv.floorMin;
    floorApplied = true;
  }
  if (total < 0) total = 0; // هرگز منفی نمی‌شود — روان‌شناسی امید

  return {
    score,
    basePoints: blockEarned,
    routinePoints,
    loadFactor,
    afterLoad,
    devotionalBonus,
    sleepPoints,
    penPenalty,
    bonus,
    taskPoints,
    adjPoints: adjClamped,
    total,
    cap: Math.max(cap, 1),
    prayerRatio,
    gated: false,
    floorApplied,
    missPenalty,
    prayerPoints,
    estBonus,
    routineOverBonus,
    chainBoost,
    chainDepth,
    pointsBeforeMultipliers,
    routinesDue,
    routinesDone,
    musDone,
    musDue: todaysMus.length,
    lines,
  };
}

/** امتیاز اثرگذار روز: اگر بسته شده بانک‌شده؛ وگرنه خروجی زندهٔ موتور v3. */
export function dayPoints(day: string, s: AppState): number {
  const meta = s.dayMeta.find((m) => m.day === day);
  if (meta?.closed) return meta.pointsBanked;
  if (meta?.pass) return 0;
  return computeOutcome(day, s).total;
}

/** پاس‌های مصرف‌شده در ماه جاری (میلادی کلیدها یکسان‌اند). */
export function passesThisMonth(metas: DayMeta[]): number {
  const ym = todayKey().slice(0, 7);
  return metas.filter((m) => m.pass && m.day.slice(0, 7) === ym).length;
}

/** بونوس بازگشت: +۵ برای روزِ معتبرِ بسته‌شده پس از یک روز نامعتبر (با سابقه). */
export function returnBonus(
  day: string,
  blocks: Block[],
  checks: Check[],
  metas: DayMeta[],
): number {
  const s = dayScore(day, blocks, checks, metas);
  if (!s.valid || !s.closed) return 0;
  const prevKey = shiftKey(day, -1);
  const hasPrev =
    checks.some((c) => c.day === prevKey) || metas.some((m) => m.day === prevKey);
  if (!hasPrev) return 0;
  return dayScore(prevKey, blocks, checks, metas).valid ? 0 : 5;
}

/** امتیاز مؤثر روز = پایه + بونوس بازگشت. */
/** سقف متغیر پاداش روز — با بار جبریِ آن روز تغییر می‌کند. */
export function dailyCap(score: DayScore): number {
  return Math.round(score.plannedMin / 20) + 10;
}

/* ---------------------------------- tokens --------------------------------- */

export const TOKEN_TIERS: Record<number, { label: string; desc: string }> = {
  7: { label: "تفریح بزرگ", desc: "یک تفریح بزرگ: سینما، بیرون غذا، دورهمی — اجرایش کار خودت است." },
  14: { label: "پاداش ویژه", desc: "یک پاداش ویژه: یک خرید دلخواه یا سفر کوچک." },
  30: { label: "تاج ثبات", desc: "یک ماه زنجیره‌ی پیوسته — عادت به خصلت تبدیل شد." },
};

export function earnableTokens(best: number, earned: Token[]): Token[] {
  const out: Token[] = [...earned];
  for (const tier of [7, 14, 30] as const) {
    if (best >= tier && !out.some((t) => t.tier === tier)) {
      const info = TOKEN_TIERS[tier];
      out.push({ id: `t${tier}`, tier, label: info.label, desc: info.desc, earnedAt: todayKey(), used: false });
    }
  }
  return out;
}

/* --------------------------------- helpers --------------------------------- */

export function hhmmLabel(mins: number): string {
  const mm = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}
export function parseHHMM(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = +m[1];
  const mm = +m[2];
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function mustahabbDays(m: Mustahabb): number[] {
  try {
    const arr = JSON.parse(m.daysJson) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6) : [];
  } catch {
    return [];
  }
}

export function secToClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${fa(h)}:${String(m).padStart(2, "0").replace(/[0-9]/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])}:${String(s).padStart(2, "0").replace(/[0-9]/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])}`;
}

export const ClockIcon = Clock;

/** نقل‌قول‌های محاسبه — با روز چرخه‌ای انتخاب می‌شوند */
export const DAY_QUOTES: { text: string; from: string }[] = [
  { text: "حساب نفس قبل از عمل، پایداری در عمل را می‌سازد.", from: "منطق محاسبه" },
  { text: "کسی که هر شب خود را وزن کند، صبح سبک‌تر بیدار می‌شود.", from: "قرنط محاسبه" },
  { text: "مهاجم نفسِ خود باش تا دشمنِ تو نشود.", from: "امام علی (روایت)" },
  { text: "آنچه هر روز می‌دانی، به همان آرامی تغییر می‌کند.", from: "قانون ثبات" },
  { text: "زنجیره کوچکِ امروز، قلعه‌ی شخصیت است.", from: "محاسبهٔ روزانه" },
  { text: "آن‌که خود را نسپارد به حساب، خودش را نمی‌شناسد.", from: "سنت حکمت" },
  { text: "پیروزی آرام: یک تیک دیگر، یک لغزش کمتر.", from: "دفتر امروز" },
];

export function quoteOfDay(day = todayKey()): (typeof DAY_QUOTES)[number] {
  const d = new Date(`${day}T12:00:00`);
  const days = Math.floor(d.getTime() / 86400000);
  return DAY_QUOTES[((days % DAY_QUOTES.length) + DAY_QUOTES.length) % DAY_QUOTES.length];
}
