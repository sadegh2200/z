import { db } from "@/db";
import { daymeta } from "@/db/schema";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * متا روز: { day, action: "close" | "pass" | "unpass", reason?, points? }
 * close → بستن شب و واریز امتیاز به کیف پول
 * pass → پاس با دلیل (زنجیره حفظ می‌شود، روز معتبر اضافه نمی‌شود)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    const action = String(body?.action ?? "");
    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });
    if (!["close", "pass", "unpass"].includes(action))
      return Response.json({ error: "کنش نامعتبر" }, { status: 400 });

    const patch =
      action === "close"
        ? {
            closed: true,
            pointsBanked: Math.max(0, Math.min(100000, Number(body?.points) || 0)),
          }
        : action === "pass"
          ? { pass: true, passReason: String(body?.reason ?? "").trim().slice(0, 200) }
          : { pass: false, passReason: "" };

    const [row] = await db
      .insert(daymeta)
      .values({ day, ...patch })
      .onConflictDoUpdate({ target: daymeta.day, set: patch })
      .returning();
    return Response.json(row);
  } catch (error) {
    console.error("POST /api/daymeta failed:", error);
    return Response.json({ error: "خطا در ثبت وضعیت روز" }, { status: 500 });
  }
}
