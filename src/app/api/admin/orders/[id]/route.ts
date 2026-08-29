import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

const ALLOWED_STATUSES = ["NEW", "IN_PROGRESS", "READY", "DONE", "CANCELLED"];

// PATCH /api/admin/orders/[id] — меняет статус одного заказа. Пока это
// единственное, что можно менять в заказе из общей доски.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { venue: true },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, order.venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: body.status },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
