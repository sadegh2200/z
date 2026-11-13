import { db } from "@/db";
import { plogs } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ثبت مصرف جریمه: { penId, day, deltaMin } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const penId = Number(body?.penId);
    const deltaMin = Number(body?.deltaMin);
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;

    if (!Number.isInteger(penId) || penId <= 0)
      return Response.json({ error: "جریمه نامعتبر" }, { status: 400 });
    if (!Number.isInteger(deltaMin) || deltaMin === 0 || Math.abs(deltaMin) > 480)
      return Response.json({ error: "دلتا نامعتبر" }, { status: 400 });
    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });

    const [row] = await db
      .insert(plogs)
      .values({ penId, day, minutes: deltaMin })
      .onConflictDoUpdate({
        target: [plogs.penId, plogs.day],
        set: { minutes: sql`greatest(0, least(720, ${plogs.minutes} + excluded.minutes))` },
      })
      .returning({ id: plogs.id, penId: plogs.penId, day: plogs.day, minutes: plogs.minutes });
    return Response.json(row);
  } catch (error) {
    console.error("POST /api/plog failed:", error);
    return Response.json({ error: "خطا در ثبت" }, { status: 500 });
  }
}
