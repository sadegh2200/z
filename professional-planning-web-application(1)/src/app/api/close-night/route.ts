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
import { computeOutcome, dayScore, shiftKey, weekStartKey, type AppState } from "@/lib/core";
import { DEFAULT_KV } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadState(): Promise<AppState> {
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
      /* ignore */
    }
  }
  return {
    blocks: b,
    checks: c,
    mustahabbs: m,
    mlogs: ml,
    sessions: s.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })),
    dayMeta: dm,
    routines: r,
    rlogs: rl,
    pens: pen,
    plogs: pl,
    prayers: pr,
    daytasks: dt.map((x) => ({ ...x, startedAt: x.startedAt?.toISOString() ?? null })),
    spends: sp.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })),
    kv: { ...(DEFAULT_KV as object), ...kvObj } as AppState["kv"],
  };
}

/**
 * بستن شب — محاسبه‌ی معتبر سمت سرور:
 * خط تولید کامل: پایه (بلوک‌ها+روتین‌ها) × ضریب بار + افزوده‌ی عبادی + خواب + بونوس بازگشت − جریمه‌ها
 * + بونوس هفتگی جمعه + سقف کیف پول
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });
    const sleepNum = Number(body?.sleepAt);
    const sleepAt = Number.isInteger(sleepNum) && sleepNum >= 0 && sleepNum < 1440 ? sleepNum : null;
    const adjNum = Number(body?.adj);
    const adj = Number.isInteger(adjNum) ? adjNum : 0;

    const state = await loadState();

    // ساعت خواب را پیش از محاسبه روی حالت محلی اعمال کن
    if (sleepAt !== null) {
      const idx = state.dayMeta.findIndex((m) => m.day === day);
      if (idx >= 0) state.dayMeta[idx] = { ...state.dayMeta[idx], sleepAt };
      else
        state.dayMeta.push({
          day,
          closed: false,
          pass: false,
          passReason: "",
          pointsBanked: 0,
          sleepAt,
          loadFactor: null,
          weeklyBonus: false,
          adjPoints: 0,
        });
    }

    const outcome = computeOutcome(day, state, adj);
    const total = Math.max(0, Math.min(outcome.cap * 2, outcome.total)); // سقف سخت ۲برابر سقف متغیر

    // بونوس هفتگی: جمعه + پوشش هفته ≥ آستانه
    let weeklyBonus = 0;
    const start = weekStartKey(day);
    const weekKeys = Array.from({ length: 7 }, (_, i) => shiftKey(start, i));
    const planned = weekKeys.reduce(
      (n, k) => n + dayScore(k, state.blocks, state.checks, state.dayMeta, state.kv.streakCfg).plannedMin,
      0,
    );
    const done = weekKeys.reduce(
      (n, k) => n + dayScore(k, state.blocks, state.checks, state.dayMeta, state.kv.streakCfg).doneMin,
      0,
    );
    const weekPct = planned === 0 ? 0 : (done / planned) * 100;
    if (planned > 0 && weekPct >= state.kv.weeklyCfg.minPct) {
      weeklyBonus = state.kv.weeklyCfg.bonusMin;
    }

    // انقضای کیف پول: اگر به مدت walletExp روز هیچ شب بسته نشده باشد، امتیاز نصف می‌شود
    const lastClosed = state.dayMeta
      .filter((m) => m.closed)
      .map((m) => m.day)
      .sort()
      .pop();
    let expired = false;
    let walletBefore = state.kv.wallet.points;
    if (lastClosed && lastClosed < day) {
      const gapDays =
        (new Date(`${day}T12:00:00`).getTime() - new Date(`${lastClosed}T12:00:00`).getTime()) /
        86400000;
      if (gapDays > state.kv.walletExp) {
        walletBefore = Math.round(walletBefore / 2);
        expired = true;
      }
    }

    const walletAfter = Math.min(
      state.kv.economy.walletCap,
      walletBefore + total + weeklyBonus,
    );

    const [meta] = await db
      .insert(daymeta)
      .values({
        day,
        closed: true,
        pass: false,
        passReason: "",
        pointsBanked: total,
        sleepAt,
        loadFactor: Math.round(outcome.loadFactor * 100),
        weeklyBonus: weeklyBonus > 0,
        adjPoints: outcome.adjPoints,
      })
      .onConflictDoUpdate({
        target: daymeta.day,
        set: {
          closed: true,
          pass: false,
          passReason: "",
          pointsBanked: total,
          sleepAt,
          loadFactor: Math.round(outcome.loadFactor * 100),
          weeklyBonus: weeklyBonus > 0,
          adjPoints: outcome.adjPoints,
        },
      })
      .returning();

    await db
      .insert(kv)
      .values({ key: "wallet", value: JSON.stringify({ points: walletAfter }) })
      .onConflictDoUpdate({
        target: kv.key,
        set: { value: JSON.stringify({ points: walletAfter }) },
      });

    return Response.json({
      meta,
      wallet: walletAfter,
      weeklyBonus,
      weekPct: Math.round(weekPct),
      expired,
      breakdown: {
        basePoints: outcome.basePoints,
        loadFactor: outcome.loadFactor,
        afterLoad: outcome.afterLoad,
        devotionalBonus: outcome.devotionalBonus,
        sleepPoints: outcome.sleepPoints,
        bonus: outcome.bonus,
        taskPoints: outcome.taskPoints,
        penPenalty: outcome.penPenalty,
        total,
        cap: outcome.cap,
      },
    });
  } catch (error) {
    console.error("POST /api/close-night failed:", error);
    return Response.json({ error: "خطا در بستن شب" }, { status: 500 });
  }
}
