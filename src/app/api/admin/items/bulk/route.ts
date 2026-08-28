import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

type Platform = "menu" | "qr" | "wolt" | "bolt" | "glovo";

const DISCOUNT_FIELD: Record<
  Exclude<Platform, "menu">,
  "discountMenuPercent" | "discountWoltPercent" | "discountBoltPercent" | "discountGlovoPercent"
> = {
  qr: "discountMenuPercent",
  wolt: "discountWoltPercent",
  bolt: "discountBoltPercent",
  glovo: "discountGlovoPercent",
};

type BulkAction =
  | { action: "setPrice"; value: number }
  | { action: "adjustPriceAmount"; value: number }
  | { action: "adjustPricePercent"; value: number }
  | { action: "setAvailable"; value: boolean };

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const itemIds: unknown = body?.itemIds;
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds is required" }, { status: 400 });
  }
  const op = body as BulkAction;
  if (!["setPrice", "adjustPriceAmount", "adjustPricePercent", "setAvailable"].includes(op.action)) {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  // platform: "menu" (базовая цена, одна везде) или "qr"/Wolt/Bolt/Glovo —
  // тогда действие применяется не к priceGel, а к его скидке/наценке (%)
  // для этой площадки (discountMenuPercent/discountWoltPercent/discountBoltPercent/discountGlovoPercent).
  // Отсутствие поля = "menu", для обратной совместимости со старыми вызовами.
  const platform: Platform = ["qr", "wolt", "bolt", "glovo"].includes(body?.platform)
    ? body.platform
    : "menu";

  const items = await prisma.menuItem.findMany({
    where: { id: { in: itemIds as string[] } },
    include: { category: { include: { venue: true } } },
  });

  if (items.length !== itemIds.length) {
    return NextResponse.json({ error: "some items not found" }, { status: 404 });
  }
  for (const item of items) {
    if (!canEditVenue(staff, item.category.venue)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const updated = await prisma.$transaction(
    items.map((item) => {
      if (op.action === "setAvailable") {
        return prisma.menuItem.update({
          where: { id: item.id },
          data: { available: op.value },
        });
      }

      if (platform === "menu") {
        const current = Number(item.priceGel);
        let nextPrice = current;
        if (op.action === "setPrice") nextPrice = op.value;
        if (op.action === "adjustPriceAmount") nextPrice = current + op.value;
        if (op.action === "adjustPricePercent") nextPrice = current * (1 + op.value / 100);
        nextPrice = Math.max(0, Math.round(nextPrice * 100) / 100);

        return prisma.menuItem.update({
          where: { id: item.id },
          data: { priceGel: nextPrice },
        });
      }

      // Скидка/наценка (%) для конкретной площадки. Значение может быть
      // отрицательным — это осознанно: наценка на площадке (цена там
      // выше основной), не только скидка (цена ниже).
      const field = DISCOUNT_FIELD[platform];
      const currentRaw = item[field];
      const current = currentRaw != null ? Number(currentRaw) : 0;
      let nextPercent = current;
      if (op.action === "setPrice") nextPercent = op.value;
      if (op.action === "adjustPriceAmount") nextPercent = current + op.value;
      if (op.action === "adjustPricePercent") nextPercent = current * (1 + op.value / 100);
      nextPercent = Math.round(nextPercent * 100) / 100;

      return prisma.menuItem.update({
        where: { id: item.id },
        data: { [field]: nextPercent },
      });
    })
  );

  return NextResponse.json({
    ok: true,
    items: updated.map((i) => ({
      ...i,
      priceGel: Number(i.priceGel),
      discountMenuPercent: i.discountMenuPercent != null ? Number(i.discountMenuPercent) : null,
      discountWoltPercent: i.discountWoltPercent != null ? Number(i.discountWoltPercent) : null,
      discountBoltPercent: i.discountBoltPercent != null ? Number(i.discountBoltPercent) : null,
      discountGlovoPercent: i.discountGlovoPercent != null ? Number(i.discountGlovoPercent) : null,
    })),
  });
}
