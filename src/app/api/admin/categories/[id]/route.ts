import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const category = await prisma.menuCategory.findUnique({
    where: { id: params.id },
    include: { venue: true },
  });
  if (!category) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, category.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Позиции этой категории удаляются автоматически (onDelete: Cascade в схеме).
  await prisma.menuCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
