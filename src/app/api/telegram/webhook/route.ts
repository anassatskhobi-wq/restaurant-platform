import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  editTelegramMessage,
  formatNewOrder,
  orderStatusButtons,
  statusLabelRu,
} from "@/lib/notify";

export const dynamic = "force-dynamic";

// Вебхук Telegram — сюда бот присылает нажатия инлайн-кнопок под
// сообщением о заказе: [👨‍🍳 Готовим] / [🔔 Готов] / [✅ Выдан].
// Одно нажатие меняет Order.status и перерисовывает сообщение в группе.
//
// Безопасность: при регистрации вебхука мы задаём секрет, и Telegram
// присылает его в заголовке X-Telegram-Bot-Api-Secret-Token. Если он не
// совпал с переменной окружения TELEGRAM_WEBHOOK_SECRET — тихо отвечаем
// 200 и ничего не делаем (URL узнать можно, секрет — нет). Отдельной
// проверки роли нет: нажать кнопку может только тот, кто уже в рабочей
// группе Telegram, а туда добавляет владелец.
//
// Настройка (один раз, из терминала — подставить свои значения):
//   curl "https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https://<домен>/api/telegram/webhook&secret_token=<СЕКРЕТ>&allowed_updates=[%22callback_query%22]"
// и переменная TELEGRAM_WEBHOOK_SECRET=<СЕКРЕТ> на Vercel.

const ALLOWED_STATUSES = ["NEW", "IN_PROGRESS", "READY", "DONE", "CANCELLED"];

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (
    secret &&
    request.headers.get("x-telegram-bot-api-secret-token") !== secret
  ) {
    return NextResponse.json({ ok: true }); // чужой запрос — игнорируем
  }

  const update = await request.json().catch(() => null);
  const cq = update?.callback_query;
  if (!cq || typeof cq.data !== "string" || typeof cq.id !== "string") {
    return NextResponse.json({ ok: true });
  }

  const [tag, orderId, status] = cq.data.split(":");
  if (tag !== "o" || !orderId || !ALLOWED_STATUSES.includes(status)) {
    await answerCallbackQuery(cq.id, "Не понял кнопку");
    return NextResponse.json({ ok: true });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalGel: true,
      venue: { select: { nameRu: true } },
      table: { select: { label: true } },
      items: {
        select: {
          nameSnapshot: true,
          priceGel: true,
          qty: true,
          modifiersSnapshot: true,
        },
      },
    },
  });
  if (!order) {
    await answerCallbackQuery(cq.id, "Заказ не найден");
    return NextResponse.json({ ok: true });
  }

  if (order.status !== status) {
    await prisma.order.update({ where: { id: order.id }, data: { status } });
  }

  const who = String(cq.from?.first_name || "кто-то").slice(0, 40);
  const now = new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tbilisi",
  });

  await answerCallbackQuery(cq.id, `Статус: ${statusLabelRu(status)}`);

  const msg = cq.message;
  if (msg?.chat?.id && typeof msg.message_id === "number") {
    const text = formatNewOrder({
      venueName: order.venue.nameRu,
      orderNumber: order.orderNumber,
      tableLabel: order.table?.label ?? null,
      totalGel: Number(order.totalGel),
      lines: order.items.map((l) => ({
        nameSnapshot: l.nameSnapshot,
        priceGel: Number(l.priceGel),
        qty: l.qty,
        modifiers: Array.isArray(l.modifiersSnapshot)
          ? (l.modifiersSnapshot as { optionName: string }[])
          : [],
      })),
      statusNote: `${statusLabelRu(status)} · ${who} ${now}`,
    });
    // Заказ выдан или отменён — кнопки больше не нужны, убираем их.
    const keyboard =
      status === "DONE" || status === "CANCELLED"
        ? undefined
        : orderStatusButtons(order.id);
    await editTelegramMessage(msg.chat.id, msg.message_id, text, keyboard);
  }

  return NextResponse.json({ ok: true });
}
