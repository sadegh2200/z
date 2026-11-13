import { db } from "@/db";
import { rlogs } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ثبت روتین: { routineId, day, deltaMin } یا تیکی { routineId, day, done } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const routineId = Number(body?.routineId);
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    if (!Number.isInteger(routineId) || routineId <= 0)
      return Response.json({ error: "روتین نامعتبر" }, { status: 400 });
    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });

    // حالت تیکی
    if (typeof body?.done === "boolean") {
      const done = body.done;
      const [row] = await db
        .insert(rlogs)
        .values({ routineId, day, minutes: 0, done })
        .onConflictDoUpdate({ target: [rlogs.routineId, rlogs.day], set: { done } })
        .returning({ id: rlogs.id, routineId: rlogs.routineId, day: rlogs.day, minutes: rlogs.minutes, done: rlogs.done });
      return Response.json(row);
    }

    const deltaMin = Number(body?.deltaMin);
    if (!Number.isInteger(deltaMin) || deltaMin === 0 || Math.abs(deltaMin) > 480)
      return Response.json({ error: "دلتا نامعتبر" }, { status: 400 });

    const [row] = await db
      .insert(rlogs)
      .values({ routineId, day, minutes: deltaMin })
      .onConflictDoUpdate({
        target: [rlogs.routineId, rlogs.day],
        set: { minutes: sql`greatest(0, least(720, ${rlogs.minutes} + excluded.minutes))` },
      })
      .returning({ id: rlogs.id, routineId: rlogs.routineId, day: rlogs.day, minutes: rlogs.minutes, done: rlogs.done });
    return Response.json(row);
  } catch (error) {
    console.error("POST /api/rlog failed:", error);
    return Response.json({ error: "خطا در ثبت" }, { status: 500 });
  }
}
