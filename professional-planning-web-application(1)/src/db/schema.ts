import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/** بلوک‌های الگوی هفتگی — منبع تعهدات هر روز (شنبه=0 تا جمعه=6). */
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  day: integer("day").notNull(),
  fromMin: integer("from_min").notNull(),
  toMin: integer("to_min").notNull(),
  cat: text("cat", {
    enum: ["کلاس", "کارگاه", "سوال", "ورزش", "خانه", "شبانه"],
  }).notNull(),
  counts: boolean("counts").notNull().default(true),
  title: text("title").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

/** چک روزانه‌ی هر بلوک + زمان واقعی. */
export const checks = pgTable(
  "checks",
  {
    id: serial("id").primaryKey(),
    blockId: integer("block_id")
      .notNull()
      .references(() => blocks.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    done: boolean("done").notNull().default(false),
    actualMin: integer("actual_min").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("checks_block_day_unique").on(t.blockId, t.day)],
);

/** روتین‌ها — عادت‌های دقیقه‌محور با وزن و دامنه (هر روز / روزهای خاص). */
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", { enum: ["min", "sleep", "check"] })
    .notNull()
    .default("min"),
  targetMin: integer("target_min").notNull().default(30),
  /** برای type=sleep: ساعت هدف به دقیقه از نیمه‌شب */
  targetClock: integer("target_clock").notNull().default(1290),
  weight: integer("weight").notNull().default(10),
  scope: text("scope", { enum: ["daily", "days"] })
    .notNull()
    .default("daily"),
  daysJson: text("days_json").notNull().default("[0,1,2,3,4,5,6]"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** پیشروی روزانه‌ی روتین‌ها (دقیقه). */
export const rlogs = pgTable(
  "rlogs",
  {
    id: serial("id").primaryKey(),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    minutes: integer("minutes").notNull().default(0),
    /** برای روتین‌های تیکی */
    done: boolean("done").notNull().default(false),
  },
  (t) => [unique("rlogs_r_day_unique").on(t.routineId, t.day)],
);

/** جریمه‌ها — مثل «وقفهٔ خارج از برنامه»: بیش از هدف ⇒ کسر امتیاز. */
export const pens = pgTable("pens", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  targetMin: integer("target_min").notNull().default(120),
  points: integer("points").notNull().default(25),
  active: boolean("active").notNull().default(true),
});

/** ثبت مصرف جریمه (دقیقه). */
export const plogs = pgTable(
  "plogs",
  {
    id: serial("id").primaryKey(),
    penId: integer("pen_id")
      .notNull()
      .references(() => pens.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    minutes: integer("minutes").notNull().default(0),
  },
  (t) => [unique("plogs_p_day_unique").on(t.penId, t.day)],
);

/** نمازهای هر روز: خوانده نشده / خوانده ولی دیر / اول وقت */
export const prayers = pgTable(
  "prayers",
  {
    id: serial("id").primaryKey(),
    day: date("day", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    done: boolean("done").notNull().default(false),
    /** اول وقت خوانده شد؟ */
    onTime: boolean("on_time").notNull().default(false),
  },
  (t) => [unique("prayers_day_name_unique").on(t.day, t.name)],
);

/** مستحبات — مستقل از امتیاز؛ تکمیل همه ⇒ افزوده‌ی عبادی درصدی. */
export const mustahabbs = pgTable("mustahabbs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  daysJson: text("days_json").notNull().default("[0,1,2,3,4,5,6]"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const mlogs = pgTable(
  "mlogs",
  {
    id: serial("id").primaryKey(),
    mustahabbId: integer("mustahabb_id")
      .notNull()
      .references(() => mustahabbs.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [unique("mlogs_m_day_unique").on(t.mustahabbId, t.day)],
);

/** جلسات تمرکز — می‌تواند به یک روتین هم وصل باشد. */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").references(() => blocks.id, {
    onDelete: "set null",
  }),
  routineId: integer("routine_id").references(() => routines.id, {
    onDelete: "set null",
  }),
  day: date("day", { mode: "string" }).notNull(),
  seconds: integer("seconds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** برنامه‌های روز — جدا از روتین‌ها: عنوان، تخمین دقیقه، وزن ۱..۱۰، تایمر ماندگار. */
export const daytasks = pgTable("day_tasks", {
  id: serial("id").primaryKey(),
  day: date("day", { mode: "string" }).notNull(),
  title: text("title").notNull(),
  estMin: integer("est_min").notNull().default(30),
  weight: integer("weight").notNull().default(5),
  done: boolean("done").notNull().default(false),
  /** اگر خاموش باشد، در امتیاز اثر ندارد */
  billable: boolean("billable").notNull().default(true),
  elapsedSec: integer("elapsed_sec").notNull().default(0),
  /** وقتی تایمر دارد کار می‌کند — سمت سرور ماندگار است */
  startedAt: timestamp("started_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** متا روز: بستن شب، پاس، ساعت خواب، ضریب بار، بونوس هفتگی، تعدیل دستی. */
export const daymeta = pgTable("daymeta", {
  day: date("day", { mode: "string" }).primaryKey(),
  closed: boolean("closed").notNull().default(false),
  pass: boolean("pass").notNull().default(false),
  passReason: text("pass_reason").notNull().default(""),
  pointsBanked: integer("points_banked").notNull().default(0),
  sleepAt: integer("sleep_at"), // دقیقه از نیمه‌شب؛ null = ثبت نشده
  loadFactor: integer("load_factor"), // ×۱۰۰ ذخیره شود
  weeklyBonus: boolean("weekly_bonus").notNull().default(false),
  adjPoints: integer("adj_points").notNull().default(0), // تعدیل دستی (±adjCap)
});

/** خرج‌های کیف پول — دفتر مصرف پاداش. */
export const spends = pgTable("spends", {
  id: serial("id").primaryKey(),
  day: date("day", { mode: "string" }).notNull(),
  title: text("title").notNull().default(""),
  amount: integer("amount").notNull(),
  kind: text("kind", { enum: ["spend", "token"] })
    .notNull()
    .default("spend"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** تنظیمات و کیف پول — کلید/مقدار JSON. */
export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type BlockRow = typeof blocks.$inferSelect;
export type RoutineRow = typeof routines.$inferSelect;
export type PenRow = typeof pens.$inferSelect;
export type DayMetaRow = typeof daymeta.$inferSelect;
