import { db } from "@/db";
import { checks } from "@/db/schema";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** تیک/لغو تیک یک بلوک + زمان واقعی (دقیقه): { blockId, day, done, actualMin? } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const blockId = Number(body?.blockId);
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    const done = Boolean(body?.done);
    const actualMin = Number.isInteger(Number(body?.actualMin))
      ? Math.max(0, Math.min(1440, Number(body?.actualMin)))
      : 0;

    if (!Number.isInteger(blockId) || blockId <= 0)
      return Response.json({ error: "بلوک نامعتبر" }, { status: 400 });
    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });

    const [row] = await db
      .insert(checks)
      .values({ blockId, day, done, actualMin })
      .onConflictDoUpdate({
        target: [checks.blockId, checks.day],
        set: { done, actualMin, updatedAt: new Date() },
      })
      .returning();
    return Response.json(row);
  } catch (error) {
    console.error("POST /api/check failed:", error);
    return Response.json({ error: "خطا در ثبت" }, { status: 500 });
  }
}
