import { db } from "@/db";
import { daytasks } from "@/db/schema";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const parseId = (raw: string) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * PATCH — فیلدها: title, estMin, weight, billable, done
 * اکشن‌ها: action=start | stop — تایمر ماندگار سرور (فقط یک تایمر فعال در روز)
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ error: "بدنه نامعتبر" }, { status: 400 });

    const [existing] = await db.select().from(daytasks).where(eq(daytasks.id, id));
    if (!existing) return Response.json({ error: "کار پیدا نشد" }, { status: 404 });

    const data: Partial<typeof daytasks.$inferInsert> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim().slice(0, 160);
      if (!title) return Response.json({ error: "عنوان خالی است" }, { status: 400 });
      data.title = title;
    }
    const clampI = (v: unknown, mn: number, mx: number) => {
      const n = Number(v);
      return Number.isInteger(n) ? Math.min(mx, Math.max(mn, n)) : null;
    };
    if (body.estMin !== undefined) {
      const v = clampI(body.estMin, 5, 720);
      if (v === null) return Response.json({ error: "تخمین نامعتبر" }, { status: 400 });
      data.estMin = v;
    }
    if (body.weight !== undefined) {
      const v = clampI(body.weight, 1, 10);
      if (v === null) return Response.json({ error: "وزن نامعتبر" }, { status: 400 });
      data.weight = v;
    }
    if (typeof body.billable === "boolean") data.billable = body.billable;
    if (typeof body.done === "boolean") data.done = body.done;

    if (body.action === "start") {
      // تک‌تایمر: بقیه‌ی تایمرهای فعال را ببند (ثبت دقیق روی elapsed)
      await db
        .update(daytasks)
        .set({
          startedAt: null,
          elapsedSec: sql`${daytasks.elapsedSec} + greatest(0, extract(epoch from now() - ${daytasks.startedAt})::int)`,
        })
        .where(and(ne(daytasks.id, id), isNotNull(daytasks.startedAt)));
      data.startedAt = new Date();
      data.done = false;
    } else if (body.action === "stop" || data.done === true) {
      if (existing.startedAt) {
        const gained = Math.max(
          0,
          Math.floor((Date.now() - existing.startedAt.getTime()) / 1000),
        );
        data.elapsedSec = existing.elapsedSec + gained;
      }
      data.startedAt = null;
    }

    const [updated] = await db.update(daytasks).set(data).where(eq(daytasks.id, id)).returning();
    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/daytasks/[id] failed:", error);
    return Response.json({ error: "خطا" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });
    const [removed] = await db.delete(daytasks).where(eq(daytasks.id, id)).returning({ id: daytasks.id });
    if (!removed) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/daytasks/[id] failed:", error);
    return Response.json({ error: "خطا" }, { status: 500 });
  }
}
