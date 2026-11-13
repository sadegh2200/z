import { db } from "@/db";
import { sessions } from "@/db/schema";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ذخیره‌ی جلسه‌ی تمرکز: { blockId?, day, seconds } — بی‌اثر بر امتیاز. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const blockId =
      body?.blockId === null || body?.blockId === undefined
        ? null
        : Number(body.blockId);
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    const seconds = Number(body?.seconds);

    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });
    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 24 * 3600)
      return Response.json({ error: "مدت نامعتبر" }, { status: 400 });
    if (blockId !== null && (!Number.isInteger(blockId) || blockId <= 0))
      return Response.json({ error: "بلوک نامعتبر" }, { status: 400 });

    const [row] = await db
      .insert(sessions)
      .values({ blockId, day, seconds })
      .returning();
    return Response.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/session failed:", error);
    return Response.json({ error: "خطا در ذخیره جلسه" }, { status: 500 });
  }
}
