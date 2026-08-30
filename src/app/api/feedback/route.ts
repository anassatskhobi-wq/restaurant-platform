import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { sendTelegram, formatFeedback } from "@/lib/notify";

// POST /api/feedback — публичный (без авторизации) эндпоинт: гость на
// экране "заказ выдан" ставит оценку 1–5 своему заказу.
//   4–5 → гостю показывается кнопка "отзыв в Google" (наружу), сюда
//         приходит только сама оценка, без сигнала персоналу;
//   1–3 → гость пишет, что не так; оценка и комментарий сохраняются и
//         СРАЗУ уходят персоналу в Telegram — наружу это не выносится.
//
// Одна оценка на заказ: повторная отправка (сначала звёзды, потом
// дописанный комментарий) обновляет ту же строку Feedback.
const MAX_COMMENT = 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : null;
  const rating = Number(body?.rating);
  const comment = (typeof body?.comment === "string" ? body.comment : "")
    .slice(0, MAX_COMMENT)
    .trim();

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1..5" }, { status: 400 });
  }

  // Защита от накрутки: несколько правок оценки по одному заказу — норма,
  // сотни — нет; плюс мягкий лимит на IP.
  const ip = clientIp(request);
  const ipLimit = rateLimit(`feedback:ip:${ip}`, { limit: 20, windowMs: 120_000 });
  const orderLimit = rateLimit(`feedback:order:${orderId}`, { limit: 6, windowMs: 300_000 });
  if (!ipLimit.ok || !orderLimit.ok) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      venueId: true,
      venue: { select: { nameRu: true } },
      table: { select: { label: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  const existing = await prisma.feedback.findUnique({ where: { orderId } });
  const feedback = existing
    ? await prisma.feedback.update({ where: { orderId }, data: { rating, comment } })
    : await prisma.feedback.create({
        data: { orderId, venueId: order.venueId, rating, comment },
      });

  // Сигнал персоналу — только при низкой оценке. Шлём при первой оценке и
  // при изменении оценки/появлении нового текста комментария, но не на
  // каждое перещёлкивание звёзд с одинаковым результатом.
  const shouldNotify =
    rating <= 3 &&
    (!existing || existing.rating !== rating || existing.comment !== comment);
  if (shouldNotify) {
    await sendTelegram(
      formatFeedback({
        venueName: order.venue.nameRu,
        orderNumber: order.orderNumber,
        tableLabel: order.table?.label ?? null,
        rating,
        comment,
      })
    );
  }

  return NextResponse.json({ ok: true, id: feedback.id });
}
