import { db } from "@/db";
import { kv, spends } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_KV } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function readKv<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(kv).where(eq(kv.key, key));
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function writeKv(key: string, value: unknown) {
  const v = JSON.stringify(value);
  await db
    .insert(kv)
    .values({ key, value: v })
    .onConflictDoUpdate({ target: kv.key, set: { value: v } });
}

/**
 * ثبت خرج از کیف پول: { day, title, amount, kind? }
 * سقف خرج روز و سقف بدهی سمت سرور اعتبارسنجی می‌شوند.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const day = typeof body?.day === "string" && DAY_RE.test(body.day) ? body.day : null;
    const amount = Number(body?.amount);
    const title = String(body?.title ?? "").trim().slice(0, 120) || "خرج دلخواه";
    const kind = body?.kind === "token" ? "token" : "spend";

    if (!day) return Response.json({ error: "روز نامعتبر" }, { status: 400 });
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000)
      return Response.json({ error: "مبلغ نامعتبر" }, { status: 400 });

    const economy = await readKv("economy", DEFAULT_KV.economy as { walletCap: number; dayUseCap: number; debtCap: number });
    const wallet = await readKv("wallet", { points: 0 });
    const spentToday = await readKv("spentToday", { day: "", amount: 0 });

    const already = spentToday.day === day ? spentToday.amount : 0;
    if (already + amount > economy.dayUseCap)
      return Response.json(
        { error: `سقف خرج امروز ${economy.dayUseCap} امتیاز است (${already} خرج شده)` },
        { status: 400 },
      );
    if (wallet.points - amount < -economy.debtCap)
      return Response.json(
        { error: `سقف بدهی ${economy.debtCap} امتیاز است` },
        { status: 400 },
      );

    const [row] = await db.insert(spends).values({ day, title, amount, kind }).returning();
    const nextWallet = { points: wallet.points - amount };
    await writeKv("wallet", nextWallet);
    await writeKv("spentToday", { day, amount: already + amount });

    return Response.json({ spend: row, wallet: nextWallet.points, spentToday: already + amount });
  } catch (error) {
    console.error("POST /api/spend failed:", error);
    return Response.json({ error: "خطا در ثبت خرج" }, { status: 500 });
  }
}

/** حذف یک خرج (بازگردانی امتیاز) */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0)
      return Response.json({ error: "شناسه نامعتبر" }, { status: 400 });

    const [removed] = await db.delete(spends).where(eq(spends.id, id)).returning();
    if (!removed) return Response.json({ error: "یافت نشد" }, { status: 404 });

    const wallet = await readKv("wallet", { points: 0 });
    const spentToday = await readKv("spentToday", { day: "", amount: 0 });
    const nextWallet = { points: wallet.points + removed.amount };
    await writeKv("wallet", nextWallet);
    if (spentToday.day === removed.day)
      await writeKv("spentToday", {
        day: removed.day,
        amount: Math.max(0, spentToday.amount - removed.amount),
      });

    return Response.json({ ok: true, wallet: nextWallet.points });
  } catch (error) {
    console.error("DELETE /api/spend failed:", error);
    return Response.json({ error: "خطا در حذف خرج" }, { status: 500 });
  }
}
