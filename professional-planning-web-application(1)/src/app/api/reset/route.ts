import { db } from "@/db";
import {
  blocks,
  checks,
  daymeta,
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
import {
  DEFAULT_BLOCKS,
  DEFAULT_KV,
  DEFAULT_MUSTAHABBS,
  DEFAULT_PENS,
  DEFAULT_ROUTINES,
} from "@/lib/seed-data";

export const dynamic = "force-dynamic";

/** بازنشانی کامل به الگوی پیش‌فرض (همه‌ی جداول). */
export async function POST() {
  try {
    await db.delete(checks);
    await db.delete(rlogs);
    await db.delete(plogs);
    await db.delete(prayers);
    await db.delete(mlogs);
    await db.delete(sessions);
    await db.delete(daymeta);
    await db.delete(spends);
    await db.delete(blocks);
    await db.delete(routines);
    await db.delete(pens);
    await db.delete(mustahabbs);
    await db.delete(kv);

    await db.insert(blocks).values(DEFAULT_BLOCKS.map((b) => ({ ...b })));
    await db.insert(routines).values(
      DEFAULT_ROUTINES.map((r, i) => ({
        title: r.title,
        type: r.type,
        targetMin: r.targetMin,
        targetClock: r.targetClock,
        weight: r.weight,
        scope: r.scope,
        daysJson: JSON.stringify([...r.days]),
        sortOrder: i,
      })),
    );
    await db.insert(pens).values(DEFAULT_PENS.map((p) => ({ ...p })));
    await db.insert(mustahabbs).values(
      DEFAULT_MUSTAHABBS.map((m, i) => ({
        title: m.title,
        daysJson: JSON.stringify(m.days),
        sortOrder: i,
      })),
    );
    await db
      .insert(kv)
      .values(
        Object.entries(DEFAULT_KV).map(([key, value]) => ({
          key,
          value: JSON.stringify(value),
        })),
      );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/reset failed:", error);
    return Response.json({ error: "خطا در بازنشانی" }, { status: 500 });
  }
}
