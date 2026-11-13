import { db } from "@/db";
import { prayers } from "@/db/schema";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** حالت یک وقت نماز: { day, name, done, onTime } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    const name = String(body?.name ?? "").trim().slice(0, 20);
    const done = Boolean(body?.done);
    const onTime = Boolean(body?.onTime) && done;
    if (!day || !name)
      return Response.json({ error: "ورودی نامعتبر" }, { status: 400 });

    const [row] = await db
      .insert(prayers)
      .values({ day, name, done, onTime })
      .onConflictDoUpdate({ target: [prayers.day, prayers.name], set: { done, onTime } })
      .returning();
    return Response.json(row);
  } catch (error) {
    console.error("POST /api/prayer failed:", error);
    return Response.json({ error: "خطا در ثبت نماز" }, { status: 500 });
  }
}
