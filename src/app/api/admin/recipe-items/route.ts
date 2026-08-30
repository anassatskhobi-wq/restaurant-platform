import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.menuItemId || !body?.ingredientId || body?.quantity == null) {
    return NextResponse.json(
      { error: "menuItemId, ingredientId and quantity are required" },
      { status: 400 }
    );
  }

  const [item, ingredient] = await Promise.all([
    prisma.menuItem.findUnique({
      where: { id: body.menuItemId },
      include: { category: { include: { venue: true } } },
    }),
    prisma.ingredient.findUnique({ where: { id: body.ingredientId } }),
  ]);
  if (!item || !ingredient) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, item.category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (ingredient.venueId !== item.category.venueId) {
    return NextResponse.json({ error: "ingredient belongs to a different venue" }, { status: 400 });
  }
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет менять состав блюд." }, { status: 403 });
  }

  const existingCount = await prisma.recipeItem.count({ where: { menuItemId: body.menuItemId } });

  const recipeItem = await prisma.recipeItem.create({
    data: {
      menuItemId: body.menuItemId,
      ingredientId: body.ingredientId,
      quantity: body.quantity,
      sortOrder: existingCount,
    },
    include: { ingredient: true },
  });
  return NextResponse.json({
    ...recipeItem,
    quantity: Number(recipeItem.quantity),
    ingredient: { ...recipeItem.ingredient, pricePerUnit: Number(recipeItem.ingredient.pricePerUnit) },
  });
}
