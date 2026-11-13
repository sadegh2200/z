import { db } from "@/db";
import { routines } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const parseId = (raw: string) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ error: "بدنه نامعتبر" }, { status: 400 });

    const data: Partial<typeof routines.$inferInsert> = {};
    if (typeof body.title === "string") {
      const title = body.title.trim().slice(0, 120);
      if (!title) return Response.json({ error: "عنوان خالی است" }, { status: 400 });
      data.title = title;
    }
    const clampI = (v: unknown, mn: number, mx: number) => {
      const n = Number(v);
      return Number.isInteger(n) ? Math.min(mx, Math.max(mn, n)) : null;
    };
    if (body.targetMin !== undefined) {
      const v = clampI(body.targetMin, 5, 720);
      if (v === null) return Response.json({ error: "هدف نامعتبر" }, { status: 400 });
      data.targetMin = v;
    }
    if (body.targetClock !== undefined) {
      const v = clampI(body.targetClock, 0, 1439);
      if (v === null) return Response.json({ error: "ساعت نامعتبر" }, { status: 400 });
      data.targetClock = v;
    }
    if (body.weight !== undefined) {
      const v = clampI(body.weight, 1, 60);
      if (v === null) return Response.json({ error: "وزن نامعتبر" }, { status: 400 });
      data.weight = v;
    }
    if (body.type === "min" || body.type === "sleep" || body.type === "check") data.type = body.type;
    if (body.scope === "daily" || body.scope === "days") data.scope = body.scope;
    if (Array.isArray(body.days))
      data.daysJson = JSON.stringify(
        body.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6),
      );
    if (typeof body.active === "boolean") data.active = body.active;

    if (Object.keys(data).length === 0)
      return Response.json({ error: "چیزی نیست" }, { status: 400 });

    const [updated] = await db.update(routines).set(data).where(eq(routines.id, id)).returning();
    if (!updated) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/routines/[id] failed:", error);
    return Response.json({ error: "خطا" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (!id) return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });
    const [removed] = await db.delete(routines).where(eq(routines.id, id)).returning({ id: routines.id });
    if (!removed) return Response.json({ error: "یافت نشد" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/routines/[id] failed:", error);
    return Response.json({ error: "خطا" }, { status: 500 });
  }
}
