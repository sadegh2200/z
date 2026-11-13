/* بذر کامل «محاسبهٔ نفس ۲» — بلوک‌ها، روتین‌ها، جریمه، مستحبات، نمازها، رفل‌های اقتصادی + تاریخچه. */
const { Pool } = require("pg");

const DEFAULT_BLOCKS = [
  ...[0, 1, 2, 3].flatMap((day) => [
    { day, fromMin: 480, toMin: 720, cat: "کلاس", counts: true, title: "کلاس صبح" },
    { day, fromMin: 840, toMin: 990, cat: "کارگاه", counts: true, title: "کارگاه عملی" },
    { day, fromMin: 1170, toMin: 1260, cat: "سوال", counts: true, title: "سوال و مرور شب" },
    { day, fromMin: 1365, toMin: 1410, cat: "شبانه", counts: true, title: "مرور شبانه" },
  ]),
  { day: 4, fromMin: 480, toMin: 660, cat: "کلاس", counts: true, title: "کلاس صبح" },
  { day: 4, fromMin: 780, toMin: 900, cat: "کارگاه", counts: true, title: "کارگاه" },
  { day: 4, fromMin: 1170, toMin: 1245, cat: "سوال", counts: true, title: "سوال" },
  { day: 4, fromMin: 1080, toMin: 1140, cat: "ورزش", counts: false, title: "ورزش عصر" },
  { day: 4, fromMin: 1290, toMin: 1350, cat: "خانه", counts: false, title: "خانه" },
  { day: 6, fromMin: 540, toMin: 660, cat: "ورزش", counts: false, title: "ورزش سبک" },
  { day: 6, fromMin: 1020, toMin: 1140, cat: "خانه", counts: false, title: "برنامه‌ی خانواده" },
];

const DEFAULT_ROUTINES = [
  { title: "مطالعه و کار علمی", type: "min", targetMin: 180, targetClock: 0, weight: 30, scope: "daily", days: [0,1,2,3,4,5,6] },
  { title: "تمرکز عمیق بدون گوشی", type: "min", targetMin: 90, targetClock: 0, weight: 20, scope: "daily", days: [0,1,2,3,4,5,6] },
  { title: "زبان انگلیسی", type: "min", targetMin: 20, targetClock: 0, weight: 10, scope: "daily", days: [0,1,2,3,4,5,6] },
  { title: "ورزش و تحرک", type: "min", targetMin: 20, targetClock: 0, weight: 10, scope: "daily", days: [0,1,2,3,4,5,6] },
  { title: "خواب به‌موقع", type: "sleep", targetMin: 0, targetClock: 1290, weight: 10, scope: "daily", days: [0,1,2,3,4,5,6] },
  { title: "ورزش باشگاهی", type: "min", targetMin: 60, targetClock: 0, weight: 20, scope: "days", days: [0,3] },
  { title: "بازبینی هفته", type: "min", targetMin: 45, targetClock: 0, weight: 10, scope: "days", days: [5] },
];

const DEFAULT_MUSTAHABBS = [
  { title: "دعای عهد", days: [0,1,2,3,4,5,6] },
  { title: "خواندن زیارت", days: [0,1,2,3,4,5,6] },
  { title: "نماز شب", days: [0,1,2,3,4,5,6] },
  { title: "صدقه", days: [4,6] },
];

const PRAYER_NAMES = ["صبح", "ظهر", "عصر", "مغرب", "عشا"];

const DEFAULT_KV = {
  night: { from: 1260, to: 1439 },
  checklist: [
    { id: "c1", title: "جمع‌بندی و بازبینی هفته" },
    { id: "c2", title: "چیدمان برنامه‌ی هفته‌ی بعد" },
    { id: "c3", title: "یک تفریح برنامه‌ریزی‌شده" },
  ],
  checklistWeek: { weekKey: "", doneIds: [] },
  wallet: { points: 240 },
  tokens: [],
  weekReviews: {},
  lastBackupAt: "",
  a11y: { textScale: 100, contrast: false },
  economy: { walletCap: 180, dayUseCap: 90, debtCap: 30 },
  streakCfg: { thresh: 70, floor: 50 },
  prayerGate: "soft",
  prayerNames: PRAYER_NAMES,
  devotionalPct: 10,
  passesPerMonth: 2,
  weeklyCfg: { minPct: 80, bonusMin: 15 },
  spentToday: { day: "", amount: 0 },
  onboarded: false,
  sleepSteps: [[0, 1], [30, 0.5], [60, 0.25]],
  loads: [[180, 1], [300, 0.9], [420, 0.8], [510, 0.7]],
  dialMarks: true,
  dialTheme: "nafs",
  wakeTime: 245,
  maxTasks: 6,
  planTarget: 120,
  earnMax: 30,
  penCap: 25,
  walletExp: 30,
  adjCap: 15,
  baseMinByDay: [null, null, null, null, null, null, null],
  weights: {
    blockPerHour: 4,
    taskWeightMul: 1.5,
    estAccuracy: 2,
    perPrayer: 3,
    allPrayersBonus: 10,
    perMustahabb: 3,
    allMustahabbBonus: 8,
    chainStep: 4,
    chainMaxSteps: 5,
  },
  homeBand: { from: 840, to: 1020, days: [3] },
  theme: "dark",
  askTime: true,
  quran: false,
  floorMin: 15,
};

const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const wdOf = (d) => (d.getDay() + 1) % 7;

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  });

  const n = (await pool.query("select count(*)::int as n from blocks")).rows[0].n;
  if (n > 0) {
    console.log("already seeded:", n, "blocks");
    await pool.end();
    return;
  }

  const blockRows = [];
  for (const b of DEFAULT_BLOCKS) {
    const r = await pool.query(
      `insert into blocks (day, from_min, to_min, cat, counts, title) values ($1,$2,$3,$4,$5,$6) returning id`,
      [b.day, b.fromMin, b.toMin, b.cat, b.counts, b.title],
    );
    blockRows.push({ id: r.rows[0].id, ...b });
  }
  const routineRows = [];
  for (let i = 0; i < DEFAULT_ROUTINES.length; i += 1) {
    const r0 = DEFAULT_ROUTINES[i];
    const r = await pool.query(
      `insert into routines (title, type, target_min, target_clock, weight, scope, days_json, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [r0.title, r0.type, r0.targetMin, r0.targetClock, r0.weight, r0.scope, JSON.stringify(r0.days), i],
    );
    routineRows.push({ id: r.rows[0].id, ...r0 });
  }
  await pool.query(`insert into pens (title, target_min, points) values ($1,$2,$3)`, [
    "وقفهٔ خارج از برنامه",
    120,
    25,
  ]);
  for (let i = 0; i < DEFAULT_MUSTAHABBS.length; i += 1) {
    const m = DEFAULT_MUSTAHABBS[i];
    await pool.query(`insert into mustahabbs (title, days_json, sort_order) values ($1,$2,$3)`, [
      m.title,
      JSON.stringify(m.days),
      i,
    ]);
  }
  for (const [k, v] of Object.entries(DEFAULT_KV)) {
    await pool.query(`insert into kv (key, value) values ($1,$2)`, [k, JSON.stringify(v)]);
  }

  // برنامه‌های روز — نمونه با تخمین، وزن و زمان اندازه‌گیری‌شده
  const y2 = new Date(now);
  y2.setDate(now.getDate() - 1);
  await pool.query(
    `insert into day_tasks (day, title, est_min, weight, done, billable, elapsed_sec, sort_order) values
     ($1,'حل تست‌های فصل ۳',60,8,true,true,3420,0),
     ($1,'مرور غلط‌های کلیدی',45,6,true,true,2700,1),
     ($2,'شبیه‌سازی آزمون',120,9,false,true,1200,2),
     ($2,'خواندن جزوه‌ی جدید',30,4,false,true,0,3)`,
    [key(y2), key(now)],
  );

  console.log("defaults inserted");

  // تاریخچه‌ی ۱۲ روز اخیر — یک روز +پاس (پنج روز پیش)، بقیه معتبر
  const now = new Date();
  for (let back = 11; back >= 1; back -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - back);
    const day = key(d);
    const wd = wdOf(d);

    if (back === 5) {
      await pool.query(
        `insert into daymeta (day, pass, pass_reason) values ($1, true, $2) on conflict (day) do nothing`,
        [day, "مهمانی ناگهانی"],
      );
      continue;
    }

    const dayBlocks = blockRows.filter((b) => b.day === wd && b.counts);
    let doneMin = 0;
    for (const b of dayBlocks) {
      if ((b.id + back) % 6 === 0) continue;
      const jitter = ((b.id * 13 + back * 7) % 40) - 20;
      const actual = Math.max(20, b.toMin - b.fromMin + jitter);
      doneMin += b.toMin - b.fromMin;
      await pool.query(
        `insert into checks (block_id, day, done, actual_min) values ($1,$2,true,$3)
         on conflict (block_id, day) do update set done = true, actual_min = $3`,
        [b.id, day, actual],
      );
    }

    // روتین‌ها — پیشروی نسبی روزها
    let routineMinTotal = 0;
    let routinePoints = 0;
    for (const r of routineRows) {
      if (r.type === "sleep") continue;
      const due = r.scope === "daily" || r.days.includes(wd);
      if (!due) continue;
      const ratio = 0.5 + (((r.id * 11 + back * 5) % 51) / 100); // ‏۰٫۵ تا ۱
      const mins = Math.round(r.targetMin * Math.min(1, ratio));
      routineMinTotal += mins;
      routinePoints += Math.round(r.weight * Math.min(1, mins / Math.max(1, r.targetMin)));
      await pool.query(
        `insert into rlogs (routine_id, day, minutes) values ($1,$2,$3)
         on conflict (routine_id, day) do update set minutes = $3`,
        [r.id, day, mins],
      );
    }

    // نمازها — بیشتر روزها کامل
    const prayerDone = back % 4 === 0 ? 4 : 5;
    for (let i = 0; i < PRAYER_NAMES.length; i += 1) {
      await pool.query(
        `insert into prayers (day, name, done) values ($1,$2,$3)
         on conflict (day, name) do update set done = $3`,
        [day, PRAYER_NAMES[i], i < prayerDone],
      );
    }

    // خواب نزدیک هدف
    const sleepAt = 1290 + ((back * 17) % 50) - 15;

    const base = Math.round(doneMin / 20) + routinePoints + 10;
    const loadMul = doneMin + routineMinTotal <= 300 ? 1 : 0.9;
    const total = Math.max(0, Math.round(base * loadMul));

    await pool.query(
      `insert into daymeta (day, closed, points_banked, sleep_at, load_factor)
       values ($1, true, $2, $3, $4) on conflict (day) do nothing`,
      [day, total, sleepAt, Math.round(loadMul * 100)],
    );

    if (back % 3 === 0) {
      const b = dayBlocks[back % Math.max(1, dayBlocks.length)];
      await pool.query(`insert into sessions (block_id, routine_id, day, seconds) values ($1,$2,$3,$4)`, [
        b?.id ?? null,
        routineRows[1]?.id ?? null,
        day,
        (45 + back * 3) * 60,
      ]);
    }
  }

  console.log("history seeded. done.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
