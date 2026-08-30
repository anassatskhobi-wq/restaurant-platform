import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue, canEditMenu } from "@/lib/admin/auth";

// Используется для ссылок на страницы точки на агрегаторах (Wolt/Bolt/
// Glovo) — сохраняются, но никак не синхронизируют цены/наличие с этими
// платформами, это просто хранение ссылок для кнопок в админке. А также
// для aboutText — свободного текста про бренд/точку, который читает
// ИИ-помощник, чтобы отвечать на вопросы про историю заведения.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { id: params.id } });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!canEditMenu(staff)) {
    return NextResponse.json({ error: "Ваша роль не позволяет менять настройки точки." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const updated = await prisma.venue.update({
    where: { id: params.id },
    data: {
      urlWolt: body.urlWolt !== undefined ? body.urlWolt || null : undefined,
      urlBolt: body.urlBolt !== undefined ? body.urlBolt || null : undefined,
      urlGlovo: body.urlGlovo !== undefined ? body.urlGlovo || null : undefined,
      urlFacebook: body.urlFacebook !== undefined ? body.urlFacebook || null : undefined,
      urlInstagram: body.urlInstagram !== undefined ? body.urlInstagram || null : undefined,
      urlMaps: body.urlMaps !== undefined ? body.urlMaps || null : undefined,
      urlGoogleReview: body.urlGoogleReview !== undefined ? body.urlGoogleReview || null : undefined,
      aboutText: body.aboutText !== undefined ? body.aboutText || null : undefined,
    },
  });

  return NextResponse.json(updated);
}
