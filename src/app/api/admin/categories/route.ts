import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.venueId || !body?.slug) {
    return NextResponse.json({ error: "venueId and slug are required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { id: body.venueId } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const maxSort = await prisma.menuCategory.aggregate({
    where: { venueId: venue.id },
    _max: { sortOrder: true },
  });

  const category = await prisma.menuCategory.create({
    data: {
      venueId: venue.id,
      slug: body.slug,
      nameKa: body.nameKa ?? body.slug,
      nameRu: body.nameRu ?? body.slug,
      nameEn: body.nameEn ?? body.slug,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(category);
}
