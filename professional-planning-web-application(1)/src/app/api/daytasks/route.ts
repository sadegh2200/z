import { db } from "@/db";
import { daytasks } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ساخت کار روز: { day, title, estMin, weight, billable } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const title = String(body?.title ?? "").trim().slice(0, 160);
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    if (!title || !day)
      return Response.json({ error: "عنوان و روز الزامی‌اند" }, { status: 400 });

    const clampI = (v: unknown, mn: number, mx: number, fb: number) => {
      const n = Number(v);
      return Number.isInteger(n) ? Math.min(mx, Math.max(mn, n)) : fb;
    };

    const [first] = await db
      .select({ sort: daytasks.sortOrder })
      .from(daytasks)
      .orderBy(asc(daytasks.sortOrder))
      .limit(1);

    const [created] = await db
      .insert(daytasks)
      .values({
        day,
        title,
        estMin: clampI(body?.estMin, 5, 720, 30),
        weight: clampI(body?.weight, 1, 10, 5),
        billable: body?.billable === undefined ? true : Boolean(body.billable),
        sortOrder: (first?.sort ?? 0) - 1,
      })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/daytasks failed:", error);
    return Response.json({ error: "خطا در ساخت کار" }, { status: 500 });
  }
}
