import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/waiter-calls — публичный (без авторизации) эндпоинт: гость на
// странице меню, открытой по QR конкретного столика (?table=...), нажимает
// "Позвать официанта" и выбирает причину. Появляется на общей доске
// заказов /admin/[venueSlug]/orders, пока персонал не отметит "Принято".
const REASONS = new Set(["water", "bill", "help", "other"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.tableId !== "string") {
    return NextResponse.json({ error: "tableId is required" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" && REASONS.has(body.reason) ? body.reason : "other";

  const table = await prisma.table.findUnique({
    where: { id: body.tableId },
    select: { id: true, venueId: true },
  });
  if (!table) {
    return NextResponse.json({ error: "table not found" }, { status: 404 });
  }

  const call = await prisma.waiterCall.create({
    data: {
      venueId: table.venueId,
      tableId: table.id,
      reason,
    },
  });

  return NextResponse.json({ id: call.id, status: call.status });
}
