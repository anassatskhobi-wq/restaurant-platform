import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

// Принимает новый порядок ингредиентов точки целиком (массив id) и
// проставляет sortOrder = позиция в массиве. Используется кнопками
// "вверх/вниз" в админке — проще и надёжнее, чем менять порядок только
// у двух соседних строк.
export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.venueId || !Array.isArray(body?.orderedIds)) {
    return NextResponse.json({ error: "venueId and orderedIds are required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { id: body.venueId } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет менять порядок." }, { status: 403 });
  }

  await prisma.$transaction(
    (body.orderedIds as string[]).map((id, index) =>
      prisma.ingredient.updateMany({
        where: { id, venueId: body.venueId },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
