import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

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
  | { action: "setAvailable"; value: boolean }
  // Сброс скидки/наценки на площадке — ставит discount*Percent в null
  // (возвращает к базовой цене priceGel).
  | { action: "resetDiscount" };

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет массовые изменения." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const itemIds: unknown = body?.itemIds;
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds is required" }, { status: 400 });
  }
  const op = body as BulkAction;
  if (
    !["setPrice", "adjustPriceAmount", "adjustPricePercent", "setAvailable", "resetDiscount"].includes(
      op.action
    )
  ) {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  // platform: "menu" (базовая цена, одна везде) или "qr"/Wolt/Bolt/Glovo —
  // тогда действие применяется не к priceGel, а к его скидке/наценке (%)
  // для этой площадки. Отсутствие поля = "menu", для обратной
  // совместимости со старыми вызовами.
  const platform: Platform = ["qr", "wolt", "bolt", "glovo"].includes(body?.platform)
    ? body.platform
    : "menu";

  const ids = itemIds as string[];

  const items = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: { category: { include: { venue: true } } },
  });

  if (items.length !== ids.length) {
    return NextResponse.json({ error: "some items not found" }, { status: 404 });
  }
  for (const item of items) {
    if (!canEditVenue(staff, item.category.venue)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Все ветки ниже — ОДИН запрос к базе на все itemIds разом (updateMany
  // для статичных значений, единый SQL UPDATE с вычислением на стороне
  // базы для "прибавить/умножить"), вместо обновления по одной позиции —
  // так операция над сотнями позиций занимает доли секунды, а не минуты.

  if (op.action === "setAvailable") {
    await prisma.menuItem.updateMany({
      where: { id: { in: ids } },
      data: { available: op.value },
    });
  } else if (op.action === "resetDiscount") {
    if (platform === "menu") {
      return NextResponse.json(
        { error: "resetDiscount is not applicable to platform 'menu'" },
        { status: 400 }
      );
    }
    const field = DISCOUNT_FIELD[platform];
    await prisma.menuItem.updateMany({
      where: { id: { in: ids } },
      data: { [field]: null },
    });
  } else if (op.action === "setPrice") {
    // Одно и то же значение для всех выбранных позиций — updateMany.
    if (platform === "menu") {
      const nextPrice = Math.max(0, Math.round(op.value * 100) / 100);
      await prisma.menuItem.updateMany({
        where: { id: { in: ids } },
        data: { priceGel: nextPrice },
      });
    } else {
      const field = DISCOUNT_FIELD[platform];
      const nextPercent = Math.round(op.value * 100) / 100;
      await prisma.menuItem.updateMany({
        where: { id: { in: ids } },
        data: { [field]: nextPercent },
      });
    }
  } else {
    // adjustPriceAmount / adjustPricePercent — новое значение зависит от
    // ТЕКУЩЕГО значения каждой позиции, поэтому updateMany (статичное
    // значение) не подходит; вместо этого один SQL UPDATE, где новое
    // значение считается прямо в базе на основе старого — тоже один
    // запрос, а не N.
    const idsSql = Prisma.join(ids);
    if (platform === "menu") {
      if (op.action === "adjustPriceAmount") {
        await prisma.$executeRaw`
          UPDATE "MenuItem"
          SET "priceGel" = GREATEST(0, ROUND(("priceGel" + ${op.value})::numeric, 2))
          WHERE id IN (${idsSql})
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "MenuItem"
          SET "priceGel" = GREATEST(0, ROUND(("priceGel" * (1 + ${op.value}::numeric / 100))::numeric, 2))
          WHERE id IN (${idsSql})
        `;
      }
    } else {
      const field = DISCOUNT_FIELD[platform];
      const columnSql = Prisma.raw(`"${field}"`);
      if (op.action === "adjustPriceAmount") {
        await prisma.$executeRaw`
          UPDATE "MenuItem"
          SET ${columnSql} = ROUND((COALESCE(${columnSql}, 0) + ${op.value})::numeric, 2)
          WHERE id IN (${idsSql})
        `;
      } else {
        // adjustPricePercent не применяется к скидке площадки (там само
        // значение уже %) — фронтенд не даёт выбрать эту комбинацию, но
        // на всякий случай возвращаем понятную ошибку, а не молча ничего
        // не делаем.
        return NextResponse.json(
          { error: "adjustPricePercent is not applicable to a discount field" },
          { status: 400 }
        );
      }
    }
  }

  const updated = await prisma.menuItem.findMany({ where: { id: { in: ids } } });

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
