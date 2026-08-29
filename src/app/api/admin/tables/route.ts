import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

// GET /api/admin/tables?venueId=... — список столиков точки (для панели
// "Столики" в админке — каждый со своей QR-ссылкой на гостевое меню).
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

  const tables = await prisma.table.findMany({
    where: { venueId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    tables: tables.map((tb) => ({ id: tb.id, label: tb.label })),
  });
}

// POST /api/admin/tables — создать новый столик (label задаёт персонал —
// например "Стол 5"). QR-код на этот столик собирается на клиенте из
// готовой guest-ссылки /[locale]/menu/[venueSlug]?table=<id>.
export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.venueId !== "string" || typeof body.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "venueId and label are required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { id: body.venueId } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const table = await prisma.table.create({
    data: { venueId: venue.id, label: body.label.trim() },
  });

  return NextResponse.json({ id: table.id, label: table.label });
}
