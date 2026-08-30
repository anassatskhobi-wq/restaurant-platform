import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.categoryId || !body?.slug) {
    return NextResponse.json({ error: "categoryId and slug are required" }, { status: 400 });
  }

  const category = await prisma.menuCategory.findUnique({
    where: { id: body.categoryId },
    include: { venue: true },
  });
  if (!category) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет менять меню." }, { status: 403 });
  }

  const maxSort = await prisma.menuItem.aggregate({
    where: { categoryId: category.id },
    _max: { sortOrder: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      categoryId: category.id,
      slug: body.slug,
      nameKa: body.nameKa ?? body.slug,
      nameRu: body.nameRu ?? body.slug,
      nameEn: body.nameEn ?? body.slug,
      descriptionKa: body.descriptionKa ?? "",
      descriptionRu: body.descriptionRu ?? "",
      descriptionEn: body.descriptionEn ?? "",
      priceGel: body.priceGel ?? 0,
      available: body.available ?? true,
      photoUrl: body.photoUrl ?? null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ ...item, priceGel: Number(item.priceGel), photoUrl: item.photoUrl ?? "" });
}
