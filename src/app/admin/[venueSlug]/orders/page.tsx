import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";
import { OrdersBoard } from "./OrdersBoard";

// Общая живая доска заказов — одна на точку, видна любому сотруднику,
// у которого есть доступ к этой точке (без разделения на кухню/кассу/
// официанта — разрежем на роли позже, когда станет понятно, кто и как
// реально ей пользуется).
export default async function OrdersPage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const staff = await getStaffContext();
  if (!staff) redirect("/admin");

  const venue = await prisma.venue.findUnique({ where: { slug: params.venueSlug } });
  if (!venue) notFound();
  if (!canEditVenue(staff, venue)) redirect("/admin");

  const [orders, waiterCalls] = await Promise.all([
    prisma.order.findMany({
      where: { venueId: venue.id },
      orderBy: { orderNumber: "desc" },
      take: 100,
      include: {
        table: { select: { label: true } },
        items: { orderBy: { id: "asc" } },
      },
    }),
    prisma.waiterCall.findMany({
      where: { venueId: venue.id, status: "NEW" },
      orderBy: { createdAt: "asc" },
      include: { table: { select: { label: true } } },
    }),
  ]);

  const initialOrders = orders.map((o) => ({
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
      modifiersSnapshot: i.modifiersSnapshot as
        | { groupName: string; optionName: string; priceGel: number }[]
        | null,
    })),
  }));

  const initialWaiterCalls = waiterCalls.map((w) => ({
    id: w.id,
    tableLabel: w.table.label,
    reason: w.reason,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <OrdersBoard
      venueId={venue.id}
      venueName={venue.nameRu}
      venueSlug={venue.slug}
      initialOrders={initialOrders}
      initialWaiterCalls={initialWaiterCalls}
    />
  );
}
