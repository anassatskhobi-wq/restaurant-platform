import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

async function loadWithVenue(id: string) {
  return prisma.recipeItem.findUnique({
    where: { id },
    include: { menuItem: { include: { category: { include: { venue: true } } } } },
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const recipeItem = await loadWithVenue(params.id);
  if (!recipeItem) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, recipeItem.menuItem.category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет менять состав блюд." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.quantity == null) return NextResponse.json({ error: "quantity is required" }, { status: 400 });

  try {
    const updated = await prisma.recipeItem.update({
      where: { id: params.id },
      data: { quantity: body.quantity },
    });
    return NextResponse.json({ ...updated, quantity: Number(updated.quantity) });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Эта строка состава уже удалена, обнови страницу." }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const recipeItem = await loadWithVenue(params.id);
  if (!recipeItem) return NextResponse.json({ ok: true });
  if (!canEditVenue(staff, recipeItem.menuItem.category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет менять состав блюд." }, { status: 403 });
  }

  try {
    await prisma.recipeItem.delete({ where: { id: params.id } });
  } catch (err: any) {
    if (err?.code !== "P2025") throw err; // уже удалена — считаем успехом
  }
  return NextResponse.json({ ok: true });
}
