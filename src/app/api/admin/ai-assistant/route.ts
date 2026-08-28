import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

// Бесплатный ИИ-помощник в админке: понимает свободный текст оператора
// ("отключи кока-колу", "сколько у нас блюд", "добавь блюдо Хачапури за
// 15 лари в категорию Выпечка", "поставь цену на Маргариту 25 лари") через
// Google Gemini API (бесплатный уровень, https://aistudio.google.com/apikey)
// — ключ кладём в .env как GEMINI_API_KEY. Сам маршрут ничего не пишет в
// базу — он только спрашивает ИИ, распознаёт и проверяет действия (что
// названия существуют, категории существуют и т.п.), а применяет их клиент
// через уже существующие /api/admin/... маршруты, как при обычных кликах в
// интерфейсе. Управление внешними платформами (Wolt/Bolt/Glovo) сюда НЕ
// входит — прямой связи с ними у системы нет (нужен официальный доступ от
// каждой платформы), об этом ИИ сам честно отвечает оператору.
const GEMINI_MODEL = "gemini-3.6-flash";
const UNITS = ["г", "кг", "мл", "л", "шт"];

type RawAction = {
  type?: string;
  name?: string;
  itemName?: string;
  ingredientName?: string;
  categoryName?: string;
  available?: boolean;
  priceGel?: number;
  pricePerUnit?: number;
  unit?: string;
  quantity?: number;
  platform?: string;
  percent?: number;
};

const DISCOUNT_FIELD: Record<string, "discountWoltPercent" | "discountBoltPercent" | "discountGlovoPercent"> = {
  wolt: "discountWoltPercent",
  bolt: "discountBoltPercent",
  glovo: "discountGlovoPercent",
};

export async function POST(request: Request) {
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.venueId || !body?.message) {
    return NextResponse.json({ error: "venueId and message are required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: body.venueId },
    select: {
      id: true,
      nameRu: true,
      aboutText: true,
      tenantId: true,
      urlWolt: true,
      urlBolt: true,
      urlGlovo: true,
      urlFacebook: true,
      urlInstagram: true,
      urlMaps: true,
    },
  });
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canEditVenue(staff, venue)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY не настроен на сервере. Добавьте бесплатный ключ в .env (переменная GEMINI_API_KEY) и перезапустите npm run dev.",
      },
      { status: 500 }
    );
  }

  const [ingredients, categories, items] = await Promise.all([
    prisma.ingredient.findMany({
      where: { venueId: venue.id },
      select: { id: true, name: true, unit: true, pricePerUnit: true, available: true },
      orderBy: { name: "asc" },
    }),
    prisma.menuCategory.findMany({
      where: { venueId: venue.id },
      select: { id: true, nameRu: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { category: { venueId: venue.id } },
      select: {
        id: true,
        nameRu: true,
        priceGel: true,
        discountWoltPercent: true,
        discountBoltPercent: true,
        discountGlovoPercent: true,
        available: true,
        categoryId: true,
        category: { select: { nameRu: true } },
        recipeItems: {
          select: { id: true, ingredientId: true, quantity: true, ingredient: { select: { name: true, available: true } } },
        },
      },
    }),
  ]);

  const itemsSummary = items.map((i) => ({
    id: i.id,
    name: i.nameRu,
    category: i.category.nameRu,
    categoryId: i.categoryId,
    priceGel: Number(i.priceGel),
    discountWoltPercent: i.discountWoltPercent != null ? Number(i.discountWoltPercent) : null,
    discountBoltPercent: i.discountBoltPercent != null ? Number(i.discountBoltPercent) : null,
    discountGlovoPercent: i.discountGlovoPercent != null ? Number(i.discountGlovoPercent) : null,
    // Та же формула, что и на гостевом меню: блюдо реально доступно,
    // только если его не выключили вручную И все ингредиенты в наличии.
    available: i.available && i.recipeItems.every((ri) => ri.ingredient.available),
    recipe: i.recipeItems.map((ri) => ({
      recipeItemId: ri.id,
      ingredientId: ri.ingredientId,
      ingredientName: ri.ingredient.name,
      quantity: Number(ri.quantity),
    })),
  }));

  const stats = {
    всегоБлюд: itemsSummary.length,
    доступноБлюд: itemsSummary.filter((i) => i.available).length,
    всегоИнгредиентов: ingredients.length,
    вНаличииИнгредиентов: ingredients.filter((i) => i.available).length,
    категории: categories.map((c) => c.nameRu),
  };

  const prompt = [
    `Ты — ассистент внутри админ-панели ресторана "${venue.nameRu}". Сотрудник пишет тебе сообщение (обычно на русском, иногда грузинские названия ингредиентов/блюд).`,
    `Ты умеешь: отвечать на вопросы про меню; включать/выключать наличие блюд и ингредиентов; менять цену блюда и цену ингредиента за единицу; добавлять и удалять блюда, ингредиенты и категории; добавлять и убирать ингредиент из состава (рецепта) блюда; менять скидку (%) на блюдо для конкретного агрегатора (Wolt/Bolt/Glovo) — ЭТО ЛОКАЛЬНОЕ ПОЛЕ ВНУТРИ ЭТОЙ ЖЕ АДМИН-ПАНЕЛИ, используется просто как справочная информация и для расчёта итоговой цены (priceGel * (1 - процент/100)), а не команда самой платформе.`,
    `Важно НЕ ПУТАТЬ два разных смысла слов Wolt/Bolt/Glovo: (1) поле скидки для агрегатора В ЭТОЙ ПАНЕЛИ (action item_discount) — его ты умеешь менять, это просто число в нашей базе; и (2) настоящий сайт/кабинет/приложение Wolt/Bolt/Glovo — туда у этой системы прямого доступа нет. Если сотрудник пишет "поставь скидку 15% на Wolt для колы" — это про (1), создавай action item_discount, НЕ отказывай. Если пишет "зайди в Wolt и поменяй там" или "отключи в приложении Wolt" — это про (2), тут вежливо объясни в reply, что прямого доступа к самой платформе нет.`,
    ``,
    venue.aboutText
      ? `О бренде / истории заведения (используй это для ответов на такие вопросы, но не выдумывай ничего сверх этого текста): ${JSON.stringify(venue.aboutText)}`
      : `Про историю/бренд заведения информации не заполнено — если спросят, честно скажи, что этого пока нет в системе.`,
    `Ссылки заведения (Wolt/Bolt/Glovo/Facebook/Instagram) — если спросят, поделись подходящей, если ссылки нет — честно скажи, что не заполнено: ${JSON.stringify(
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
    `Статистика: ${JSON.stringify(stats)}`,
    `Категории меню: ${JSON.stringify(categories.map((c) => c.nameRu))}`,
    `Ингредиенты (name, unit, pricePerUnit, available): ${JSON.stringify(
      ingredients.map((i) => ({ name: i.name, unit: i.unit, pricePerUnit: Number(i.pricePerUnit), available: i.available }))
    )}`,
    `Блюда (name, category, priceGel — базовая цена одна везде, available, discountWoltPercent/discountBoltPercent/discountGlovoPercent — текущая скидка % на площадке или null если нет, recipe — состав из ingredientName+quantity): ${JSON.stringify(
      itemsSummary.map((i) => ({
        name: i.name,
        category: i.category,
        priceGel: i.priceGel,
        available: i.available,
        discountWoltPercent: i.discountWoltPercent,
        discountBoltPercent: i.discountBoltPercent,
        discountGlovoPercent: i.discountGlovoPercent,
        recipe: i.recipe.map((r) => ({ ingredientName: r.ingredientName, quantity: r.quantity })),
      }))
    )}`,
    ``,
    `Сообщение сотрудника: ${JSON.stringify(body.message)}`,
    ``,
    `Ответь СТРОГО в виде JSON (без markdown-обёртки, без пояснений вокруг), вот такой структуры:`,
    `{"reply": "короткий ответ сотруднику на русском", "actions": [ ... ]}`,
    `Каждый action — один из типов ниже (поле "type" обязательно, названия должны ТОЧНО совпадать со списками выше, тот же язык и написание):`,
    `{"type": "ingredient_availability", "name": "...", "available": true|false}`,
    `{"type": "item_availability", "name": "...", "available": true|false}`,
    `{"type": "item_price", "name": "...", "priceGel": число}`,
    `{"type": "ingredient_price", "name": "...", "pricePerUnit": число}`,
    `{"type": "ingredient_create", "name": "...", "unit": "г"|"кг"|"мл"|"л"|"шт", "pricePerUnit": число}`,
    `{"type": "ingredient_delete", "name": "..."}`,
    `{"type": "item_create", "name": "...", "categoryName": "точно из списка категорий", "priceGel": число}`,
    `{"type": "item_delete", "name": "..."}`,
    `{"type": "category_create", "name": "..."}`,
    `{"type": "recipe_add", "itemName": "...", "ingredientName": "...", "quantity": число}`,
    `{"type": "recipe_remove", "itemName": "...", "ingredientName": "..."}`,
    `{"type": "item_discount", "name": "...", "platform": "wolt"|"bolt"|"glovo", "percent": число от 0 до 100}`,
    `Если действие не требуется (просто вопрос) — actions: []. Если чего-то не хватает для действия (например, не указана категория для нового блюда) — не создавай action, а спроси уточнение в reply.`,
  ].join("\n");

  let aiText = "";
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
      const errText = await res.text();
      return NextResponse.json({ error: `Ошибка ИИ-сервиса: ${errText.slice(0, 300)}` }, { status: 502 });
    }
    const data = await res.json();
    aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с ИИ-сервисом." }, { status: 502 });
  }

  let parsed: { reply?: string; actions?: RawAction[] };
  try {
    parsed = JSON.parse(aiText);
  } catch {
    return NextResponse.json(
      { error: "ИИ вернул ответ в неожиданном формате, попробуйте переформулировать вопрос." },
      { status: 502 }
    );
  }

  const findIngredient = (name?: string) => ingredients.find((i) => i.name === name);
  const findItem = (name?: string) => itemsSummary.find((i) => i.name === name);
  const findCategory = (name?: string) => categories.find((c) => c.nameRu === name);

  const resolvedActions: Record<string, unknown>[] = [];
  const notes: string[] = [];

  for (const action of parsed.actions || []) {
    const type = action?.type;

    if (type === "ingredient_availability") {
      const match = findIngredient(action.name);
      if (!match) { notes.push(`Не нашёл ингредиент «${action.name}».`); continue; }
      if (typeof action.available !== "boolean") continue;
      resolvedActions.push({ type, id: match.id, name: match.name, available: action.available });
    } else if (type === "item_availability") {
      const match = findItem(action.name);
      if (!match) { notes.push(`Не нашёл блюдо «${action.name}».`); continue; }
      if (typeof action.available !== "boolean") continue;
      resolvedActions.push({ type, id: match.id, categoryId: match.categoryId, name: match.name, available: action.available });
    } else if (type === "item_price") {
      const match = findItem(action.name);
      if (!match) { notes.push(`Не нашёл блюдо «${action.name}».`); continue; }
      if (typeof action.priceGel !== "number" || action.priceGel < 0) continue;
      resolvedActions.push({ type, id: match.id, categoryId: match.categoryId, name: match.name, priceGel: action.priceGel });
    } else if (type === "ingredient_price") {
      const match = findIngredient(action.name);
      if (!match) { notes.push(`Не нашёл ингредиент «${action.name}».`); continue; }
      if (typeof action.pricePerUnit !== "number" || action.pricePerUnit < 0) continue;
      resolvedActions.push({ type, id: match.id, name: match.name, pricePerUnit: action.pricePerUnit });
    } else if (type === "ingredient_create") {
      if (!action.name) continue;
      if (findIngredient(action.name)) { notes.push(`Ингредиент «${action.name}» уже есть.`); continue; }
      const unit = UNITS.includes(action.unit || "") ? (action.unit as string) : "шт";
      const pricePerUnit = typeof action.pricePerUnit === "number" && action.pricePerUnit >= 0 ? action.pricePerUnit : 0;
      resolvedActions.push({ type, name: action.name, unit, pricePerUnit });
    } else if (type === "ingredient_delete") {
      const match = findIngredient(action.name);
      if (!match) { notes.push(`Не нашёл ингредиент «${action.name}».`); continue; }
      resolvedActions.push({ type, id: match.id, name: match.name });
    } else if (type === "item_create") {
      if (!action.name) continue;
      const category = findCategory(action.categoryName);
      if (!category) { notes.push(`Не нашёл категорию «${action.categoryName}» для нового блюда «${action.name}».`); continue; }
      const priceGel = typeof action.priceGel === "number" && action.priceGel >= 0 ? action.priceGel : 0;
      resolvedActions.push({ type, name: action.name, categoryId: category.id, categoryName: category.nameRu, priceGel });
    } else if (type === "item_delete") {
      const match = findItem(action.name);
      if (!match) { notes.push(`Не нашёл блюдо «${action.name}».`); continue; }
      resolvedActions.push({ type, id: match.id, categoryId: match.categoryId, name: match.name });
    } else if (type === "category_create") {
      if (!action.name) continue;
      if (findCategory(action.name)) { notes.push(`Категория «${action.name}» уже есть.`); continue; }
      resolvedActions.push({ type, name: action.name });
    } else if (type === "recipe_add") {
      const item = findItem(action.itemName);
      const ingredient = findIngredient(action.ingredientName);
      if (!item) { notes.push(`Не нашёл блюдо «${action.itemName}».`); continue; }
      if (!ingredient) { notes.push(`Не нашёл ингредиент «${action.ingredientName}».`); continue; }
      if (typeof action.quantity !== "number" || action.quantity <= 0) { notes.push(`Не указано количество для «${action.ingredientName}» в «${action.itemName}».`); continue; }
      if (item.recipe.some((r) => r.ingredientId === ingredient.id)) { notes.push(`«${ingredient.name}» уже есть в составе «${item.name}».`); continue; }
      resolvedActions.push({
        type,
        itemId: item.id,
        categoryId: item.categoryId,
        itemName: item.name,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: action.quantity,
      });
    } else if (type === "item_discount") {
      const match = findItem(action.name);
      if (!match) { notes.push(`Не нашёл блюдо «${action.name}».`); continue; }
      const field = action.platform ? DISCOUNT_FIELD[action.platform.toLowerCase()] : undefined;
      if (!field) { notes.push(`Не понял, для какой площадки скидка (Wolt/Bolt/Glovo) у «${action.name}».`); continue; }
      if (typeof action.percent !== "number" || action.percent < 0 || action.percent > 100) {
        notes.push(`Процент скидки для «${action.name}» должен быть от 0 до 100.`);
        continue;
      }
      resolvedActions.push({
        type,
        id: match.id,
        categoryId: match.categoryId,
        name: match.name,
        field,
        platform: action.platform,
        percent: action.percent,
      });
    } else if (type === "recipe_remove") {
      const item = findItem(action.itemName);
      if (!item) { notes.push(`Не нашёл блюдо «${action.itemName}».`); continue; }
      const line = item.recipe.find((r) => r.ingredientName === action.ingredientName);
      if (!line) { notes.push(`«${action.ingredientName}» не найден в составе «${item.name}».`); continue; }
      resolvedActions.push({
        type,
        id: line.recipeItemId,
        itemId: item.id,
        categoryId: item.categoryId,
        itemName: item.name,
        ingredientName: action.ingredientName,
      });
    }
  }

  const reply = [parsed.reply || "", ...notes].filter(Boolean).join("\n");
  return NextResponse.json({ reply, actions: resolvedActions });
}
