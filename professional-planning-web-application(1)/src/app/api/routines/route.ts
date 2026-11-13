import { db } from "@/db";
import { routines } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const title = String(body?.title ?? "").trim().slice(0, 120);
    if (!title) return Response.json({ error: "عنوان الزامی است" }, { status: 400 });
    const type = body?.type === "sleep" ? "sleep" : body?.type === "check" ? "check" : "min";
    const clampI = (v: unknown, mn: number, mx: number, fb: number) => {
      const n = Number(v);
      return Number.isInteger(n) ? Math.min(mx, Math.max(mn, n)) : fb;
    };
    const targetMin = clampI(body?.targetMin, 5, 720, 30);
    const targetClock = clampI(body?.targetClock, 0, 1439, 1290);
    const weight = clampI(body?.weight, 1, 60, 10);
    const scope = body?.scope === "days" ? "days" : "daily";
    const days = Array.isArray(body?.days)
      ? body.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6)
      : [0, 1, 2, 3, 4, 5, 6];

    const [first] = await db
      .select({ sort: routines.sortOrder })
      .from(routines)
      .orderBy(asc(routines.sortOrder))
      .limit(1);
    const [created] = await db
      .insert(routines)
      .values({
        title,
        type,
        targetMin,
        targetClock,
        weight,
        scope,
        daysJson: JSON.stringify(days),
        sortOrder: (first?.sort ?? 0) - 1,
      })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/routines failed:", error);
    return Response.json({ error: "خطا در ساخت روتین" }, { status: 500 });
  }
}
