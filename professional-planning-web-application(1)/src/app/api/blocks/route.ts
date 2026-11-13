import { db } from "@/db";
import { blocks } from "@/db/schema";

export const dynamic = "force-dynamic";

const CATS = new Set(["کلاس", "کارگاه", "سوال", "ورزش", "خانه", "شبانه"] as const);
type CatLit = (typeof blocks.$inferInsert)["cat"];

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const day = Number(body?.day);
    const fromMin = Number(body?.fromMin);
    const toMin = Number(body?.toMin);
    if (!Number.isInteger(day) || day < 0 || day > 6)
      return Response.json({ error: "روز نامعتبر" }, { status: 400 });
    if (!Number.isInteger(fromMin) || !Number.isInteger(toMin) || fromMin === toMin)
      return Response.json({ error: "بازه‌ی ساعت نامعتبر" }, { status: 400 });
    const cat: CatLit = CATS.has(body?.cat as never) ? (body?.cat as CatLit) : "کلاس";
    const counts = body?.counts === undefined ? true : Boolean(body.counts);
    const title = String(body?.title ?? "").trim().slice(0, 80) || cat;

    const [created] = await db
      .insert(blocks)
      .values({ day, fromMin, toMin, cat, counts, title })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/blocks failed:", error);
    return Response.json({ error: "خطا در ساخت بلوک" }, { status: 500 });
  }
}
