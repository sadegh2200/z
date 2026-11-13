import { db } from "@/db";
import { mustahabbs } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const title = String(body?.title ?? "").trim().slice(0, 120);
    if (!title) return Response.json({ error: "عنوان الزامی است" }, { status: 400 });
    const days = Array.isArray(body?.days)
      ? body.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6)
      : [0, 1, 2, 3, 4, 5, 6];

    const [first] = await db
      .select({ sort: mustahabbs.sortOrder })
      .from(mustahabbs)
      .orderBy(asc(mustahabbs.sortOrder))
      .limit(1);
    const sortOrder = (first?.sort ?? 0) - 1;

    const [created] = await db
      .insert(mustahabbs)
      .values({ title, daysJson: JSON.stringify(days), sortOrder })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/mustahabbs failed:", error);
    return Response.json({ error: "خطا در ساخت مستحب" }, { status: 500 });
  }
}
