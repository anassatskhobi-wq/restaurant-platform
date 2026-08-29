import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

// GET /api/admin/orders?venueId=... — используется OrdersBoard для
// периодического опроса (каждые ~10 сек) новых заказов/смены статусов.
// Отдаёт последние 100 заказов точки, самые новые первыми.
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

  const [orders, waiterCalls] = await Promise.all([
    prisma.order.findMany({
      where: { venueId },
      orderBy: { orderNumber: "desc" },
      take: 100,
      include: {
        table: { select: { label: true } },
        items: { orderBy: { id: "asc" } },
      },
    }),
    // Необработанные вызовы официанта — показываются на общей доске
    // заказов над списком заказов, самые старые первыми (кто раньше
    // позвал — тот раньше и ждёт).
    prisma.waiterCall.findMany({
      where: { venueId, status: "NEW" },
      orderBy: { createdAt: "asc" },
      include: { table: { select: { label: true } } },
    }),
  ]);

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      locale: o.locale,
      tableLabel: o.table?.label ?? null,
      totalGel: Number(o.totalGel),
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        id: i.id,
        nameSnapshot: i.nameSnapshot,
        priceGel: Number(i.priceGel),
        qty: i.qty,
        // Снимок выбранных допов на момент заказа — персонал видит, что
        // именно выбрал гость (например "+ Острый соус").
        modifiersSnapshot: i.modifiersSnapshot as
          | { groupName: string; optionName: string; priceGel: number }[]
          | null,
      })),
    })),
    waiterCalls: waiterCalls.map((w) => ({
      id: w.id,
      tableLabel: w.table.label,
      reason: w.reason,
      createdAt: w.createdAt.toISOString(),
    })),
  });
}
