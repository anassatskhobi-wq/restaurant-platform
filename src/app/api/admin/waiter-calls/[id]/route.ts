import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

// PATCH /api/admin/waiter-calls/[id] — персонал отмечает вызов официанта
// как обработанный ("Принято" на доске заказов). Единственный переход:
// NEW → DONE.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const call = await prisma.waiterCall.findUnique({
    where: { id: params.id },
    include: { venue: true },
  });
  if (!call) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, call.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await prisma.waiterCall.update({
    where: { id: call.id },
    data: { status: "DONE" },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
