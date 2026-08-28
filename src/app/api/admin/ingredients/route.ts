import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const venueId = new URL(request.url).searchParams.get("venueId");
  if (!venueId) return NextResponse.json({ error: "venueId is required" }, { status: 400 });

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { venueId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(
    ingredients.map((i) => ({ ...i, pricePerUnit: Number(i.pricePerUnit) }))
  );
}

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.venueId || !body?.name || !body?.unit) {
    return NextResponse.json({ error: "venueId, name and unit are required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { id: body.venueId } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const count = await prisma.ingredient.count({ where: { venueId: body.venueId } });

  const ingredient = await prisma.ingredient.create({
    data: {
      venueId: body.venueId,
      name: body.name,
      // Если название на конкретном языке не передали (например, когда
      // ингредиент создаёт ИИ-помощник) — используем то же значение для
      // всех трёх языков, как и у категорий/блюд при создании.
      nameKa: body.nameKa || body.name,
      nameRu: body.nameRu || body.name,
      nameEn: body.nameEn || body.name,
      unit: body.unit,
      pricePerUnit: body.pricePerUnit ?? 0,
      sortOrder: count,
    },
  });
  return NextResponse.json({ ...ingredient, pricePerUnit: Number(ingredient.pricePerUnit) });
}
