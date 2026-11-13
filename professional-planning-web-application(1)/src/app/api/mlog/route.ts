import { db } from "@/db";
import { mlogs } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ثبت اتمیک دلتا برای مستحبات: { mustahabbId, day, delta } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const mustahabbId = Number(body?.mustahabbId);
    const delta = Number(body?.delta);
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;

    if (!Number.isInteger(mustahabbId) || mustahabbId <= 0)
      return Response.json({ error: "مستحب نامعتبر" }, { status: 400 });
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 50)
      return Response.json({ error: "دلتا نامعتبر" }, { status: 400 });
    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });

    const [row] = await db
      .insert(mlogs)
      .values({ mustahabbId, day, count: delta })
      .onConflictDoUpdate({
        target: [mlogs.mustahabbId, mlogs.day],
        set: { count: sql`greatest(0, ${mlogs.count} + excluded.count)` },
      })
      .returning({ id: mlogs.id, mustahabbId: mlogs.mustahabbId, day: mlogs.day, count: mlogs.count });
    return Response.json(row);
  } catch (error) {
    console.error("POST /api/mlog failed:", error);
    return Response.json({ error: "خطا در ثبت" }, { status: 500 });
  }
}
