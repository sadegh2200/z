import { db } from "@/db";
import { mustahabbs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

    const data: Partial<typeof mustahabbs.$inferInsert> = {};
    if (typeof body.title === "string") {
      const title = body.title.trim().slice(0, 120);
      if (!title) return Response.json({ error: "عنوان خالی است" }, { status: 400 });
      data.title = title;
    }
    if (Array.isArray(body.days)) {
      const days = body.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6);
      data.daysJson = JSON.stringify(days);
    }
    if (typeof body.active === "boolean") data.active = body.active;

    if (Object.keys(data).length === 0)
      return Response.json({ error: "چیزی برای به‌روزرسانی نیست" }, { status: 400 });

    const [updated] = await db.update(mustahabbs).set(data).where(eq(mustahabbs.id, id)).returning();
    if (!updated) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/mustahabbs/[id] failed:", error);
    return Response.json({ error: "خطا در به‌روزرسانی" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });
    const [removed] = await db.delete(mustahabbs).where(eq(mustahabbs.id, id)).returning({ id: mustahabbs.id });
    if (!removed) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/mustahabbs/[id] failed:", error);
    return Response.json({ error: "خطا در حذف" }, { status: 500 });
  }
}
