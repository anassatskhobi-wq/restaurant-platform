import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

async function loadItemWithVenue(id: string) {
  return prisma.menuItem.findUnique({
    where: { id },
    include: { category: { include: { venue: true } } },
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const item = await loadItemWithVenue(params.id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, item.category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // modifierGroups — если поле пришло в теле, полностью заменяем набор
  // групп/опций этого блюда (проще и надёжнее гранулярного CRUD для
  // маленького списка допов, редактируемого целиком в админке).
  type ModifierOptionInput = {
    nameKa?: string;
    nameRu?: string;
    nameEn?: string;
    priceGel?: number;
  };
  type ModifierGroupInput = {
    nameKa?: string;
    nameRu?: string;
    nameEn?: string;
    selectionType?: string;
    maxSelect?: number;
    options?: ModifierOptionInput[];
  };
  const modifierGroups: ModifierGroupInput[] | undefined = Array.isArray(body.modifierGroups)
    ? body.modifierGroups
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.menuItem.update({
      where: { id: params.id },
      data: {
        nameKa: body.nameKa,
        nameRu: body.nameRu,
        nameEn: body.nameEn,
        descriptionKa: body.descriptionKa,
        descriptionRu: body.descriptionRu,
        descriptionEn: body.descriptionEn,
        priceGel: body.priceGel,
        discountMenuPercent:
          body.discountMenuPercent !== undefined
            ? body.discountMenuPercent === null || body.discountMenuPercent === ""
              ? null
              : body.discountMenuPercent
            : undefined,
        discountWoltPercent:
          body.discountWoltPercent !== undefined
            ? body.discountWoltPercent === null || body.discountWoltPercent === ""
              ? null
              : body.discountWoltPercent
            : undefined,
        discountBoltPercent:
          body.discountBoltPercent !== undefined
            ? body.discountBoltPercent === null || body.discountBoltPercent === ""
              ? null
              : body.discountBoltPercent
            : undefined,
        discountGlovoPercent:
          body.discountGlovoPercent !== undefined
            ? body.discountGlovoPercent === null || body.discountGlovoPercent === ""
              ? null
              : body.discountGlovoPercent
            : undefined,
        available: body.available,
        photoUrl: body.photoUrl,
      },
    });

    if (modifierGroups) {
      // onDelete: Cascade на ModifierOption.group убирает опции вместе с
      // группами — отдельно опции удалять не нужно.
      await tx.modifierGroup.deleteMany({ where: { menuItemId: params.id } });
      for (let gi = 0; gi < modifierGroups.length; gi++) {
        const g = modifierGroups[gi];
        await tx.modifierGroup.create({
          data: {
            menuItemId: params.id,
            nameKa: g.nameKa ?? "",
            nameRu: g.nameRu ?? "",
            nameEn: g.nameEn ?? "",
            selectionType: g.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
            maxSelect: g.maxSelect && g.maxSelect > 0 ? g.maxSelect : 1,
            sortOrder: gi,
            options: {
              create: (g.options ?? []).map((o, oi) => ({
                nameKa: o.nameKa ?? "",
                nameRu: o.nameRu ?? "",
                nameEn: o.nameEn ?? "",
                priceGel: o.priceGel ?? 0,
                sortOrder: oi,
              })),
            },
          },
        });
      }
    }

    return item;
  });

  return NextResponse.json({
    ...updated,
    priceGel: Number(updated.priceGel),
    discountMenuPercent: updated.discountMenuPercent != null ? Number(updated.discountMenuPercent) : null,
    discountWoltPercent: updated.discountWoltPercent != null ? Number(updated.discountWoltPercent) : null,
    discountBoltPercent: updated.discountBoltPercent != null ? Number(updated.discountBoltPercent) : null,
    discountGlovoPercent: updated.discountGlovoPercent != null ? Number(updated.discountGlovoPercent) : null,
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const item = await loadItemWithVenue(params.id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, item.category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.menuItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
