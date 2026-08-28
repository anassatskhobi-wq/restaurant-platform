import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Публичный ИИ-помощник на СТРАНИЦЕ ГОСТЯ (не в админке) — отвечает на
// вопросы про меню (что в составе, есть ли вегетарианское, история
// бренда и т.п.). В отличие от админского помощника — ТОЛЬКО отвечает,
// НИЧЕГО не меняет в базе (гость не должен иметь возможности отключить
// блюдо или поменять цену через чат). Доступ без логина, поэтому:
// — не показываем гостю себестоимость/цены ингредиентов, только названия;
// — простой лимит запросов в минуту на точку, чтобы не накрутили счёт за Gemini.
const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_PER_MINUTE = 20;

const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>();

function isRateLimited(venueId: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(venueId);
  if (!bucket || now - bucket.windowStart > 60_000) {
    rateLimitBuckets.set(venueId, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_PER_MINUTE;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.venueSlug || !body?.message) {
    return NextResponse.json({ error: "venueSlug and message are required" }, { status: 400 });
  }
  const message = String(body.message).slice(0, MAX_MESSAGE_LENGTH);

  const venue = await prisma.venue.findUnique({
    where: { slug: body.venueSlug },
    select: {
      id: true,
      nameKa: true,
      nameRu: true,
      nameEn: true,
      aboutText: true,
      urlWolt: true,
      urlBolt: true,
      urlGlovo: true,
      urlFacebook: true,
      urlInstagram: true,
      urlMaps: true,
    },
  });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (isRateLimited(venue.id)) {
    return NextResponse.json(
      { error: "Слишком много вопросов подряд, подождите немного и попробуйте снова." },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Гостю не показываем внутренние детали настройки — просто мягкий отказ.
    console.error("[guest ai-assistant] GEMINI_API_KEY is not set");
    return NextResponse.json({ reply: "" }, { status: 200 });
  }

  const items = await prisma.menuItem.findMany({
    where: { category: { venueId: venue.id } },
    select: {
      nameKa: true,
      nameRu: true,
      nameEn: true,
      descriptionRu: true,
      priceGel: true,
      available: true,
      category: { select: { nameKa: true, nameRu: true, nameEn: true } },
      recipeItems: { select: { ingredient: { select: { name: true, available: true } } } },
    },
  });

  const itemsSummary = items.map((i) => ({
    nameKa: i.nameKa,
    nameRu: i.nameRu,
    nameEn: i.nameEn,
    category: i.category.nameRu,
    priceGel: Number(i.priceGel),
    description: i.descriptionRu,
    // Формула доступности та же, что и на самом меню.
    available: i.available && i.recipeItems.every((ri) => ri.ingredient.available),
    // Только названия ингредиентов (для вопросов про аллергии/состав) —
    // без цен и прочих внутренних данных.
    ingredients: i.recipeItems.map((ri) => ri.ingredient.name),
  }));

  const prompt = [
    `Ты — дружелюбный помощник на странице меню ресторана "${venue.nameRu}" (гостевая версия, не админка).`,
    `Отвечай ТОЛЬКО на основе данных ниже. Ты можешь: рассказывать про блюда, их состав (по названиям ингредиентов), цены, что сейчас есть в наличии; советовать блюда (например, вегетарианские, без определённого ингредиента); рассказывать историю/про бренд, если она указана ниже.`,
    `Ты НЕ можешь: менять что-либо в меню, оформлять заказ, обещать скидки, которых нет в данных. Если не знаешь ответа по данным ниже — честно скажи, что не знаешь, и предложи спросить официанта.`,
    `Отвечай на языке сообщения гостя (грузинский/русский/английский — как он написал). Коротко и по-дружески, без markdown-разметки, обычным текстом.`,
    ``,
    venue.aboutText
      ? `История / о бренде: ${JSON.stringify(venue.aboutText)}`
      : `Информации об истории бренда не указано.`,
    ``,
    `Ссылки (если гость спросит, где заказать доставку или где ваши соцсети — поделись подходящей ссылкой; если ссылки нет, честно скажи, что не знаешь): ${JSON.stringify(
      {
        wolt: venue.urlWolt || null,
        bolt: venue.urlBolt || null,
        glovo: venue.urlGlovo || null,
        facebook: venue.urlFacebook || null,
        instagram: venue.urlInstagram || null,
        картаНаGoogleMaps: venue.urlMaps || null,
      }
    )}`,
    ``,
    `Меню (nameRu/nameKa/nameEn, category, priceGel, available, description, ingredients — названия ингредиентов в составе): ${JSON.stringify(
      itemsSummary
    )}`,
    ``,
    `Сообщение гостя: ${JSON.stringify(message)}`,
    ``,
    `Ответь СТРОГО в виде JSON без markdown-обёртки: {"reply": "текст ответа"}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    if (!res.ok) {
      // Не показываем гостю технические детали, но логируем на сервере,
      // чтобы можно было понять причину по терминалу.
      const errText = await res.text().catch(() => "");
      console.error("[guest ai-assistant] Gemini error:", res.status, errText.slice(0, 500));
      return NextResponse.json({ reply: "" }, { status: 200 });
    }
    const data = await res.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: { reply?: string } = {};
    try {
      parsed = JSON.parse(aiText);
    } catch {
      // ИИ вернул не-JSON — отдаём как есть, лучше, чем ничего.
      return NextResponse.json({ reply: aiText.slice(0, 1000) });
    }
    return NextResponse.json({ reply: parsed.reply || "" });
  } catch (err) {
    console.error("[guest ai-assistant] request failed:", err);
    return NextResponse.json({ reply: "" }, { status: 200 });
  }
}
