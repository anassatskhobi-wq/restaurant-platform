import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Состав пицц взят из твоего файла "მთავარი კალკულაცია.xlsx" (лист "6) პიცა").
// Привязано только к тем позициям меню Chicago Style, для которых в файле
// нашёлся однозначный аналог по вкусу (Маргарита/Пепперони/4 сыра/Веджи).
// Остальные виды пицц из файла (Ветчина-грибы, 4 сезона) пока не привязаны —
// на сайте нет позиций с такими вкусами.
//
// Единица измерения количества везде — кг (как в файле), кроме коробок,
// которых всегда 1 штука на пиццу.

const VENUE_SLUG = "chicago-style";

type Line = { ingredient: string; quantity: number };

const MARGHERITA_25: Line[] = [
  { ingredient: "ცომი", quantity: 0.2 },
  { ingredient: "სოუსი", quantity: 0.05 },
  { ingredient: "მოცარელა", quantity: 0.15 },
  { ingredient: "ყუთი 25", quantity: 1 },
];
const MARGHERITA_33: Line[] = [
  { ingredient: "ცომი", quantity: 0.35 },
  { ingredient: "სოუსი", quantity: 0.07 },
  { ingredient: "მოცარელა", quantity: 0.15 },
  { ingredient: "ყუთი 33", quantity: 1 },
];
const MARGHERITA_41: Line[] = [
  { ingredient: "ცომი", quantity: 0.45 },
  { ingredient: "სოუსი", quantity: 0.1 },
  { ingredient: "მოცარელა პოლონური", quantity: 0.2 },
  { ingredient: "ყუთი 41", quantity: 1 },
];

const PEPPERONI_25: Line[] = [
  { ingredient: "ცომი", quantity: 0.15 },
  { ingredient: "სოუსი", quantity: 0.08 },
  { ingredient: "მოცარელა პოლონური", quantity: 0.1 },
  { ingredient: "პეპერონი", quantity: 0.02 },
  { ingredient: "ყუთი 25", quantity: 1 },
];
const PEPPERONI_33: Line[] = [
  { ingredient: "ცომი", quantity: 0.35 },
  { ingredient: "სოუსი", quantity: 0.07 },
  { ingredient: "მოცარელა პოლონური", quantity: 0.17 },
  { ingredient: "პეპერონი", quantity: 0.042 },
  { ingredient: "ყუთი 33", quantity: 1 },
];
const PEPPERONI_41: Line[] = [
  { ingredient: "ცომი", quantity: 0.45 },
  { ingredient: "სოუსი", quantity: 0.1 },
  { ingredient: "მოცარელა პოლონური", quantity: 0.2 },
  { ingredient: "პეპერონი", quantity: 0.04 },
  { ingredient: "ყუთი 41", quantity: 1 },
];

const CHEESE4_25: Line[] = [
  { ingredient: "ცომი", quantity: 0.2 },
  { ingredient: "სოუსი", quantity: 0.05 },
  { ingredient: "მოცარელა", quantity: 0.1 },
  { ingredient: "გაუდა", quantity: 0.03 },
  { ingredient: "ედამერი", quantity: 0.03 },
  { ingredient: "გორგონძოლა", quantity: 0.03 },
  { ingredient: "ყუთი 25", quantity: 1 },
];
const CHEESE4_33: Line[] = [
  { ingredient: "ცომი", quantity: 0.35 },
  { ingredient: "სოუსი", quantity: 0.07 },
  { ingredient: "მოცარელა", quantity: 0.17 },
  { ingredient: "გაუდა", quantity: 0.04 },
  { ingredient: "ედამერი", quantity: 0.04 },
  { ingredient: "გორგონძოლა", quantity: 0.04 },
  { ingredient: "ყუთი 33", quantity: 1 },
];
const CHEESE4_41: Line[] = [
  { ingredient: "ცომი", quantity: 0.45 },
  { ingredient: "სოუსი", quantity: 0.1 },
  { ingredient: "მოცარელა პოლონური", quantity: 0.2 },
  { ingredient: "გაუდა", quantity: 0.05 },
  { ingredient: "ედამერი", quantity: 0.05 },
  { ingredient: "გორგონძოლა", quantity: 0.05 },
  { ingredient: "ყუთი 41", quantity: 1 },
];

const VEGGIE_33: Line[] = [
  { ingredient: "ცომი", quantity: 0.35 },
  { ingredient: "სოუსი", quantity: 0.07 },
  { ingredient: "მოცარელა", quantity: 0.17 },
  { ingredient: "სოკო", quantity: 0.05 },
  { ingredient: "წითელი ბულგარული", quantity: 0.05 },
  { ingredient: "სიმინდი", quantity: 0.045 },
  { ingredient: "ჩერი", quantity: 0.035 },
  { ingredient: "ზეთის ხილი", quantity: 0.02 },
  { ingredient: "რუკოლა მწვანე", quantity: 0.015 },
  { ingredient: "პარმეზანი", quantity: 0.005 },
  { ingredient: "ყუთი 33", quantity: 1 },
];

// slug реального блюда на сайте -> состав
const ITEM_RECIPES: Record<string, Line[]> = {
  "ap-margherita-s": MARGHERITA_25,
  "ap-margherita-l": MARGHERITA_33,
  "ap-margherita-xl": MARGHERITA_41,
  "ap-pepperoni-s": PEPPERONI_25,
  "ap-pepperoni-l": PEPPERONI_33,
  "ap-pepperoni-xl": PEPPERONI_41,
  "ap-4cheese-s": CHEESE4_25,
  "ap-4cheese-l": CHEESE4_33,
  "ap-4cheese-xl": CHEESE4_41,
  // У Crusty Tavern и Crusty только один размер — берём среднюю раскладку (33 см)
  // как ближайшее приближение.
  "ct-margherita": MARGHERITA_33,
  "ct-pepperoni": PEPPERONI_33,
  "ct-4-cheese": CHEESE4_33,
  "ct-veggie": VEGGIE_33,
  "crusty-margherita": MARGHERITA_33,
  "crusty-pepperoni": PEPPERONI_33,
  "crusty-4cheese": CHEESE4_33,
  "crusty-veggie-cheese": VEGGIE_33,
};

async function main() {
  const venue = await prisma.venue.findUnique({ where: { slug: VENUE_SLUG } });
  if (!venue) throw new Error(`Точка со slug "${VENUE_SLUG}" не найдена`);

  const ingredients = await prisma.ingredient.findMany({ where: { venueId: venue.id } });
  const ingredientByName = new Map(ingredients.map((i) => [i.name.trim(), i]));

  let itemsUpdated = 0;
  let linesCreated = 0;
  const missingIngredients = new Set<string>();
  const missingItems: string[] = [];

  for (const [slug, lines] of Object.entries(ITEM_RECIPES)) {
    const item = await prisma.menuItem.findFirst({ where: { slug } });
    if (!item) {
      missingItems.push(slug);
      continue;
    }

    // Пересоздаём состав этого блюда с нуля, чтобы скрипт можно было
    // безопасно запускать повторно (не плодил дубли строк).
    await prisma.recipeItem.deleteMany({ where: { menuItemId: item.id } });

    for (const line of lines) {
      const ing = ingredientByName.get(line.ingredient);
      if (!ing) {
        missingIngredients.add(line.ingredient);
        continue;
      }
      await prisma.recipeItem.create({
        data: { menuItemId: item.id, ingredientId: ing.id, quantity: line.quantity },
      });
      linesCreated++;
    }
    itemsUpdated++;
  }

  console.log(`Готово. Блюд с обновлённым составом: ${itemsUpdated}, строк состава создано: ${linesCreated}.`);
  if (missingItems.length) {
    console.log("Не найдены на сайте (пропущены) slugs:", missingItems.join(", "));
  }
  if (missingIngredients.size) {
    console.log("Не найдены такие ингредиенты в базе (пропущены):", [...missingIngredients].join(", "));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
