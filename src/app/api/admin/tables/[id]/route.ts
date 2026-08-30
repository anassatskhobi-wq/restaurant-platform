import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

// DELETE /api/admin/tables/[id] — удалить столик. Каскадно удаляет и его
// вызовы официанта (WaiterCall.onDelete: Cascade); заказы, у которых был
// проставлен этот tableId, НЕ удаляются — Order.tableId просто теряет
// связь (см. Order.table — необязательная связь без onDelete: Cascade),
// это сохраняет историю заказов даже если стол потом убрали/переименовали.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const table = await prisma.table.findUnique({
    where: { id: params.id },
    include: { venue: true },
  });
  if (!table) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, table.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет удалять столы." }, { status: 403 });
  }

  await prisma.table.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
