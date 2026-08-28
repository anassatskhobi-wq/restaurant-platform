"use client";

// Разовый инструмент импорта меню с Glovo (страница ресторана на
// glovoapp.com). Собран вручную из данных страницы Glovo на момент
// импорта (28 августа 2026). Только ДОБАВЛЯЕТ новые позиции — ничего не
// удаляет и не трогает существующие блюда напрямую. Базовая цена = цена
// БЕЗ скидки на Glovo (обычная цена товара, действует та же логика, что
// и везде в системе: одна цена + отдельная скидка на площадке). Скидка =
// реально применённая скидка на Glovo (не "Prime"-скидка, которая
// доступна только подписчикам Glovo Prime и не показывается как базовая
// цена товара).
import { useState } from "react";

type GlovoItem = {
  nameKa: string;
  nameRu: string;
  nameEn: string;
  descriptionKa: string;
  descriptionRu: string;
  priceGel: number;
  discountGlovoPercent: number;
  categoryKa: string;
  categoryRu: string;
  categoryEn: string;
  // Эти позиции почти наверняка уже есть на сайте под другим названием
  // (нашли совпадение по цене и составу с уже существующими блюдами) —
  // по умолчанию НЕ отмечены галочкой, чтобы не создать дубликат.
  likelyDuplicate?: boolean;
};

function slugifyLoose(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  );
}

const D_BACON =
  "Хрустящее тесто на сливочном масле, 100% натуральная моцарелла, томатный соус, полосатый бекон, американский чеддер, орегано";
const D_JALAPENO =
  "Хрустящее тесто на сливочном масле, 100% натуральная моцарелла, томатный соус, колбаски, халапеньо, орегано";
const D_ZIA =
  "Хрустящее тесто на сливочном масле, 100% натуральная моцарелла, томатный соус, испанская колбаса, болгарский перец, орегано";
const D_4CHEESE_PIE =
  "Хрустящее тесто на сливочном масле, 100% натуральная моцарелла, соус бешамель, грибы кремини, голубой сыр, выдержанный пармезан, американский чеддер";
const D_PEPPERONI_PIE =
  "Хрустящее тесто на сливочном масле, 100% натуральная моцарелла, томатный соус, испанская колбаса сальсичча, орегано";
const D_MARGHERITA_PIE =
  "Хрустящее тесто на сливочном масле, 100% натуральная моцарелла, томатный соус, выдержанный пармезан, орегано";

const GLOVO_ITEMS: GlovoItem[] = [
  // 36 см Crusty Tavern — почти наверняка уже есть на сайте (совпадают
  // цены и названия с текущим меню: Маргерита 36₾, Сосиски 39₾, Веджи
  // 36₾, Ананас 39₾ и т.д.) — оставлены для справки, по умолчанию
  // выключены.
  { nameKa: "ქრასთ ტავერნ პეპერონი", nameRu: "Crusty Tavern Пепперони", nameEn: "Crusty Tavern Pepperoni", descriptionKa: "მოცარელა, პომიდვრის სოუსი, პეპერონი, ორეგანო", descriptionRu: "Моцарелла, томатный соус, пепперони, орегано", priceGel: 39, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ 4 ყველი", nameRu: "Crusty Tavern 4 сыра", nameEn: "Crusty Tavern 4 Cheese", descriptionKa: "მოცარელა, ლურჯი ყველი, პარმეზანი, ბეშამელი.", descriptionRu: "Моцарелла, голубой сыр, пармезан, бешамель", priceGel: 39, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ ჩიკაგო", nameRu: "Crusty Tavern Чикаго", nameEn: "Crusty Tavern Chicago", descriptionKa: "მოცარელა, პომიდვრის სოუსი, პეპერონი, ბულგარული წიწაკა, ორეგანო", descriptionRu: "Моцарелла, томатный соус, пепперони, болгарский перец, орегано", priceGel: 39, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ სოსისი", nameRu: "Crusty Tavern Сосиски", nameEn: "Crusty Tavern Sausage", descriptionKa: "მოცარელა, პომიდვრის სოუსი, სოსისი, ჰალაპენიო, ორეგანო", descriptionRu: "Моцарелла, томатный соус, сосиски, халапеньо, орегано", priceGel: 39, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ ანანასი", nameRu: "Crusty Tavern Ананас", nameEn: "Crusty Tavern Pineapple", descriptionKa: "მარინარას სოუსი, ლორი,მოცარელა, ანანასი", descriptionRu: "Соус маринара, ветчина, моцарелла, ананас", priceGel: 39, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ ბეკონი", nameRu: "Crusty Tavern Бекон", nameEn: "Crusty Tavern Bacon", descriptionKa: "მოცარელა, პომიდვრის სოუსი, ბეკონი, ორეგანო", descriptionRu: "Моцарелла, томатный соус, бекон, орегано", priceGel: 38, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ მარგერიტა", nameRu: "Crusty Tavern Маргерита", nameEn: "Crusty Tavern Margherita", descriptionKa: "მოცარელა, პომიდვრის სოუსი, ორეგანო", descriptionRu: "Моцарелла, томатный соус, орегано", priceGel: 36, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },
  { nameKa: "ქრასთ ტავერნ ვეჯი", nameRu: "Crusty Tavern Веджи", nameEn: "Crusty Tavern Veggie", descriptionKa: "პომიდვრის სოუსი, სოკო, ბულგარული წიწაკა, ჰალაენიო, ზეთის ხილი, ზეითუნის ზეთი", descriptionRu: "Томатный соус, грибы, болгарский перец, халапеньо, оливки, оливковое масло", priceGel: 36, discountGlovoPercent: 30, categoryKa: "36 სმ ქრასთ ტავერნ პიცა", categoryRu: "36 см пицца Crusty Tavern", categoryEn: "36cm Crusty Tavern Pizza", likelyDuplicate: true },

  // Американ Пай на 2 персоны (маленький)
  { nameKa: "ამერიკული ფაი პეპერონი პატარა", nameRu: "Американ Пай Пепперони (маленький)", nameEn: "American Pie Pepperoni (Small)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ესპანური სალსიჩა, ორეგანო", descriptionRu: D_PEPPERONI_PIE, priceGel: 32, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 2 პერსონაზე", categoryRu: "Американ Пай на 2 персоны", categoryEn: "American Pie for 2" },
  { nameKa: "ამერიკული ფაი 4 ყველი პატარა", nameRu: "Американ Пай 4 сыра (маленький)", nameEn: "American Pie 4 Cheese (Small)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, ბეშამელის სოუსი, ქამა სოკო, ლურჯი ყველი, ხანგრძლივად დავარგებული პარმეზანი, ამერიკული ჩედარი.", descriptionRu: D_4CHEESE_PIE, priceGel: 32, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 2 პერსონაზე", categoryRu: "Американ Пай на 2 персоны", categoryEn: "American Pie for 2" },
  { nameKa: "ამერიკული ფაი ბეკონით პატარა", nameRu: "Американ Пай с беконом (маленький)", nameEn: "American Pie with Bacon (Small)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ზოლებიანი ბეკონი, ამერიკული ჩედარი, ორეგანო", descriptionRu: D_BACON, priceGel: 32, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 2 პერსონაზე", categoryRu: "Американ Пай на 2 персоны", categoryEn: "American Pie for 2" },
  { nameKa: "ამერიკული ფაი ძია ისაკი", nameRu: "Американ Пай Дзиа Исаки (маленький)", nameEn: "American Pie Zia Isaki (Small)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ესპანური სოსიჯი, ბულგარული წიწაკა, ორეგანო", descriptionRu: D_ZIA, priceGel: 32, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 2 პერსონაზე", categoryRu: "Американ Пай на 2 персоны", categoryEn: "American Pie for 2" },
  { nameKa: "ამერიკული ფაი დონ ჰალაპენიო პატარა", nameRu: "Американ Пай Дон Халапеньо (маленький)", nameEn: "American Pie Don Jalapeno (Small)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, სოსიჯი, ჰალაპენიო, ორეგანო", descriptionRu: D_JALAPENO, priceGel: 32, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 2 პერსონაზე", categoryRu: "Американ Пай на 2 персоны", categoryEn: "American Pie for 2" },
  { nameKa: "ამერიკული ფაი მარგერიტა პატარა", nameRu: "Американ Пай Маргерита (маленький)", nameEn: "American Pie Margherita (Small)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ხანგრძლივად დავარგებული პარმეზანი, ორეგანო.", descriptionRu: D_MARGHERITA_PIE, priceGel: 28, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 2 პერსონაზე", categoryRu: "Американ Пай на 2 персоны", categoryEn: "American Pie for 2" },

  // Американ Пай на 3 персоны (большой)
  { nameKa: "ამერიკული ფაი ბეკონით დიდი", nameRu: "Американ Пай с беконом (большой)", nameEn: "American Pie with Bacon (Large)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ზოლებიანი ბეკონი, ამერიკული ჩედარი, ორეგანო", descriptionRu: D_BACON, priceGel: 75, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 3 პერსონაზე", categoryRu: "Американ Пай на 3 персоны", categoryEn: "American Pie for 3" },
  { nameKa: "ამერიკული ფაი დონ ჰალაპენიო დიდი", nameRu: "Американ Пай Дон Халапеньо (большой)", nameEn: "American Pie Don Jalapeno (Large)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, სოსიჯი, ჰალაპენიო, ორეგანო", descriptionRu: D_JALAPENO, priceGel: 49, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 3 პერსონაზე", categoryRu: "Американ Пай на 3 персоны", categoryEn: "American Pie for 3" },
  { nameKa: "ამერიკული ფაი ძია ისაკი (დიდი)", nameRu: "Американ Пай Дзиа Исаки (большой)", nameEn: "American Pie Zia Isaki (Large)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ესპანური სოსიჯი, ბულგარული წიწაკა, ორეგანო", descriptionRu: D_ZIA, priceGel: 49, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 3 პერსონაზე", categoryRu: "Американ Пай на 3 персоны", categoryEn: "American Pie for 3" },
  { nameKa: "ამერიკული ფაი 4 ყველი დიდი", nameRu: "Американ Пай 4 сыра (большой)", nameEn: "American Pie 4 Cheese (Large)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, ბეშამელის სოუსი, ქამა სოკო, ლურჯი ყველი, ხანგრძლივად დავარგებული პარმეზანი, ამერიკული ჩედარი.", descriptionRu: D_4CHEESE_PIE, priceGel: 49, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 3 პერსონაზე", categoryRu: "Американ Пай на 3 персоны", categoryEn: "American Pie for 3" },
  { nameKa: "ამერიკული ფაი პეპერონი დიდი", nameRu: "Американ Пай Пепперони (большой)", nameEn: "American Pie Pepperoni (Large)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ესპანური სალსიჩა, ორეგანო", descriptionRu: D_PEPPERONI_PIE, priceGel: 49, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 3 პერსონაზე", categoryRu: "Американ Пай на 3 персоны", categoryEn: "American Pie for 3" },
  { nameKa: "ამერიკული ფაი მარგერიტა დიდი", nameRu: "Американ Пай Маргерита (большой)", nameEn: "American Pie Margherita (Large)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ხანგრძლივად დავარგებული პარმეზანი, ორეგანო.", descriptionRu: D_MARGHERITA_PIE, priceGel: 39, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 3 პერსონაზე", categoryRu: "Американ Пай на 3 персоны", categoryEn: "American Pie for 3" },

  // Американ Пай на 4 персоны (экстра)
  { nameKa: "ექსტრა ამერიკული ფაი 4 ყველი", nameRu: "Американ Пай 4 сыра (экстра)", nameEn: "American Pie 4 Cheese (Extra)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, ბეშამელის სოუსი, ქამა სოკო, ლურჯი ყველი, ხანგრძლივად დავარგებული პარმეზანი, ამერიკული ჩედარი.", descriptionRu: D_4CHEESE_PIE, priceGel: 75, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 4 პერსონაზე", categoryRu: "Американ Пай на 4 персоны", categoryEn: "American Pie for 4" },
  { nameKa: "ექსტრა ამერიკული ფაი ძია ისაკი", nameRu: "Американ Пай Дзиа Исаки (экстра)", nameEn: "American Pie Zia Isaki (Extra)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ესპანური სოსიჯი, ბულგარული წიწაკა, ორეგანო", descriptionRu: D_ZIA, priceGel: 75, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 4 პერსონაზე", categoryRu: "Американ Пай на 4 персоны", categoryEn: "American Pie for 4" },
  { nameKa: "ექსტრა ამერიკული ფაი ბეკონით", nameRu: "Американ Пай с беконом (экстра)", nameEn: "American Pie with Bacon (Extra)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ზოლებიანი ბეკონი, ამერიკული ჩედარი, ორეგანო", descriptionRu: D_BACON, priceGel: 75, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 4 პერსონაზე", categoryRu: "Американ Пай на 4 персоны", categoryEn: "American Pie for 4" },
  { nameKa: "ექსტრა ამერიკული ფაი დონ ჰალაპენიო", nameRu: "Американ Пай Дон Халапеньо (экстра)", nameEn: "American Pie Don Jalapeno (Extra)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, სოსიჯი, ჰალაპენიო, ორეგანო", descriptionRu: D_JALAPENO, priceGel: 75, discountGlovoPercent: 0, categoryKa: "ამერიკული ფაი 4 პერსონაზე", categoryRu: "Американ Пай на 4 персоны", categoryEn: "American Pie for 4" },
  { nameKa: "ექსტრა ამერიკული ფაი პეპერონი", nameRu: "Американ Пай Пепперони (экстра)", nameEn: "American Pie Pepperoni (Extra)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ესპანური სალსიჩა, ორეგანო", descriptionRu: D_PEPPERONI_PIE, priceGel: 75, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 4 პერსონაზე", categoryRu: "Американ Пай на 4 персоны", categoryEn: "American Pie for 4" },
  { nameKa: "ექსტრა ამერიკული ფაი მარგერიტა", nameRu: "Американ Пай Маргерита (экстра)", nameEn: "American Pie Margherita (Extra)", descriptionKa: "კარაქის ბაზაზე დამზადებული კნატუნა ცომი, 100% ცხოველური მოცარელა, კანგაცლილი პომიდვრის სოუსი, ხანგრძლივად დავარგებული პარმეზანი, ორეგანო.", descriptionRu: D_MARGHERITA_PIE, priceGel: 65, discountGlovoPercent: 20, categoryKa: "ამერიკული ფაი 4 პერსონაზე", categoryRu: "Американ Пай на 4 персоны", categoryEn: "American Pie for 4" },

  // Пицца Crusty (33 см) — тонкая, другая линейка (без "ტავერნ")
  { nameKa: "Crusty ამერიკა", nameRu: "Crusty Америка", nameEn: "Crusty America", descriptionKa: "ამერიკული ჩედარი, დამწიფებული მოცარელა, შებოლილი ბეკონი, ჰალაპენიო, მარინარას სოუსი. 33სმ", descriptionRu: "Американский чеддер, выдержанная моцарелла, копчёный бекон, халапеньо, соус маринара. 33 см", priceGel: 39, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty სოსიჯ მიქსი", nameRu: "Crusty Сосидж микс", nameEn: "Crusty Sausage Mix", descriptionKa: "დამწიფებული მოცარელა, მარინარას სოუსი, ცხარე პეპერონი, გერმანული სოსიჯი, შებოლილი ბეკონი, ინდაურის ლორი, ორეგანო. 33სმ", descriptionRu: "Выдержанная моцарелла, соус маринара, острое пепперони, немецкие колбаски, копчёный бекон, индюшиная ветчина, орегано. 33 см", priceGel: 39, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty პეპერონი", nameRu: "Crusty Пепперони", nameEn: "Crusty Pepperoni", descriptionKa: "დამწიფებული მოცარელა, მარინარას სოუსი, ცხარე პეპერონი, ორეგანო. 33სმ", descriptionRu: "Выдержанная моцарелла, соус маринара, острое пепперони, орегано. 33 см", priceGel: 37, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty 4 ყველი", nameRu: "Crusty 4 сыра", nameEn: "Crusty 4 Cheese", descriptionKa: "დამწიფებული მოცარელა, ბეშამელის სოუსი, ლურჯი ყველი, ამერიკული ჩედარი, პარმეზანი. 33სმ", descriptionRu: "Выдержанная моцарелла, соус бешамель, голубой сыр, американский чеддер, пармезан. 33 см", priceGel: 37, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty ვეჯი ყველით", nameRu: "Crusty Веджи с сыром", nameEn: "Crusty Veggie with Cheese", descriptionKa: "დამწიფებული მოცარელა, მარინარას სოუსი, ზეთისხილი, ბულგარული წიწაკა, ჰალაპენიო, ქამა სოკო. 33სმ", descriptionRu: "Выдержанная моцарелла, соус маринара, оливки, болгарский перец, халапеньо, грибы кремини. 33 см", priceGel: 37, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty კაპრიჩოზა", nameRu: "Crusty Капричоза", nameEn: "Crusty Capricciosa", descriptionKa: "დამწიფებული მოცარელა, მარინარას სოუსი, ზეთისხილი, ცხარე პეპერონი, ქამასოკო. 33სმ", descriptionRu: "Выдержанная моцарелла, соус маринара, оливки, острое пепперони, грибы. 33 см", priceGel: 37, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty ანანასით", nameRu: "Crusty с ананасом", nameEn: "Crusty with Pineapple", descriptionKa: "დამწიფებული მოცარელა, მარინარას სოუსი, ლორი, ანანასი. 33სმ", descriptionRu: "Выдержанная моцарелла, соус маринара, ветчина, ананас. 33 см", priceGel: 37, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },
  { nameKa: "Crusty მარგერიტა", nameRu: "Crusty Маргерита", nameEn: "Crusty Margherita", descriptionKa: "დამწიფებული მოცარელა, მარინარას სოუსი, ორეგანო. 33სმ", descriptionRu: "Выдержанная моцарелла, соус маринара, орегано. 33 см", priceGel: 34, discountGlovoPercent: 30, categoryKa: "პიცა", categoryRu: "Пицца Crusty", categoryEn: "Crusty Pizza" },

  // Мак энд Чиз
  { nameKa: "მაკ & ჩიზი ქათმის ფრთით", nameRu: "Мак энд Чиз с куриным крылышком", nameEn: "Mac & Cheese with Chicken Wing", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 0, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი ოთხი ყველით", nameRu: "Мак энд Чиз с четырьмя сырами", nameEn: "Mac & Cheese 4 Cheese", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი პეპერონით", nameRu: "Мак энд Чиз с пепперони", nameEn: "Mac & Cheese with Pepperoni", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი სოკოთი", nameRu: "Мак энд Чиз с грибами", nameEn: "Mac & Cheese with Mushrooms", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი ლორით", nameRu: "Мак энд Чиз с ветчиной", nameEn: "Mac & Cheese with Ham", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი სოსისით", nameRu: "Мак энд Чиз с сосисками", nameEn: "Mac & Cheese with Sausage", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი ქათმის ფილეთი", nameRu: "Мак энд Чиз с куриным филе", nameEn: "Mac & Cheese with Chicken Fillet", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },
  { nameKa: "მაკ & ჩიზი ხახვის რგოლებით", nameRu: "Мак энд Чиз с луковыми кольцами", nameEn: "Mac & Cheese with Onion Rings", descriptionKa: "", descriptionRu: "", priceGel: 25, discountGlovoPercent: 20, categoryKa: "მაკ & ჩიზი", categoryRu: "Мак энд Чиз", categoryEn: "Mac & Cheese" },

  // Врапы
  { nameKa: "ბუფალო ქათმის ვრეპი", nameRu: "Баффало вран с курицей", nameEn: "Buffalo Chicken Wrap", descriptionKa: "კრემყველი, ქათმის მარინადი, ტკბილცხარე სოუსიჩედარი, აისბერგი", descriptionRu: "Сливочный сыр, маринованная курица, кисло-острый соус, чеддер, айсберг", priceGel: 14, discountGlovoPercent: 0, categoryKa: "ვრეპი", categoryRu: "Врапы", categoryEn: "Wraps" },

  // Гарниры
  { nameKa: "ფრი XL", nameRu: "Картофель фри XL", nameEn: "Fries XL", descriptionKa: "", descriptionRu: "", priceGel: 9, discountGlovoPercent: 0, categoryKa: "გარნირი", categoryRu: "Гарниры", categoryEn: "Sides" },
  { nameKa: "საშუალო ფრი", nameRu: "Картофель фри (средний)", nameEn: "Fries (Medium)", descriptionKa: "", descriptionRu: "", priceGel: 5.5, discountGlovoPercent: 0, categoryKa: "გარნირი", categoryRu: "Гарниры", categoryEn: "Sides" },

  // Соусы
  { nameKa: "კეტჩუპი", nameRu: "Кетчуп", nameEn: "Ketchup", descriptionKa: "", descriptionRu: "", priceGel: 1.95, discountGlovoPercent: 0, categoryKa: "სოუსი", categoryRu: "Соусы", categoryEn: "Sauces" },
  { nameKa: "სოუსი \"ჩიკაგო\" ტკბილცხარე", nameRu: "Соус «Чикаго» кисло-острый", nameEn: "Chicago Sweet & Spicy Sauce", descriptionKa: "", descriptionRu: "", priceGel: 1.95, discountGlovoPercent: 0, categoryKa: "სოუსი", categoryRu: "Соусы", categoryEn: "Sauces" },

  // Напитки
  { nameKa: "კოკა-კოლა 1.5ლიტრი", nameRu: "Кока-Кола 1.5 л", nameEn: "Coca-Cola 1.5L", descriptionKa: "", descriptionRu: "", priceGel: 7, discountGlovoPercent: 0, categoryKa: "გამაგრილებელი სასმელები", categoryRu: "Прохладительные напитки", categoryEn: "Cold Drinks" },
  { nameKa: "ფანტა", nameRu: "Фанта", nameEn: "Fanta", descriptionKa: "", descriptionRu: "", priceGel: 3.95, discountGlovoPercent: 0, categoryKa: "გამაგრილებელი სასმელები", categoryRu: "Прохладительные напитки", categoryEn: "Cold Drinks" },
  { nameKa: "კოკა-კოლა", nameRu: "Кока-Кола", nameEn: "Coca-Cola", descriptionKa: "", descriptionRu: "", priceGel: 3.95, discountGlovoPercent: 0, categoryKa: "გამაგრილებელი სასმელები", categoryRu: "Прохладительные напитки", categoryEn: "Cold Drinks" },
  { nameKa: "კოკა კოლა - ზერო", nameRu: "Кока-Кола Zero", nameEn: "Coca-Cola Zero", descriptionKa: "", descriptionRu: "", priceGel: 3.95, discountGlovoPercent: 0, categoryKa: "გამაგრილებელი სასმელები", categoryRu: "Прохладительные напитки", categoryEn: "Cold Drinks" },
  { nameKa: "წყალი", nameRu: "Вода", nameEn: "Water", descriptionKa: "", descriptionRu: "", priceGel: 3.5, discountGlovoPercent: 0, categoryKa: "გამაგრილებელი სასმელები", categoryRu: "Прохладительные напитки", categoryEn: "Cold Drinks" },

  // Вино и пиво
  { nameKa: "წითელი ძოწი Georgian Sun", nameRu: "Красное Дзоци Georgian Sun", nameEn: "Red Dzotsi Georgian Sun", descriptionKa: "0.750 მლ", descriptionRu: "0.75 л", priceGel: 32, discountGlovoPercent: 0, categoryKa: "ღვინო", categoryRu: "Вино", categoryEn: "Wine" },
  { nameKa: "დაისის წითელი Georgian Sun", nameRu: "Даисис Цители Georgian Sun", nameEn: "Daisi Red Georgian Sun", descriptionKa: "0.750 მლ", descriptionRu: "0.75 л", priceGel: 32, discountGlovoPercent: 0, categoryKa: "ღვინო", categoryRu: "Вино", categoryEn: "Wine" },
  { nameKa: "გაზაფხულის მწვანე Georgian Sun", nameRu: "Газапхулис Мцване Georgian Sun", nameEn: "Spring Green Georgian Sun", descriptionKa: "0.750 მლ", descriptionRu: "0.75 л", priceGel: 32, discountGlovoPercent: 0, categoryKa: "ღვინო", categoryRu: "Вино", categoryEn: "Wine" },
  { nameKa: "ქინძმარაული Georgian Sun", nameRu: "Киндзмараули Georgian Sun", nameEn: "Kindzmarauli Georgian Sun", descriptionKa: "0.750 მლ", descriptionRu: "0.75 л", priceGel: 32, discountGlovoPercent: 0, categoryKa: "ღვინო", categoryRu: "Вино", categoryEn: "Wine" },
  { nameKa: "ლუდი", nameRu: "Пиво", nameEn: "Beer", descriptionKa: "", descriptionRu: "", priceGel: 9, discountGlovoPercent: 0, categoryKa: "ღვინო", categoryRu: "Вино", categoryEn: "Wine" },
];

type ExistingCategory = {
  id: string;
  nameRu: string;
  items: { id: string; nameRu: string; priceGel: number }[];
};

export function GlovoImportPanel({
  venueId,
  existingCategories,
}: {
  venueId: string;
  existingCategories: ExistingCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    // По запросу — меню должно быть полностью идентично Glovo, поэтому
    // по умолчанию отмечены ВСЕ позиции, включая те, что похожи на уже
    // существующие блюда (галочку можно снять вручную при просмотре).
    GLOVO_ITEMS.forEach((_, i) => {
      init[i] = true;
    });
    return init;
  });
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const categories = Array.from(new Set(GLOVO_ITEMS.map((i) => i.categoryKa)));

  async function runImport() {
    setRunning(true);
    setDone(false);
    setLog([]);
    const catCache = new Map<string, string>();
    for (const c of existingCategories) {
      catCache.set(c.nameRu.trim().toLowerCase(), c.id);
    }

    const selected = GLOVO_ITEMS.map((item, i) => ({ item, i })).filter(({ i }) => checked[i]);

    for (const { item } of selected) {
      let categoryId = catCache.get(item.categoryRu.trim().toLowerCase());
      try {
        if (!categoryId) {
          const res = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              venueId,
              slug: slugifyLoose(item.categoryEn),
              nameKa: item.categoryKa,
              nameRu: item.categoryRu,
              nameEn: item.categoryEn,
            }),
          });
          if (!res.ok) {
            setLog((l) => [...l, `⚠ не удалось создать категорию: ${item.categoryRu}`]);
            continue;
          }
          const created = await res.json();
          categoryId = created.id;
          catCache.set(item.categoryRu.trim().toLowerCase(), categoryId!);
          setLog((l) => [...l, `+ категория: ${item.categoryRu}`]);
        }

        const itemRes = await fetch("/api/admin/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId,
            slug: slugifyLoose(item.nameEn),
            nameKa: item.nameKa,
            nameRu: item.nameRu,
            nameEn: item.nameEn,
            descriptionKa: item.descriptionKa,
            descriptionRu: item.descriptionRu,
            priceGel: item.priceGel,
          }),
        });
        if (!itemRes.ok) {
          setLog((l) => [...l, `⚠ не удалось создать блюдо: ${item.nameRu}`]);
          continue;
        }
        const createdItem = await itemRes.json();
        if (item.discountGlovoPercent > 0) {
          await fetch(`/api/admin/items/${createdItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discountGlovoPercent: item.discountGlovoPercent }),
          });
        }
        setLog((l) => [...l, `✓ добавлено: ${item.nameRu} — ${item.priceGel}₾${item.discountGlovoPercent ? ` (скидка Glovo ${item.discountGlovoPercent}%)` : ""}`]);
      } catch {
        setLog((l) => [...l, `⚠ ошибка сети при добавлении: ${item.nameRu}`]);
      }
    }

    setLog((l) => [...l, "", "Готово! Обновите страницу (F5), чтобы увидеть все изменения."]);
    setRunning(false);
    setDone(true);
  }

  if (!open) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          Импортировать меню с Glovo
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-800">Импорт меню с Glovo (одноразово)</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-500">
          Закрыть
        </button>
      </div>
      <p className="mb-3 text-xs text-neutral-600">
        Ниже — {GLOVO_ITEMS.length} позиций, собранные со страницы ресторана на Glovo. Позиции с пометкой
        «вероятно уже есть на сайте» отмечены отдельно (похоже, они уже добавлены под другим названием,
        например «Crusty Tavern ...») — если не хотите дубликаты, снимите с них галочку. Цена = обычная цена
        товара на Glovo (без скидки), скидка Glovo проставится в отдельное поле — цена на сайте/в ресторане не
        изменится и останется такой же везде.
      </p>

      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const all: Record<number, boolean> = {};
            GLOVO_ITEMS.forEach((_, i) => (all[i] = true));
            setChecked(all);
          }}
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs text-emerald-700"
        >
          Добавить все
        </button>
        <button
          type="button"
          onClick={() => {
            const none: Record<number, boolean> = {};
            GLOVO_ITEMS.forEach((_, i) => (none[i] = false));
            setChecked(none);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-600"
        >
          Снять все
        </button>
      </div>

      <div className="mb-3 max-h-96 overflow-y-auto rounded-lg border border-emerald-100 bg-white">
        {categories.map((catKa) => {
          const catItems = GLOVO_ITEMS.map((item, i) => ({ item, i })).filter(({ item }) => item.categoryKa === catKa);
          return (
            <div key={catKa} className="border-b border-neutral-100 p-2 last:border-b-0">
              <div className="mb-1 text-xs font-semibold text-neutral-500">{catItems[0].item.categoryRu}</div>
              {catItems.map(({ item, i }) => (
                <label key={i} className="flex items-start gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                    className="mt-1"
                  />
                  <span>
                    {item.nameRu} — {item.priceGel}₾
                    {item.discountGlovoPercent > 0 && ` (скидка Glovo ${item.discountGlovoPercent}%)`}
                    {item.likelyDuplicate && (
                      <span className="ml-2 text-amber-600">— вероятно уже есть на сайте</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={runImport}
        disabled={running}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {running ? "Импортируем..." : `Импортировать выбранное (${Object.values(checked).filter(Boolean).length})`}
      </button>

      {log.length > 0 && (
        <div className="mt-3 max-h-60 overflow-y-auto rounded-lg bg-white p-2 text-xs text-neutral-700">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {done && (
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Импорт завершён. Обновите страницу (клавиша F5), чтобы увидеть новые блюда.
        </p>
      )}
    </div>
  );
}
