import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/orders/[id] — публичный (без авторизации) эндпоинт, которым
// страница гостя опрашивает статус СВОЕГО заказа после оформления.
// Безопасно без авторизации, потому что:
//  - id заказа — это cuid (непредсказуемый, не перебираемый);
//  - тут нет листинга/поиска заказов — только получение одного по
//    точному id, который есть только у самого гостя (был возвращён при
//    оформлении и сохранён у него в localStorage);
//  - отдаём только то, что гостю и так известно (свой же заказ).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalGel: Number(order.totalGel),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      nameSnapshot: i.nameSnapshot,
      priceGel: Number(i.priceGel),
      qty: i.qty,
    })),
  });
}
