import { DEFAULT_WEIGHTS, type CatKey } from "./core";

export interface SeedBlock {
  day: number;
  fromMin: number;
  toMin: number;
  cat: CatKey;
  counts: boolean;
  title: string;
}

/** الگوی هفتگی پیش‌فرض — برگرفته از تصویر مرجع نسخه‌ی ۱٫۰ (شنبه=۰ … جمعه=۶). */
export const DEFAULT_BLOCKS: SeedBlock[] = [
  // شنبه تا سه‌شنبه
  ...[0, 1, 2, 3].flatMap((day): SeedBlock[] => [
    { day, fromMin: 480, toMin: 720, cat: "کلاس", counts: true, title: "کلاس صبح" },
    { day, fromMin: 840, toMin: 990, cat: "کارگاه", counts: true, title: "کارگاه عملی" },
    { day, fromMin: 1170, toMin: 1260, cat: "سوال", counts: true, title: "سوال و مرور شب" },
    { day, fromMin: 1365, toMin: 1410, cat: "شبانه", counts: true, title: "مرور شبانه" },
  ]),
  // پنجشنبه — نیمه‌وقت
  { day: 4, fromMin: 480, toMin: 660, cat: "کلاس", counts: true, title: "کلاس صبح" },
  { day: 4, fromMin: 780, toMin: 900, cat: "کارگاه", counts: true, title: "کارگاه" },
  { day: 4, fromMin: 1170, toMin: 1245, cat: "سوال", counts: true, title: "سوال" },
  { day: 4, fromMin: 1080, toMin: 1140, cat: "ورزش", counts: false, title: "ورزش عصر" },
  { day: 4, fromMin: 1290, toMin: 1350, cat: "خانه", counts: false, title: "خانه" },
  // جمعه — آزاد
  { day: 6, fromMin: 540, toMin: 660, cat: "ورزش", counts: false, title: "ورزش سبک" },
  { day: 6, fromMin: 1020, toMin: 1140, cat: "خانه", counts: false, title: "برنامه‌ی خانواده" },
];

export const DEFAULT_MUSTAHABBS: { title: string; days: number[] }[] = [
  { title: "دعای عهد", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "تلاوت قرآن", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "نماز شب", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "صدقه", days: [4, 6] },
  { title: "زیارت عاشورا", days: [0, 1, 2, 3, 4, 5] },
];

export const DEFAULT_CHECKLIST = [
  { id: "c1", title: "جمع‌بندی و بازبینی هفته" },
  { id: "c2", title: "چیدمان برنامه‌ی هفته‌ی بعد" },
  { id: "c3", title: "یک تفریح برنامه‌ریزی‌شده" },
];

export const DEFAULT_NIGHT = { from: 1260, to: 1439 }; // ۲۱:۰۰ تا ۲۳:۵۹

/** روتین‌های پیش‌فرض — دقیقاً از defaultCfg نسخه‌ی ۱٫۰ */
export const DEFAULT_ROUTINES = [
  { title: "مطالعه و کار علمی", type: "min", targetMin: 180, targetClock: 0, weight: 30, scope: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "تمرکز عمیق بدون گوشی", type: "min", targetMin: 90, targetClock: 0, weight: 20, scope: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "زبان انگلیسی", type: "min", targetMin: 20, targetClock: 0, weight: 10, scope: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "ورزش و تحرک", type: "min", targetMin: 20, targetClock: 0, weight: 10, scope: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "خواب به‌موقع", type: "sleep", targetMin: 0, targetClock: 1290, weight: 10, scope: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
  { title: "ورزش باشگاهی", type: "min", targetMin: 60, targetClock: 0, weight: 20, scope: "days", days: [0, 3] },
  { title: "بازبینی هفته", type: "min", targetMin: 45, targetClock: 0, weight: 10, scope: "days", days: [5] },
] as const;

/** جریمه‌ی پیش‌فرض — همان «وقفهٔ خارج از برنامه» نسخه‌ی ۱٫۰ */
export const DEFAULT_PENS = [
  { title: "وقفهٔ خارج از برنامه", targetMin: 120, points: 25 },
] as const;

export const DEFAULT_PRAYER_NAMES = ["صبح", "ظهر", "عصر", "مغرب", "عشا"];

export const DEFAULT_KV: Record<string, unknown> = {
  night: DEFAULT_NIGHT,
  checklist: DEFAULT_CHECKLIST,
  checklistWeek: { weekKey: "", doneIds: [] as string[] },
  wallet: { points: 0 },
  tokens: [] as unknown[],
  weekReviews: {} as Record<string, unknown>,
  lastBackupAt: "",
  a11y: { textScale: 100, contrast: false },
  economy: { walletCap: 180, dayUseCap: 90, debtCap: 30 },
  streakCfg: { thresh: 70, floor: 50 },
  prayerGate: "soft",
  prayerNames: DEFAULT_PRAYER_NAMES,
  devotionalPct: 10,
  passesPerMonth: 2,
  weeklyCfg: { minPct: 80, bonusMin: 15 },
  spentToday: { day: "", amount: 0 },
  onboarded: false,
  sleepSteps: [
    [0, 1],
    [30, 0.5],
    [60, 0.25],
  ] as [number, number][],
  loads: [
    [180, 1],
    [300, 0.9],
    [420, 0.8],
    [510, 0.7],
  ] as [number, number][],
  dialMarks: true,
  dialTheme: "nafs",
  wakeTime: 245, // ۴:۰۵
  maxTasks: 6,
  planTarget: 120,
  earnMax: 30,
  penCap: 25,
  walletExp: 30,
  adjCap: 15,
  baseMinByDay: [null, null, null, null, null, null, null] as (number | null)[],
  weights: DEFAULT_WEIGHTS,
  homeBand: { from: 840, to: 1020, days: [3] }, // سه‌شنبه ۱۴ تا ۱۷
  theme: "dark",
  askTime: true,
  quran: false,
  floorMin: 15,
};
