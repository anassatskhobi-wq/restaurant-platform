import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { sendTelegram, formatNewOrder, orderStatusButtons } from "@/lib/notify";

// STEP 2 — реальные заказы: сохраняем в Postgres через Prisma вместо
// STEP 0/1 заглушки (раньше номер был Math.random() и никуда не писался).
// STEP 7 — добавлены: привязка к столику (QR на столе, dine-in) и платные
// модификаторы (допы/опции) на строку заказа.
// Уведомление персонала (n8n → Telegram) — следующий шаг, сюда пока не
// подключено.
//
// Цену и название каждой позиции пересчитываем на сервере из базы, а не
// берём как есть из тела запроса — иначе гость мог бы в devtools
// подменить priceGel на любое число перед отправкой.

type OrderItemInput = { slug?: unknown; qty?: unknown; optionIds?: unknown };

function effectivePrice(priceGel: number, discountMenuPercent: number | null) {
  return discountMenuPercent != null
    ? priceGel * (1 - discountMenuPercent / 100)
    : priceGel;
}

function nameForLocale(
  item: { nameKa: string; nameRu: string; nameEn: string },
  locale: string
) {
  if (locale === "ka") return item.nameKa;
  if (locale === "en") return item.nameEn;
  return item.nameRu;
}

// Ключ для группировки одинаковых строк корзины: одно и то же блюдо с
// одним и тем же набором выбранных опций — одна строка заказа с qty > 1;
// то же блюдо, но с другим набором опций — отдельная строка.
function lineKey(slug: string, optionIds: string[]) {
  return `${slug}::${[...optionIds].sort().join(",")}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.venueSlug !== "string") {
    return NextResponse.json({ error: "venueSlug is required" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Order must include at least one item" },
      { status: 400 }
    );
  }
  const locale = ["ka", "ru", "en"].includes(body.locale) ? body.locale : "ka";
  const requestedTableId = typeof body.tableId === "string" ? body.tableId : null;

  // Защита от накрутки: эндпоинт публичный (см. src/lib/rateLimit.ts).
  // Строгий лимит на один стол (5 заказов в минуту — реальному столу
  // столько не нужно) и мягкий на один IP (25 за 2 минуты — на случай
  // общего Wi-Fi заведения, где за одним адресом много гостей).
  const ip = clientIp(request);
  const ipLimit = rateLimit(`order:ip:${ip}`, { limit: 25, windowMs: 120_000 });
  const tableLimit = requestedTableId
    ? rateLimit(`order:table:${requestedTableId}`, { limit: 5, windowMs: 60_000 })
    : { ok: true, retryAfterSec: 0 };
  if (!ipLimit.ok || !tableLimit.ok) {
    const retryAfter = Math.max(ipLimit.retryAfterSec, tableLimit.retryAfterSec);
    return NextResponse.json(
      { error: "Слишком много заказов подряд. Подождите немного и попробуйте снова." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const venue = await prisma.venue.findUnique({
    where: { slug: body.venueSlug },
    select: { id: true, nameRu: true },
  });
  if (!venue) {
    return NextResponse.json({ error: "venue not found" }, { status: 404 });
  }

  // Столик — если ссылка была открыта по QR конкретного стола (?table=...),
  // проверяем, что этот стол правда принадлежит этой точке (не чужой id).
  let tableId: string | null = null;
  let tableLabel: string | null = null;
  if (requestedTableId) {
    const table = await prisma.table.findFirst({
      where: { id: requestedTableId, venueId: venue.id },
      select: { id: true, label: true },
    });
    if (!table) {
      return NextResponse.json({ error: "table not found" }, { status: 400 });
    }
    tableId = table.id;
    tableLabel = table.label;
  }

  // Группируем строки корзины по (slug + набор опций) — на случай если
  // гость (или баг на клиенте) прислал одну и ту же комбинацию дважды.
  const grouped = new Map<string, { slug: string; qty: number; optionIds: string[] }>();
  for (const raw of body.items as OrderItemInput[]) {
    const slug = typeof raw.slug === "string" ? raw.slug : null;
    const qty = Number(raw.qty);
    const optionIds = Array.isArray(raw.optionIds)
      ? raw.optionIds.filter((v): v is string => typeof v === "string")
      : [];
    if (!slug || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Each item needs a slug and a positive qty" },
        { status: 400 }
      );
    }
    const key = lineKey(slug, optionIds);
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += Math.floor(qty);
    } else {
      grouped.set(key, { slug, qty: Math.floor(qty), optionIds });
    }
  }

  const slugs = [...new Set([...grouped.values()].map((g) => g.slug))];
  const menuItems = await prisma.menuItem.findMany({
    where: { slug: { in: slugs }, category: { venueId: venue.id } },
  });
  const bySlug = new Map(menuItems.map((mi) => [mi.slug, mi]));

  const allOptionIds = [...new Set([...grouped.values()].flatMap((g) => g.optionIds))];
  const options = allOptionIds.length
    ? await prisma.modifierOption.findMany({
        where: { id: { in: allOptionIds } },
        include: { group: { select: { id: true, menuItemId: true, nameKa: true, nameRu: true, nameEn: true } } },
      })
    : [];
  const optionById = new Map(options.map((o) => [o.id, o]));

  const lines: {
    menuItemId: string;
    nameSnapshot: string;
    priceGel: number;
    qty: number;
    modifiersSnapshot: { groupName: string; optionName: string; priceGel: number }[] | typeof Prisma.JsonNull;
  }[] = [];

  for (const { slug, qty, optionIds } of grouped.values()) {
    const mi = bySlug.get(slug);
    if (!mi || !mi.available) {
      return NextResponse.json(
        {
          error: `Позиция "${slug}" сейчас недоступна — обновите меню и попробуйте снова.`,
        },
        { status: 409 }
      );
    }

    let modifiersTotal = 0;
    const modifiersSnapshot: { groupName: string; optionName: string; priceGel: number }[] = [];
    for (const optId of optionIds) {
      const opt = optionById.get(optId);
      // Опция должна существовать и принадлежать именно этому блюду —
      // иначе гость мог бы в devtools подставить чужой (более дешёвый) id.
      if (!opt || opt.group.menuItemId !== mi.id) {
        return NextResponse.json(
          { error: "Выбранная опция недоступна, обновите меню и попробуйте снова." },
          { status: 409 }
        );
      }
      const optPrice = Number(opt.priceGel);
      modifiersTotal += optPrice;
      modifiersSnapshot.push({
        groupName: nameForLocale(opt.group, locale),
        optionName: nameForLocale(opt, locale),
        priceGel: optPrice,
      });
    }

    const basePrice = effectivePrice(
      Number(mi.priceGel),
      mi.discountMenuPercent != null ? Number(mi.discountMenuPercent) : null
    );

    lines.push({
      menuItemId: mi.id,
      nameSnapshot: nameForLocale(mi, locale),
      priceGel: basePrice + modifiersTotal,
      qty,
      modifiersSnapshot: modifiersSnapshot.length ? modifiersSnapshot : Prisma.JsonNull,
    });
  }

  const totalGel = lines.reduce((sum, l) => sum + l.priceGel * l.qty, 0);

  // Номер заказа — сквозной у КАЖДОГО venue отдельно (не общий на всю
  // платформу). Присваивается внутри транзакции; на случай гонки двух
  // одновременных заказов на одну точку — пара повторных попыток при
  // конфликте уникальности [venueId, orderNumber].
  let created: { id: string; orderNumber: number } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          where: { venueId: venue.id },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        });
        const orderNumber = (last?.orderNumber ?? 0) + 1;
        return tx.order.create({
          data: {
            venueId: venue.id,
            orderNumber,
            locale,
            tableId,
            totalGel,
            items: { create: lines },
          },
          select: { id: true, orderNumber: true },
        });
      });
      break;
    } catch (err) {
      const isUniqueConflict = (err as { code?: string } | null)?.code === "P2002";
      if (isUniqueConflict && attempt < 2) continue;
      console.error("[orders] failed to save order:", err);
      return NextResponse.json(
        { error: "Не удалось сохранить заказ, попробуйте ещё раз." },
        { status: 500 }
      );
    }
  }
  if (!created) {
    return NextResponse.json(
      { error: "Не удалось сохранить заказ, попробуйте ещё раз." },
      { status: 500 }
    );
  }

  // Уведомление персонала в Telegram (см. src/lib/notify.ts). Заказ уже
  // сохранён — отправка сама ограничивает себя 4 секундами и глушит
  // любые ошибки, так что сбой Telegram не влияет на ответ гостю.
  await sendTelegram(
    formatNewOrder({
      venueName: venue.nameRu,
      orderNumber: created.orderNumber,
      tableLabel,
      totalGel,
      lines: lines.map((l) => ({
        nameSnapshot: l.nameSnapshot,
        priceGel: l.priceGel,
        qty: l.qty,
        modifiers: Array.isArray(l.modifiersSnapshot)
          ? (l.modifiersSnapshot as { optionName: string }[])
          : [],
      })),
    }),
    orderStatusButtons(created.id)
  );

  return NextResponse.json({
    id: created.id,
    orderNumber: String(created.orderNumber),
    status: "received",
  });
}