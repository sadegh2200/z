import { db } from "@/db";
import { blocks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CATS = new Set(["کلاس", "کارگاه", "سوال", "ورزش", "خانه", "شبانه"] as const);
type CatLit = (typeof blocks.$inferInsert)["cat"];
type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ error: "بدنه نامعتبر" }, { status: 400 });

    const data: Partial<typeof blocks.$inferInsert> = {};
    if (body.day !== undefined) {
      const d = Number(body.day);
      if (!Number.isInteger(d) || d < 0 || d > 6)
        return Response.json({ error: "روز نامعتبر" }, { status: 400 });
      data.day = d;
    }
    if (body.fromMin !== undefined || body.toMin !== undefined) {
      const f = Number(body.fromMin);
      const t = Number(body.toMin);
      if (!Number.isInteger(f) || !Number.isInteger(t) || f === t)
        return Response.json({ error: "بازه‌ی ساعت نامعتبر" }, { status: 400 });
      data.fromMin = f;
      data.toMin = t;
    }
    if (CATS.has(body.cat as never)) data.cat = body.cat as CatLit;
    if (typeof body.counts === "boolean") data.counts = body.counts;
    if (typeof body.title === "string") data.title = body.title.trim().slice(0, 80);
    if (typeof body.active === "boolean") data.active = body.active;

    if (Object.keys(data).length === 0)
      return Response.json({ error: "چیزی برای به‌روزرسانی نیست" }, { status: 400 });

    const [updated] = await db.update(blocks).set(data).where(eq(blocks.id, id)).returning();
    if (!updated) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/blocks/[id] failed:", error);
    return Response.json({ error: "خطا در به‌روزرسانی بلوک" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });
    const [removed] = await db.delete(blocks).where(eq(blocks.id, id)).returning({ id: blocks.id });
    if (!removed) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/blocks/[id] failed:", error);
    return Response.json({ error: "خطا در حذف بلوک" }, { status: 500 });
  }
}
