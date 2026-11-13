import { db } from "@/db";
import {
  blocks,
  checks,
  daymeta,
  daytasks,
  kv,
  mlogs,
  mustahabbs,
  pens,
  plogs,
  prayers,
  rlogs,
  routines,
  sessions,
  spends,
} from "@/db/schema";

export const dynamic = "force-dynamic";

const KV_KEYS = new Set([
  "night",
  "checklist",
  "checklistWeek",
  "wallet",
  "tokens",
  "weekReviews",
  "lastBackupAt",
  "a11y",
  "economy",
  "streakCfg",
  "prayerGate",
  "prayerNames",
  "devotionalPct",
  "passesPerMonth",
  "weeklyCfg",
  "spentToday",
  "onboarded",
  "sleepSteps",
  "loads",
  "dialMarks",
  "dialTheme",
  "wakeTime",
  "maxTasks",
  "planTarget",
  "earnMax",
  "penCap",
  "walletExp",
  "adjCap",
  "baseMinByDay",
  "weights",
  "homeBand",
  "theme",
  "askTime",
  "quran",
  "floorMin",
]);

/** کل حالت اپلیکیشن در یک پاس — کلاینت همه‌ی محاسبات را محلی انجام می‌دهد. */
export async function GET() {
  try {
    const [b, c, m, ml, s, dm, kvRows, r, rl, pen, pl, pr, dt, sp] = await Promise.all([
      db.select().from(blocks),
      db.select().from(checks),
      db.select().from(mustahabbs),
      db.select().from(mlogs),
      db.select().from(sessions),
      db.select().from(daymeta),
      db.select().from(kv),
      db.select().from(routines),
      db.select().from(rlogs),
      db.select().from(pens),
      db.select().from(plogs),
      db.select().from(prayers),
      db.select().from(daytasks),
      db.select().from(spends),
    ]);
    const kvObj: Record<string, unknown> = {};
    for (const row of kvRows) {
      try {
        kvObj[row.key] = JSON.parse(row.value);
      } catch {
        /* ignore corrupt row */
      }
    }
    return Response.json({
      blocks: b,
      checks: c,
      routines: r,
      rlogs: rl,
      pens: pen,
      plogs: pl,
      prayers: pr,
      mustahabbs: m,
      mlogs: ml,
      sessions: s,
      dayMeta: dm,
      daytasks: dt,
      spends: sp,
      kv: kvObj,
    });
  } catch (error) {
    console.error("GET /api/state failed:", error);
    return Response.json({ error: "خطا در دریافت حالت" }, { status: 500 });
  }
}

/** ذخیره‌ی یک کلید تنظیمات: { key, value } */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      key?: unknown;
      value?: unknown;
    } | null;
    const key = String(body?.key ?? "");
    if (!KV_KEYS.has(key))
      return Response.json({ error: "کلید نامعتبر" }, { status: 400 });

    const value = JSON.stringify(body?.value ?? null);
    await db
      .insert(kv)
      .values({ key, value })
      .onConflictDoUpdate({ target: kv.key, set: { value } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/state failed:", error);
    return Response.json({ error: "خطا در ذخیره" }, { status: 500 });
  }
}
