import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

// Принимает новый порядок строк состава ОДНОГО блюда целиком (массив id
// RecipeItem) и проставляет sortOrder = позиция в массиве. Используется
// кнопками "вверх/вниз" у ингредиентов в составе конкретного блюда.
export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.menuItemId || !Array.isArray(body?.orderedIds)) {
    return NextResponse.json({ error: "menuItemId and orderedIds are required" }, { status: 400 });
  }

  const item = await prisma.menuItem.findUnique({
    where: { id: body.menuItemId },
    include: { category: { include: { venue: true } } },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, item.category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$transaction(
    (body.orderedIds as string[]).map((id, index) =>
      prisma.recipeItem.updateMany({
        where: { id, menuItemId: body.menuItemId },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
