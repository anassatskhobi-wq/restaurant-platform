import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu, isAvailabilityOnlyPatch } from "@/lib/admin/auth";

async function loadIngredientWithVenue(id: string) {
  return prisma.ingredient.findUnique({ where: { id }, include: { venue: true } });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ingredient = await loadIngredientWithVenue(params.id);
  if (!ingredient) {
    return NextResponse.json(
      { error: "Этот ингредиент уже удалён из базы, обнови страницу." },
      { status: 404 }
    );
  }
  if (!canEditVenue(staff, ingredient.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // OPERATOR может здесь только включать/выключать ингредиент (тело строго
  // { available: boolean }). Цена, единица, названия — только OWNER/STAFF.
  if (!canEditMenu(staff) && !isAvailabilityOnlyPatch(body)) {
    return NextResponse.json(
      { error: "Ваша роль позволяет только менять наличие ингредиента." },
      { status: 403 }
    );
  }

  try {
    const updated = await prisma.ingredient.update({
      where: { id: params.id },
      data: {
        name: body.name,
        nameKa: body.nameKa,
        nameRu: body.nameRu,
        nameEn: body.nameEn,
        unit: body.unit,
        pricePerUnit: body.pricePerUnit,
        available: body.available,
      },
    });
    return NextResponse.json({ ...updated, pricePerUnit: Number(updated.pricePerUnit) });
  } catch (err: any) {
    // P2025 = запись уже была удалена (например, кто-то удалил её в
    // другой вкладке) — не роняем сервер, просто сообщаем понятно.
    if (err?.code === "P2025") {
      return NextResponse.json(
        { error: "Этот ингредиент уже удалён из базы, обнови страницу." },
        { status: 404 }
      );
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ingredient = await loadIngredientWithVenue(params.id);
  if (!ingredient) return NextResponse.json({ ok: true });
  if (!canEditVenue(staff, ingredient.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет удалять ингредиенты." }, { status: 403 });
  }

  // Строки состава блюд, где использовался этот ингредиент, удаляются
  // автоматически (onDelete: Cascade в схеме).
  try {
    await prisma.ingredient.delete({ where: { id: params.id } });
  } catch (err: any) {
    if (err?.code !== "P2025") throw err; // уже удалён — считаем успехом
  }
  return NextResponse.json({ ok: true });
}
