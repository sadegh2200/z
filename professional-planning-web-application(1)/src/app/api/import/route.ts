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
} from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

async function resetSeq(table: string) {
  await db.execute(
    sql`select setval(pg_get_serial_sequence(${sql.raw(`"${table}"`)}, 'id'), coalesce((select max(id) from ${sql.raw(`"${table}"`)}), 1))`,
  );
}

/** بازیابی کامل پشتیبان JSON — جایگزینی همه‌ی جداول در یک تراکنش. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || body.app !== "muhasabat-v2")
      return Response.json({ error: "فایل پشتیبان معتبر نیست" }, { status: 400 });

    const b = arr(body.blocks);
    const c = arr(body.checks);
    const r = arr(body.routines);
    const rl = arr(body.rlogs);
    const pen = arr(body.pens);
    const pl = arr(body.plogs);
    const pr = arr(body.prayers);
    const m = arr(body.mustahabbs);
    const ml = arr(body.mlogs);
    const s = arr(body.sessions);
    const dm = arr(body.dayMeta);
    const dt = arr(body.daytasks);
    const kvObj = (body.kv && typeof body.kv === "object" ? body.kv : {}) as Record<string, unknown>;

    await db.transaction(async (tx) => {
      await tx.delete(checks);
      await tx.delete(rlogs);
      await tx.delete(plogs);
      await tx.delete(prayers);
      await tx.delete(mlogs);
      await tx.delete(sessions);
      await tx.delete(daymeta);
      await tx.delete(daytasks);
      await tx.delete(blocks);
      await tx.delete(routines);
      await tx.delete(pens);
      await tx.delete(mustahabbs);

      for (const x of b) await tx.insert(blocks).values(x as never).onConflictDoNothing();
      for (const x of r) await tx.insert(routines).values(x as never).onConflictDoNothing();
      for (const x of pen) await tx.insert(pens).values(x as never).onConflictDoNothing();
      for (const x of m) await tx.insert(mustahabbs).values(x as never).onConflictDoNothing();
      for (const x of c) await tx.insert(checks).values(x as never).onConflictDoNothing();
      for (const x of rl) await tx.insert(rlogs).values(x as never).onConflictDoNothing();
      for (const x of pl) await tx.insert(plogs).values(x as never).onConflictDoNothing();
      for (const x of pr) await tx.insert(prayers).values(x as never).onConflictDoNothing();
      for (const x of ml) await tx.insert(mlogs).values(x as never).onConflictDoNothing();
      for (const x of dt) await tx.insert(daytasks).values(x as never).onConflictDoNothing();
      for (const x of dm) await tx.insert(daymeta).values(x as never).onConflictDoNothing();
      for (const x of s) await tx.insert(sessions).values(x as never).onConflictDoNothing();

      await tx.delete(kv);
      for (const [key, value] of Object.entries(kvObj)) {
        await tx
          .insert(kv)
          .values({ key, value: JSON.stringify(value) })
          .onConflictDoUpdate({ target: kv.key, set: { value: JSON.stringify(value) } });
      }
    });

    // توالی‌های serial را با آی‌دی‌های بازیابی‌شده هم‌راستا کن
    await Promise.all(
      ["blocks", "checks", "routines", "pens", "mustahabbs", "rlogs", "plogs", "prayers", "mlogs", "day_tasks", "sessions"].map(
        (t) => resetSeq(t),
      ),
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/import failed:", error);
    return Response.json({ error: "خطا در بازیابی — ساختار فایل را بررسی کن" }, { status: 500 });
  }
}
