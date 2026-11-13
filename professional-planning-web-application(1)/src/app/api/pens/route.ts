import { db } from "@/db";
import { pens } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** مدیریت جریمه‌ها: POST {id?, title?, targetMin?, points?, active?, delete?} */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const clampI = (v: unknown, mn: number, mx: number, fb: number) => {
      const n = Number(v);
      return Number.isInteger(n) ? Math.min(mx, Math.max(mn, n)) : fb;
    };

    if (body?.id !== undefined) {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0)
        return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });
      if (body.delete === true) {
        await db.delete(pens).where(eq(pens.id, id));
        return Response.json({ ok: true });
      }
      const data: Partial<typeof pens.$inferInsert> = {};
      if (typeof body.title === "string") data.title = body.title.trim().slice(0, 120);
      if (body.targetMin !== undefined) data.targetMin = clampI(body.targetMin, 15, 480, 120);
      if (body.points !== undefined) data.points = clampI(body.points, 5, 100, 25);
      if (typeof body.active === "boolean") data.active = body.active;
      const [updated] = await db.update(pens).set(data).where(eq(pens.id, id)).returning();
      if (!updated) return Response.json({ error: "یافت نشد" }, { status: 404 });
      return Response.json(updated);
    }

    const title = String(body?.title ?? "").trim().slice(0, 120);
    if (!title) return Response.json({ error: "عنوان الزامی است" }, { status: 400 });
    const [created] = await db
      .insert(pens)
      .values({
        title,
        targetMin: clampI(body?.targetMin, 15, 480, 120),
        points: clampI(body?.points, 5, 100, 25),
      })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/pens failed:", error);
    return Response.json({ error: "خطا در مدیریت جریمه" }, { status: 500 });
  }
}
