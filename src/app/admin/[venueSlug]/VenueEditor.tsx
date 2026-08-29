"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlovoImportPanel } from "./GlovoImport";

// Код доступа для раздела "Дополнительные параметры" (ингредиенты,
// состав/себестоимость блюд) — защищает от случайного открытия.
const ADVANCED_PASSCODE = "2525";

type DisplayLocale = "ka" | "ru" | "en";

const LOCALE_LABEL: Record<DisplayLocale, string> = {
  ka: "ქართული",
  ru: "Русский",
  en: "English",
};

// Общая для категорий/блюд/ингредиентов/точки схема хранения названия —
// nameKa/nameRu/nameEn. Используем один и тот же ключ-маппинг везде.
const NAME_FIELD: Record<DisplayLocale, "nameKa" | "nameRu" | "nameEn"> = {
  ka: "nameKa",
  ru: "nameRu",
  en: "nameEn",
};
const ITEM_NAME_FIELD = NAME_FIELD;

const ITEM_DESC_FIELD: Record<DisplayLocale, "descriptionKa" | "descriptionRu" | "descriptionEn"> = {
  ka: "descriptionKa",
  ru: "descriptionRu",
  en: "descriptionEn",
};

// Словарь подписей интерфейса всей страницы админки — переключается тем
// же переключателем языка, что и названия/описания блюд, категорий,
// ингредиентов и название заведения. Названия сервисов (Wolt/Bolt/Glovo/
// Facebook/Instagram) не переводим — это бренды.
const UI: Record<DisplayLocale, Record<string, string>> = {
  ru: {
    langLabel: "Язык:",
    menuTitle: "Меню",
    viewAsGuest: "Посмотреть меню как клиент ↗",
    mapLabel: "Карта",
    editLink: "Изменить ссылку",
    aboutTitle: "О бренде / история (для ИИ-помощника)",
    hide: "Скрыть ▲",
    show: "Показать ▼",
    hidePlain: "Скрыть",
    aboutHelp:
      "Напишите здесь свободным текстом всё, что ИИ-помощник должен знать про бренд: когда и где он создан, когда и где открылось это заведение, история, интересные факты. Это не видно гостям — используется только помощником, чтобы отвечать на такие вопросы.",
    aboutPlaceholder:
      "Например: бренд создан в 2019 году в Тбилиси. Первый ресторан открылся в марте 2020 на ул. Руставели...",
    saving: "Сохраняем...",
    saved: "Сохранено ✓",
    saveError: "Ошибка, повторить",
    save: "Сохранить",
    cancel: "Отмена",
    ingredientsTitle: "Ингредиенты",
    disableAdvanced: "Отключить дополнительные параметры",
    ingredientSearchPlaceholder: "Поиск ингредиента по названию...",
    clearSearch: "Очистить поиск",
    showIngredients: "Показывать ингредиенты:",
    all: "Все",
    available: "Есть",
    unavailable: "Нет",
    shown: "Показано",
    of: "из",
    noIngredientsYet: "Пока нет ни одного ингредиента.",
    nothingFound: "Ничего не найдено под текущий поиск/фильтр.",
    ingredientNamePlaceholder: "Название ингредиента",
    pricePerUnit: "Цена за ед.",
    pricePerUnitPlaceholder: "Цена за ед. ₾",
    inStock: "В наличии",
    edit: "Изменить",
    delete: "Удалить",
    addIngredientTitle: "Добавить ингредиент",
    addIngredientLine1: "Добавить",
    addIngredientLine2: "ингредиент",
    newIngredientTitle: "Новый ингредиент",
    addIngredientBtn: "+ добавить ингредиент",
    collapseLine1: "Скрыть",
    collapseLine2: "параметры",
    addCategory: "+ Добавить категорию",
    addCategoryBtn: "Добавить категорию",
    newCategoryPrompt: "Название новой категории:",
    newCategoryNamePlaceholder: "Название новой категории",
    showItems: "Показывать блюда:",
    noItemsForFilter: "В этой категории нет блюд под текущий фильтр.",
    advancedParams: "Дополнительные параметры",
    hideAdvancedParams: "Скрыть дополнительные параметры",
    accessCodePrompt: "Введите код доступа:",
    wrongCode: "Неверный код",
    deselectAll: "Снять выделение",
    selectAllInCategory: "Выбрать все в категории",
    deleteCategory: "Удалить категорию",
    noPhoto: "нет фото",
    uploading: "Загружаем...",
    uploadPhoto: "Загрузить фото",
    uploadError: "Ошибка загрузки",
    removePhoto: "Удалить фото",
    namePlaceholder: "Название",
    descriptionPlaceholder: "Описание",
    photoUrlPlaceholder: "Или вставь ссылку на фото (необязательно)",
    price: "Цена",
    basePriceHint: "одна для сайта, ресторана и всех агрегаторов (Wolt/Bolt/Glovo)",
    notVisibleToGuests: "Не видно гостям — нет в наличии",
    discountsTitle: "Скидки",
    basePriceNote: "Базовая цена {price} ₾ одна везде — здесь только скидка/наценка (%) для площадки.",
    saveDiscounts: "Сохранить скидки",
    discountMenuLabel: "QR-меню",
    discountMenuTitle: "Скидка в ресторане/QR-меню",
    modifiersTitle: "Платные допы / модификаторы",
    modifiersHelp: "Например: «Соус» (выбрать один) или «Допы» (выбрать до нескольких) — гость выбирает их перед добавлением блюда в корзину.",
    addModifierGroup: "+ добавить группу",
    noModifiers: "Допы не заданы.",
    groupNamePlaceholder: "Название группы",
    selectionTypeSingle: "Один вариант (радио)",
    selectionTypeMultiple: "Несколько (чекбоксы)",
    maxSelectLabel: "макс. выбор",
    addModifierOption: "+ добавить опцию",
    optionNamePlaceholder: "Название опции",
    deleteGroup: "Удалить группу",
    saveModifiers: "Сохранить допы",
    compositionTitle: "Состав / себестоимость",
    addIngredientToRecipe: "+ добавить ингредиент в состав",
    noComposition: "Состав не указан.",
    moveUp: "Переместить выше",
    moveDown: "Переместить ниже",
    outOfStockBtn: "Нет в наличии",
    backInStockBtn: "Вернуть в наличие",
    toggleIngredientAvailTitle:
      "Поменяет наличие этого ингредиента везде — во всех блюдах, где он есть в составе",
    startTyping: "Начни вводить название...",
    nothingFoundShort: "Ничего не найдено",
    quantityPlaceholder: "Кол-во",
    add: "Добавить",
    addIngredientsFirst: "Сначала добавь ингредиенты в разделе выше.",
    costPrice: "Себестоимость",
    salePrice: "Цена продажи",
    margin: "Маржа",
    addItemBtn: "+ добавить позицию",
    selectedCount: "Выбрано позиций",
    bulkSetPrice: "Единая цена для всех позиций",
    bulkAdjustAmount: "Изменить цену на сумму",
    bulkAdjustPercent: "Изменить цены на %",
    bulkPlatformLabel: "Площадка:",
    bulkPlatformMenu: "Меню (сайт)",
    bulkPlatformAll: "Все платформы",
    bulkSetPercent: "Единый % для всех позиций",
    bulkAdjustPercentAmount: "Изменить % на величину",
    selectAllBtn: "Выбрать всё",
    addSign: "Дороже (+)",
    subtractSign: "Дешевле (-)",
    applyToPrice: "Применить к цене",
    applying: "Применяем...",
    resetPrice: "Сброс цены",
    resettingPrice: "Сбрасываем...",
    enable: "Включить (в наличии)",
    disable: "Отключить",
    tryAgain: "Ошибка, попробуй ещё раз",
    bulkSetPriceHelp: "Это значение будет установлено для всех выбранных позиций.",
    bulkAdjustAmountHelp:
      "Значение выбранных позиций изменится на указанную величину (например: было 10, прибавили 1 — станет 11).",
    bulkAdjustPercentHelp:
      "Цена выбранных позиций изменится на указанный % (например: было 10 ₾, прибавили 10% — станет 11 ₾).",
    aiPanelTitle: "🤖 Помощь ИИ (бета)",
    aiPanelHelp:
      "Можно спросить про меню, включать/выключать блюда и ингредиенты, менять цены, скидки для Wolt/Bolt/Glovo (в этой же панели), добавлять и удалять блюда/ингредиенты/категории, менять состав блюда. На сами приложения Wolt/Bolt/Glovo это не влияет — прямой связи с ними нет.",
    aiPlaceholder: "Например: отключить кока-колу",
    aiRun: "Выполнить",
    aiRunning: "Выполняю...",
    aiButtonTitle: "Помощь ИИ",
    confirmRemovePhoto: "Убрать фото у этой позиции?",
    confirmDeleteItem: "Удалить эту позицию?",
    confirmDeleteCategory: "Удалить эту категорию вместе со всеми позициями в ней?",
    confirmDeleteIngredient: "Удалить этот ингредиент? Он также пропадёт из состава всех блюд.",
    newItemNamePrompt: "Название новой позиции:",
    urlPrompt: "Ссылка на страницу этой точки на",
    aiInStock: "в наличии",
    aiOutOfStock: "нет в наличии",
    aiAvailable: "доступно",
    aiUnavailable: "недоступно",
    aiIngredientAdded: "добавлен ингредиент",
    aiIngredientDeleted: "удалён ингредиент",
    aiItemAdded: "добавлено блюдо",
    aiItemDeleted: "удалено блюдо",
    aiCategoryAdded: "добавлена категория",
    aiAddedToRecipe: "добавлен в состав",
    aiRemovedFromRecipe: "убран из состава",
    discount: "скидка",
    genericError: "Что-то пошло не так, попробуйте ещё раз.",
    aiDone: "Готово.",
    aiChangedLabel: "Изменено",
    aiConnectionError: "Не удалось связаться с сервером.",
    selectLabel: "Выбрать",
  },
  ka: {
    langLabel: "ენა:",
    menuTitle: "მენიუ",
    viewAsGuest: "მენიუს ნახვა სტუმრის სახით ↗",
    mapLabel: "რუკა",
    editLink: "ბმულის შეცვლა",
    aboutTitle: "ბრენდის შესახებ / ისტორია (AI დამხმარისთვის)",
    hide: "დამალვა ▲",
    show: "ჩვენება ▼",
    hidePlain: "დამალვა",
    aboutHelp:
      "დაწერეთ აქ თავისუფალი ტექსტით ყველაფერი, რაც AI დამხმარემ უნდა იცოდეს ბრენდის შესახებ: როდის და სად შეიქმნა, როდის და სად გაიხსნა ეს დაწესებულება, ისტორია, საინტერესო ფაქტები. სტუმრებს ეს არ ეჩვენებათ — მხოლოდ დამხმარე იყენებს ასეთ კითხვებზე პასუხის გასაცემად.",
    aboutPlaceholder:
      "მაგალითად: ბრენდი შეიქმნა 2019 წელს თბილისში. პირველი რესტორანი გაიხსნა 2020 წლის მარტში რუსთაველის ქუჩაზე...",
    saving: "ვინახავთ...",
    saved: "შენახულია ✓",
    saveError: "შეცდომა, სცადეთ ისევ",
    save: "შენახვა",
    cancel: "გაუქმება",
    ingredientsTitle: "ინგრედიენტები",
    disableAdvanced: "დამატებითი პარამეტრების გამორთვა",
    ingredientSearchPlaceholder: "ინგრედიენტის ძებნა სახელით...",
    clearSearch: "ძებნის გასუფთავება",
    showIngredients: "ჩვენება:",
    all: "ყველა",
    available: "არის",
    unavailable: "არ არის",
    shown: "ნაჩვენებია",
    of: "-დან",
    noIngredientsYet: "ჯერ არცერთი ინგრედიენტი არ არის.",
    nothingFound: "მოცემულ ძებნა/ფილტრზე ვერაფერი მოიძებნა.",
    ingredientNamePlaceholder: "ინგრედიენტის სახელი",
    pricePerUnit: "ფასი ერთეულზე",
    pricePerUnitPlaceholder: "ფასი ერთეულზე ₾",
    inStock: "მარაგშია",
    edit: "შეცვლა",
    delete: "წაშლა",
    addIngredientTitle: "ინგრედიენტის დამატება",
    addIngredientLine1: "ინგრედიენტის",
    addIngredientLine2: "დამატება",
    newIngredientTitle: "ახალი ინგრედიენტი",
    addIngredientBtn: "+ ინგრედიენტის დამატება",
    collapseLine1: "პარამეტრების",
    collapseLine2: "დამალვა",
    addCategory: "+ კატეგორიის დამატება",
    addCategoryBtn: "კატეგორიის დამატება",
    newCategoryPrompt: "ახალი კატეგორიის სახელი:",
    newCategoryNamePlaceholder: "ახალი კატეგორიის სახელი",
    showItems: "კერძების ჩვენება:",
    noItemsForFilter: "ამ კატეგორიაში მიმდინარე ფილტრით კერძები არ არის.",
    advancedParams: "დამატებითი პარამეტრები",
    hideAdvancedParams: "დამატებითი პარამეტრების დამალვა",
    accessCodePrompt: "შეიყვანეთ წვდომის კოდი:",
    wrongCode: "არასწორი კოდი",
    deselectAll: "მონიშვნის მოხსნა",
    selectAllInCategory: "კატეგორიაში ყველას მონიშვნა",
    deleteCategory: "კატეგორიის წაშლა",
    noPhoto: "ფოტო არ არის",
    uploading: "იტვირთება...",
    uploadPhoto: "ფოტოს ატვირთვა",
    uploadError: "ატვირთვის შეცდომა",
    removePhoto: "ფოტოს წაშლა",
    namePlaceholder: "სახელი",
    descriptionPlaceholder: "აღწერა",
    photoUrlPlaceholder: "ან ჩასვით ფოტოს ბმული (არასავალდებულო)",
    price: "ფასი",
    basePriceHint: "ერთია საიტისთვის, რესტორნისთვის და ყველა აგრეგატორისთვის (Wolt/Bolt/Glovo)",
    notVisibleToGuests: "სტუმრებს არ უჩანთ — არ არის მარაგში",
    discountsTitle: "ფასდაკლებები",
    basePriceNote: "საბაზისო ფასი {price} ₾ ერთია ყველგან — აქ მხოლოდ ფასდაკლება/დანამატი (%) პლატფორმისთვის.",
    saveDiscounts: "ფასდაკლებების შენახვა",
    discountMenuLabel: "QR-მენიუ",
    discountMenuTitle: "ფასდაკლება რესტორანში/QR-მენიუზე",
    modifiersTitle: "ფასიანი დანამატები / მოდიფიკატორები",
    modifiersHelp: "მაგ: «სოუსი» (აირჩიეთ ერთი) ან «დანამატები» (აირჩიეთ რამდენიმე) — სტუმარი ირჩევს კალათაში დამატებამდე.",
    addModifierGroup: "+ ჯგუფის დამატება",
    noModifiers: "დანამატები არ არის მითითებული.",
    groupNamePlaceholder: "ჯგუფის სახელი",
    selectionTypeSingle: "ერთი ვარიანტი (რადიო)",
    selectionTypeMultiple: "რამდენიმე (checkbox)",
    maxSelectLabel: "მაქს. არჩევანი",
    addModifierOption: "+ ოფციის დამატება",
    optionNamePlaceholder: "ოფციის სახელი",
    deleteGroup: "ჯგუფის წაშლა",
    saveModifiers: "დანამატების შენახვა",
    compositionTitle: "შემადგენლობა / თვითღირებულება",
    addIngredientToRecipe: "+ ინგრედიენტის დამატება შემადგენლობაში",
    noComposition: "შემადგენლობა მითითებული არ არის.",
    moveUp: "აწევა",
    moveDown: "ჩამოწევა",
    outOfStockBtn: "არ არის მარაგში",
    backInStockBtn: "მარაგში დაბრუნება",
    toggleIngredientAvailTitle:
      "შეცვლის ამ ინგრედიენტის მარაგში ყოფნას ყველგან — ყველა კერძში, სადაც ის შემადგენლობაშია",
    startTyping: "დაიწყეთ სახელის აკრეფა...",
    nothingFoundShort: "ვერაფერი მოიძებნა",
    quantityPlaceholder: "რაოდ.",
    add: "დამატება",
    addIngredientsFirst: "ჯერ დაამატეთ ინგრედიენტები ზემოთ მოცემულ განყოფილებაში.",
    costPrice: "თვითღირებულება",
    salePrice: "გასაყიდი ფასი",
    margin: "მარჟა",
    addItemBtn: "+ პოზიციის დამატება",
    selectedCount: "მონიშნულია პოზიცია",
    bulkSetPrice: "ერთიანი ფასი ყველა პოზიციისთვის",
    bulkAdjustAmount: "ფასის შეცვლა თანხით",
    bulkAdjustPercent: "ფასების შეცვლა %-ით",
    bulkPlatformLabel: "პლატფორმა:",
    bulkPlatformMenu: "მენიუ (საიტი)",
    bulkPlatformAll: "ყველა პლატფორმა",
    bulkSetPercent: "ერთიანი % ყველა პოზიციისთვის",
    bulkAdjustPercentAmount: "%-ის შეცვლა სიდიდით",
    selectAllBtn: "ყველას მონიშვნა",
    addSign: "უფრო ძვირი (+)",
    subtractSign: "უფრო იაფი (-)",
    applyToPrice: "ფასზე გამოყენება",
    applying: "სრულდება...",
    resetPrice: "ფასის სბროსი",
    resettingPrice: "სბროსი...",
    enable: "ჩართვა (მარაგშია)",
    disable: "გამორთვა",
    tryAgain: "შეცდომა, სცადეთ ისევ",
    bulkSetPriceHelp: "ეს მნიშვნელობა დაწესდება ყველა მონიშნულ პოზიციაზე.",
    bulkAdjustAmountHelp:
      "მონიშნული პოზიციების მნიშვნელობა შეიცვლება მითითებული სიდიდით (მაგ.: იყო 10, დაამატეთ 1 — გახდება 11).",
    bulkAdjustPercentHelp:
      "მონიშნული პოზიციების ფასი შეიცვლება მითითებული %-ით (მაგ.: იყო 10 ₾, დაამატეთ 10% — გახდება 11 ₾).",
    aiPanelTitle: "🤖 AI დახმარება (ბეტა)",
    aiPanelHelp:
      "შეგიძლიათ იკითხოთ მენიუზე, ჩართოთ/გამორთოთ კერძები და ინგრედიენტები, შეცვალოთ ფასები, ფასდაკლებები Wolt/Bolt/Glovo-სთვის (ამავე პანელში), დაამატოთ და წაშალოთ კერძები/ინგრედიენტები/კატეგორიები, შეცვალოთ კერძის შემადგენლობა. თავად Wolt/Bolt/Glovo აპლიკაციებზე ეს არ მოქმედებს — მათთან პირდაპირი კავშირი არ არსებობს.",
    aiPlaceholder: "მაგალითად: კოკა-კოლას გამორთვა",
    aiRun: "შესრულება",
    aiRunning: "სრულდება...",
    aiButtonTitle: "AI დახმარება",
    confirmRemovePhoto: "წავშალო ფოტო ამ პოზიციისთვის?",
    confirmDeleteItem: "წავშალო ეს პოზიცია?",
    confirmDeleteCategory: "წავშალო ეს კატეგორია მასში არსებულ ყველა პოზიციასთან ერთად?",
    confirmDeleteIngredient: "წავშალო ეს ინგრედიენტი? ის ასევე გაქრება ყველა კერძის შემადგენლობიდან.",
    newItemNamePrompt: "ახალი პოზიციის სახელი:",
    urlPrompt: "ბმული ამ წერტილის გვერდზე —",
    aiInStock: "მარაგშია",
    aiOutOfStock: "არ არის მარაგში",
    aiAvailable: "ხელმისაწვდომია",
    aiUnavailable: "მიუწვდომელია",
    aiIngredientAdded: "დაემატა ინგრედიენტი",
    aiIngredientDeleted: "წაიშალა ინგრედიენტი",
    aiItemAdded: "დაემატა კერძი",
    aiItemDeleted: "წაიშალა კერძი",
    aiCategoryAdded: "დაემატა კატეგორია",
    aiAddedToRecipe: "დაემატა შემადგენლობაში —",
    aiRemovedFromRecipe: "მოიხსნა შემადგენლობიდან —",
    discount: "ფასდაკლება",
    genericError: "დაფიქსირდა შეცდომა, სცადეთ ისევ.",
    aiDone: "მზადაა.",
    aiChangedLabel: "შეიცვალა",
    aiConnectionError: "სერვერთან დაკავშირება ვერ მოხერხდა.",
    selectLabel: "მონიშვნა",
  },
  en: {
    langLabel: "Language:",
    menuTitle: "Menu",
    viewAsGuest: "View menu as a guest ↗",
    mapLabel: "Map",
    editLink: "Edit link",
    aboutTitle: "About the brand / history (for the AI assistant)",
    hide: "Hide ▲",
    show: "Show ▼",
    hidePlain: "Hide",
    aboutHelp:
      "Write here in free text everything the AI assistant should know about the brand: when and where it was created, when and where this place opened, history, interesting facts. Guests don't see this — only the assistant uses it to answer such questions.",
    aboutPlaceholder:
      "For example: the brand was created in 2019 in Tbilisi. The first restaurant opened in March 2020 on Rustaveli St...",
    saving: "Saving...",
    saved: "Saved ✓",
    saveError: "Error, try again",
    save: "Save",
    cancel: "Cancel",
    ingredientsTitle: "Ingredients",
    disableAdvanced: "Turn off advanced settings",
    ingredientSearchPlaceholder: "Search ingredient by name...",
    clearSearch: "Clear search",
    showIngredients: "Show ingredients:",
    all: "All",
    available: "In stock",
    unavailable: "Out of stock",
    shown: "Shown",
    of: "of",
    noIngredientsYet: "No ingredients yet.",
    nothingFound: "Nothing found for this search/filter.",
    ingredientNamePlaceholder: "Ingredient name",
    pricePerUnit: "Price per unit",
    pricePerUnitPlaceholder: "Price per unit ₾",
    inStock: "In stock",
    edit: "Edit",
    delete: "Delete",
    addIngredientTitle: "Add ingredient",
    addIngredientLine1: "Add",
    addIngredientLine2: "ingredient",
    newIngredientTitle: "New ingredient",
    addIngredientBtn: "+ add ingredient",
    collapseLine1: "Hide",
    collapseLine2: "settings",
    addCategory: "+ Add category",
    addCategoryBtn: "Add category",
    newCategoryPrompt: "New category name:",
    newCategoryNamePlaceholder: "New category name",
    showItems: "Show items:",
    noItemsForFilter: "No items in this category match the current filter.",
    advancedParams: "Advanced settings",
    hideAdvancedParams: "Hide advanced settings",
    accessCodePrompt: "Enter access code:",
    wrongCode: "Wrong code",
    deselectAll: "Deselect all",
    selectAllInCategory: "Select all in category",
    deleteCategory: "Delete category",
    noPhoto: "no photo",
    uploading: "Uploading...",
    uploadPhoto: "Upload photo",
    uploadError: "Upload error",
    removePhoto: "Remove photo",
    namePlaceholder: "Name",
    descriptionPlaceholder: "Description",
    photoUrlPlaceholder: "Or paste a photo link (optional)",
    price: "Price",
    basePriceHint: "same for the site, the restaurant, and all aggregators (Wolt/Bolt/Glovo)",
    notVisibleToGuests: "Not visible to guests — out of stock",
    discountsTitle: "Discounts",
    basePriceNote: "Base price {price} ₾ is the same everywhere — only the discount/markup (%) for the platform is set here.",
    saveDiscounts: "Save discounts",
    discountMenuLabel: "QR menu",
    discountMenuTitle: "Discount in the restaurant / QR menu",
    modifiersTitle: "Paid add-ons / modifiers",
    modifiersHelp: "E.g. \"Sauce\" (choose one) or \"Add-ons\" (choose up to several) — the guest picks these before adding the item to the cart.",
    addModifierGroup: "+ add group",
    noModifiers: "No modifiers set.",
    groupNamePlaceholder: "Group name",
    selectionTypeSingle: "One option (radio)",
    selectionTypeMultiple: "Several (checkboxes)",
    maxSelectLabel: "max select",
    addModifierOption: "+ add option",
    optionNamePlaceholder: "Option name",
    deleteGroup: "Delete group",
    saveModifiers: "Save modifiers",
    compositionTitle: "Recipe / cost",
    addIngredientToRecipe: "+ add ingredient to recipe",
    noComposition: "Recipe not specified.",
    moveUp: "Move up",
    moveDown: "Move down",
    outOfStockBtn: "Out of stock",
    backInStockBtn: "Back in stock",
    toggleIngredientAvailTitle:
      "Changes this ingredient's availability everywhere — in every dish that uses it",
    startTyping: "Start typing a name...",
    nothingFoundShort: "Nothing found",
    quantityPlaceholder: "Qty",
    add: "Add",
    addIngredientsFirst: "First add ingredients in the section above.",
    costPrice: "Cost",
    salePrice: "Sale price",
    margin: "Margin",
    addItemBtn: "+ add item",
    selectedCount: "Items selected",
    bulkSetPrice: "Same price for all items",
    bulkAdjustAmount: "Adjust price by amount",
    bulkAdjustPercent: "Adjust prices by %",
    bulkPlatformLabel: "Platform:",
    bulkPlatformMenu: "Menu (site)",
    bulkPlatformAll: "All platforms",
    bulkSetPercent: "Same % for all items",
    bulkAdjustPercentAmount: "Adjust % by an amount",
    selectAllBtn: "Select all",
    addSign: "More expensive (+)",
    subtractSign: "Cheaper (-)",
    applyToPrice: "Apply to price",
    applying: "Applying...",
    resetPrice: "Reset price",
    resettingPrice: "Resetting...",
    enable: "Enable (in stock)",
    disable: "Disable",
    tryAgain: "Error, try again",
    bulkSetPriceHelp: "This value will be set for all selected items.",
    bulkAdjustAmountHelp:
      "The value of selected items will change by the given amount (e.g.: was 10, added 1 — becomes 11).",
    bulkAdjustPercentHelp:
      "The price of selected items will change by the given % (e.g.: was 10 ₾, added 10% — becomes 11 ₾).",
    aiPanelTitle: "🤖 AI Assistant (beta)",
    aiPanelHelp:
      "You can ask about the menu, turn items and ingredients on/off, change prices, discounts for Wolt/Bolt/Glovo (in this same panel), add and remove items/ingredients/categories, change an item's recipe. This does not affect the Wolt/Bolt/Glovo apps themselves — there's no direct connection to them.",
    aiPlaceholder: "For example: disable Coca-Cola",
    aiRun: "Run",
    aiRunning: "Running...",
    aiButtonTitle: "AI Assistant",
    confirmRemovePhoto: "Remove the photo for this item?",
    confirmDeleteItem: "Delete this item?",
    confirmDeleteCategory: "Delete this category together with all its items?",
    confirmDeleteIngredient: "Delete this ingredient? It will also disappear from the recipe of all dishes.",
    newItemNamePrompt: "New item name:",
    urlPrompt: "Link to this venue's page on",
    aiInStock: "in stock",
    aiOutOfStock: "out of stock",
    aiAvailable: "available",
    aiUnavailable: "unavailable",
    aiIngredientAdded: "added ingredient",
    aiIngredientDeleted: "deleted ingredient",
    aiItemAdded: "added item",
    aiItemDeleted: "deleted item",
    aiCategoryAdded: "added category",
    aiAddedToRecipe: "added to recipe of",
    aiRemovedFromRecipe: "removed from recipe of",
    discount: "discount",
    genericError: "Something went wrong, try again.",
    aiDone: "Done.",
    aiChangedLabel: "Changed",
    aiConnectionError: "Could not reach the server.",
    selectLabel: "Select",
  },
};

type Ingredient = {
  id: string;
  name: string;
  nameKa: string;
  nameRu: string;
  nameEn: string;
  unit: string;
  pricePerUnit: number;
  available: boolean;
};

type RecipeLine = {
  id: string;
  ingredientId: string;
  quantity: number;
  ingredient: Ingredient;
};

type ModifierOptionDraft = {
  id: string;
  nameKa: string;
  nameRu: string;
  nameEn: string;
  priceGel: number;
};

type ModifierGroupDraft = {
  id: string;
  nameKa: string;
  nameRu: string;
  nameEn: string;
  selectionType: "SINGLE" | "MULTIPLE";
  maxSelect: number;
  options: ModifierOptionDraft[];
};

type Item = {
  id: string;
  slug: string;
  nameKa: string;
  nameRu: string;
  nameEn: string;
  descriptionKa: string;
  descriptionRu: string;
  descriptionEn: string;
  // Базовая цена — одна и та же везде (сайт, ресторан, все агрегаторы).
  // Разница на площадке — только скидка (%), см. discount*Percent ниже.
  priceGel: number;
  discountMenuPercent: number | null;
  discountWoltPercent: number | null;
  discountBoltPercent: number | null;
  discountGlovoPercent: number | null;
  available: boolean;
  photoUrl: string;
  recipeItems: RecipeLine[];
  // Платные допы/модификаторы (см. ModifierGroup/ModifierOption в схеме) —
  // редактируются как группа целиком, сохраняются полной заменой на сервере.
  modifierGroups: ModifierGroupDraft[];
};

type Category = {
  id: string;
  slug: string;
  nameKa: string;
  nameRu: string;
  nameEn: string;
  items: Item[];
};

type VenueData = {
  id: string;
  slug: string;
  nameKa: string;
  nameRu: string;
  nameEn: string;
  urlWolt: string;
  urlBolt: string;
  urlGlovo: string;
  urlFacebook: string;
  urlInstagram: string;
  urlMaps: string;
  // Ссылка на форму отзыва в Google — когда задана, гостю после успешного
  // заказа мягко предлагается оставить отзыв (см. MenuView).
  urlGoogleReview: string;
  // Свободный текст про бренд/точку (когда и где создан, когда и где
  // открылись и т.п.) — читает ИИ-помощник, чтобы отвечать на вопросы
  // про историю заведения.
  aboutText: string;
  categories: Category[];
};

const UNIT_OPTIONS = ["г", "кг", "мл", "л", "шт"];

// Грузинский алфавит — для колонки быстрого перехода к букве в списке
// ингредиентов (как в приложениях-контактах). Этот навигатор осмыслен
// только когда названия показываются по-грузински — на русском/английском
// языке список просто идёт единым отсортированным блоком без букв.
const GEORGIAN_ALPHABET = [
  "ა", "ბ", "გ", "დ", "ე", "ვ", "ზ", "თ", "ი", "კ", "ლ", "მ", "ნ", "ო", "პ",
  "ჟ", "რ", "ს", "ტ", "უ", "ფ", "ქ", "ღ", "ყ", "შ", "ჩ", "ც", "ძ", "წ", "ჭ",
  "ხ", "ჯ", "ჰ",
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `item-${Date.now()}`;
}

export function VenueEditor({
  venue: initialVenue,
  ingredients: initialIngredients,
}: {
  venue: VenueData;
  ingredients: Ingredient[];
}) {
  const [venue, setVenue] = useState(initialVenue);
  const [status, setStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [photoStatus, setPhotoStatus] = useState<Record<string, "uploading" | "error">>({});

  const [ingredients, setIngredients] = useState(initialIngredients);
  const [showAboutBox, setShowAboutBox] = useState(false);
  const [aboutStatus, setAboutStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [ingredientStatus, setIngredientStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState(UNIT_OPTIONS[0]);
  const [newIngredientPrice, setNewIngredientPrice] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientAvailabilityFilter, setIngredientAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");
  const [editSnapshots, setEditSnapshots] = useState<Record<string, Ingredient>>({});
  const [activeIngredientLetter, setActiveIngredientLetter] = useState<string | null>(null);
  const [showFloatingAddIngredient, setShowFloatingAddIngredient] = useState(false);

  // "Помощь ИИ" — свободный текст уходит в /api/admin/ai-assistant (Google
  // Gemini), который распознаёт вопросы про меню и действия: включение/
  // выключение, изменение цен, добавление/удаление блюд, ингредиентов,
  // категорий, изменение состава блюда. Сервер только распознаёт и
  // проверяет действия — применяет их этот компонент, через те же
  // маршруты, что и обычные клики в интерфейсе. На платформах Wolt/Bolt/
  // Glovo это НЕ отражается — это отдельные сервисы, для связи с ними
  // нужен официальный доступ от каждого из них.
  const [aiCommand, setAiCommand] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [recipePickerFor, setRecipePickerFor] = useState<string | null>(null);
  const [recipePickIngredientId, setRecipePickIngredientId] = useState("");
  const [recipePickQuantity, setRecipePickQuantity] = useState("");
  const [recipePickSearch, setRecipePickSearch] = useState("");

  // Открытая по клику панель редактирования допов/модификаторов — по
  // одному блюду за раз, как и панель состава выше.
  const [modifierPanelFor, setModifierPanelFor] = useState<string | null>(null);
  const [modifierStatus, setModifierStatus] = useState<Record<string, "saving" | "saved" | "error">>({});

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  // "Дополнительные параметры" — раздел "Ингредиенты" сверху страницы и
  // блок "Состав / себестоимость" внутри каждой карточки блюда скрыты по
  // умолчанию и открываются только после ввода кода доступа (ADVANCED_PASSCODE)
  // — чтобы эти данные (себестоимость, состав) не были видны случайно
  // всем, кто открывает панель.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Язык, на котором показывается и редактируется ВСЯ страница разом —
  // название точки, подписи интерфейса, названия/описания категорий,
  // блюд и ингредиентов (переключатель наверху).
  const [displayLocale, setDisplayLocale] = useState<"ka" | "ru" | "en">("ru");
  const t = UI[displayLocale];
  const [bulkOp, setBulkOp] = useState<"setPrice" | "adjustPriceAmount" | "adjustPricePercent">(
    "setPrice"
  );
  // "menu" — основная цена (одна везде); "all" — сразу все площадки
  // (QR-меню + Wolt + Bolt + Glovo); иначе действие применяется не к
  // цене, а к скидке/наценке (%) блюда на этой площадке.
  const [bulkPlatform, setBulkPlatform] = useState<"menu" | "qr" | "wolt" | "bolt" | "glovo" | "all">(
    "menu"
  );
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSign, setBulkSign] = useState<"add" | "subtract">("add");
  const [bulkStatus, setBulkStatus] = useState<"applying" | "resetting" | "error" | null>(null);

  // Поля скидок по каждой площадке — используется и для "Все платформы"
  // в массовых операциях (bulk), и для кнопки сброса цены.
  const PLATFORM_DISCOUNT_FIELDS: Record<
    string,
    ("discountMenuPercent" | "discountWoltPercent" | "discountBoltPercent" | "discountGlovoPercent")[]
  > = {
    qr: ["discountMenuPercent"],
    wolt: ["discountWoltPercent"],
    bolt: ["discountBoltPercent"],
    glovo: ["discountGlovoPercent"],
    all: ["discountMenuPercent", "discountWoltPercent", "discountBoltPercent", "discountGlovoPercent"],
  };

  // Название ингредиента на текущем языке — с откатом на старое единое
  // поле name (у ингредиентов, добавленных до языкового переключателя,
  // nameKa/nameRu/nameEn ещё не заполнены отдельно).
  function ingName(ing: Ingredient) {
    return (ing[NAME_FIELD[displayLocale]] || ing.name || "").trim();
  }

  function toggleSelected(itemId: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleSelectAllInCategory(category: Category) {
    setSelected((s) => {
      const next = new Set(s);
      const allSelected = category.items.every((i) => next.has(i.id));
      category.items.forEach((i) => (allSelected ? next.delete(i.id) : next.add(i.id)));
      return next;
    });
  }

  function applyLocalUpdates(
    updatedItems: {
      id: string;
      priceGel: number;
      available: boolean;
      discountMenuPercent: number | null;
      discountWoltPercent: number | null;
      discountBoltPercent: number | null;
      discountGlovoPercent: number | null;
    }[]
  ) {
    const byId = new Map(updatedItems.map((i) => [i.id, i]));
    setVenue((v) => ({
      ...v,
      categories: v.categories.map((c) => ({
        ...c,
        items: c.items.map((i) => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i)),
      })),
    }));
  }

  async function applyBulkPrice() {
    const value = parseFloat(bulkValue);
    if (selected.size === 0 || Number.isNaN(value)) return;
    if (bulkPlatform === "all") return; // "Все платформы" — только для сброса, не для этой кнопки
    // "Дешевле (-)"/"Дороже (+)" всегда должны означать направление
    // ИТОГОВОЙ ЦЕНЫ. Для основной цены это просто -value/+value. Но для
    // скидки на площадке (%) связь обратная: цена ниже — значит % (скидка)
    // должен вырасти, а не уменьшиться — поэтому знак здесь инвертирован.
    let signedValue = value;
    if (bulkOp !== "setPrice") {
      const isPercentPlatform = bulkPlatform !== "menu";
      signedValue = isPercentPlatform
        ? bulkSign === "subtract"
          ? value
          : -value
        : bulkSign === "subtract"
        ? -value
        : value;
    }
    setBulkStatus("applying");
    try {
      const res = await fetch("/api/admin/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: Array.from(selected),
          action: bulkOp,
          value: signedValue,
          platform: bulkPlatform,
        }),
      });
      if (!res.ok) throw new Error();
      const { items } = await res.json();
      applyLocalUpdates(items);
      setBulkStatus(null);
      setBulkValue("");
    } catch {
      setBulkStatus("error");
    }
  }

  // Сброс цены (скидки) на выбранной площадке — или сразу на всех
  // площадках, если выбрано "Все платформы" — для всех отмеченных
  // позиций. Обнуляет discount*Percent (возвращает к базовой цене
  // priceGel), не трогая саму базовую цену.
  async function resetBulkPrices() {
    if (selected.size === 0 || bulkPlatform === "menu") return;
    const fields = PLATFORM_DISCOUNT_FIELDS[bulkPlatform];
    if (!fields) return;
    setBulkStatus("resetting");
    try {
      const itemsToReset = allItemsFlat.filter((i) => selected.has(i.id));
      for (const item of itemsToReset) {
        const patch: Partial<Item> = {};
        fields.forEach((f) => {
          (patch as any)[f] = null;
        });
        const cat = venue.categories.find((c) => c.items.some((i) => i.id === item.id));
        if (cat) updateItem(cat.id, item.id, patch);
        await saveItem({ ...item, ...patch });
      }
      setBulkStatus(null);
    } catch {
      setBulkStatus("error");
    }
  }

  async function applyBulkAvailable(available: boolean) {
    if (selected.size === 0) return;
    setBulkStatus("applying");
    try {
      const res = await fetch("/api/admin/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: Array.from(selected), action: "setAvailable", value: available }),
      });
      if (!res.ok) throw new Error();
      const { items } = await res.json();
      applyLocalUpdates(items);
      setBulkStatus(null);
    } catch {
      setBulkStatus("error");
    }
  }

  function updateItem(categoryId: string, itemId: string, patch: Partial<Item>) {
    setVenue((v) => ({
      ...v,
      categories: v.categories.map((c) =>
        c.id !== categoryId
          ? c
          : { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
      ),
    }));
  }

  async function saveItem(item: Item) {
    setStatus((s) => ({ ...s, [item.id]: "saving" }));
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKa: item.nameKa,
          nameRu: item.nameRu,
          nameEn: item.nameEn,
          descriptionKa: item.descriptionKa,
          descriptionRu: item.descriptionRu,
          descriptionEn: item.descriptionEn,
          priceGel: item.priceGel,
          discountMenuPercent: item.discountMenuPercent,
          discountWoltPercent: item.discountWoltPercent,
          discountBoltPercent: item.discountBoltPercent,
          discountGlovoPercent: item.discountGlovoPercent,
          available: item.available,
          photoUrl: item.photoUrl || null,
          // Полная замена: сервер удаляет старые группы/опции и создаёт эти
          // заново — проще и надёжнее гранулярного CRUD для маленького
          // списка допов у блюда.
          modifierGroups: item.modifierGroups.map((g) => ({
            nameKa: g.nameKa,
            nameRu: g.nameRu,
            nameEn: g.nameEn,
            selectionType: g.selectionType,
            maxSelect: g.maxSelect,
            options: g.options.map((o) => ({
              nameKa: o.nameKa,
              nameRu: o.nameRu,
              nameEn: o.nameEn,
              priceGel: o.priceGel,
            })),
          })),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus((s) => ({ ...s, [item.id]: "saved" }));
      setTimeout(() => setStatus((s) => ({ ...s, [item.id]: undefined as any })), 1500);
    } catch {
      setStatus((s) => ({ ...s, [item.id]: "error" }));
    }
  }

  // Допы/модификаторы редактируются локально (как черновик) и уходят на
  // сервер только по кнопке "Сохранить" — полной заменой, вместе с
  // остальными полями блюда (см. saveItem выше). id новых групп/опций —
  // просто временные ключи для React, сервер выдаёт свои настоящие id.
  function addModifierGroup(categoryId: string, item: Item) {
    const group: ModifierGroupDraft = {
      id: `new-${Date.now()}`,
      nameKa: "",
      nameRu: "",
      nameEn: "",
      selectionType: "SINGLE",
      maxSelect: 1,
      options: [],
    };
    updateItem(categoryId, item.id, { modifierGroups: [...item.modifierGroups, group] });
  }

  function updateModifierGroup(
    categoryId: string,
    item: Item,
    groupId: string,
    patch: Partial<ModifierGroupDraft>
  ) {
    updateItem(categoryId, item.id, {
      modifierGroups: item.modifierGroups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    });
  }

  function removeModifierGroup(categoryId: string, item: Item, groupId: string) {
    updateItem(categoryId, item.id, {
      modifierGroups: item.modifierGroups.filter((g) => g.id !== groupId),
    });
  }

  function addModifierOption(categoryId: string, item: Item, groupId: string) {
    const option: ModifierOptionDraft = {
      id: `new-${Date.now()}`,
      nameKa: "",
      nameRu: "",
      nameEn: "",
      priceGel: 0,
    };
    updateItem(categoryId, item.id, {
      modifierGroups: item.modifierGroups.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, option] } : g
      ),
    });
  }

  function updateModifierOption(
    categoryId: string,
    item: Item,
    groupId: string,
    optionId: string,
    patch: Partial<ModifierOptionDraft>
  ) {
    updateItem(categoryId, item.id, {
      modifierGroups: item.modifierGroups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) }
      ),
    });
  }

  function removeModifierOption(categoryId: string, item: Item, groupId: string, optionId: string) {
    updateItem(categoryId, item.id, {
      modifierGroups: item.modifierGroups.map((g) =>
        g.id !== groupId ? g : { ...g, options: g.options.filter((o) => o.id !== optionId) }
      ),
    });
  }

  async function saveModifiers(item: Item) {
    setModifierStatus((s) => ({ ...s, [item.id]: "saving" }));
    await saveItem(item);
    setModifierStatus((s) => ({ ...s, [item.id]: "saved" }));
    setTimeout(() => setModifierStatus((s) => ({ ...s, [item.id]: undefined as any })), 1500);
  }

  async function uploadPhoto(categoryId: string, item: Item, file: File) {
    setPhotoStatus((s) => ({ ...s, [item.id]: "uploading" }));
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${item.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("menu-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
      updateItem(categoryId, item.id, { photoUrl: data.publicUrl });
      await saveItem({ ...item, photoUrl: data.publicUrl });
      setPhotoStatus((s) => ({ ...s, [item.id]: undefined as any }));
    } catch {
      setPhotoStatus((s) => ({ ...s, [item.id]: "error" }));
    }
  }

  async function removePhoto(categoryId: string, item: Item) {
    if (!confirm(t.confirmRemovePhoto)) return;
    updateItem(categoryId, item.id, { photoUrl: "" });
    await saveItem({ ...item, photoUrl: "" });
  }

  async function deleteItem(categoryId: string, itemId: string) {
    if (!confirm(t.confirmDeleteItem)) return;
    const res = await fetch(`/api/admin/items/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      setVenue((v) => ({
        ...v,
        categories: v.categories.map((c) =>
          c.id !== categoryId ? c : { ...c, items: c.items.filter((i) => i.id !== itemId) }
        ),
      }));
      setSelected((s) => {
        const next = new Set(s);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function addItem(category: Category) {
    const name = prompt(t.newItemNamePrompt);
    if (!name) return;
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: category.id,
        slug: slugify(name),
        nameKa: name,
        nameRu: name,
        nameEn: name,
        priceGel: 0,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setVenue((v) => ({
        ...v,
        categories: v.categories.map((c) =>
          c.id !== category.id ? c : { ...c, items: [...c.items, { ...created, recipeItems: [], modifierGroups: [] }] }
        ),
      }));
    }
  }

  async function deleteCategory(categoryId: string) {
    if (!confirm(t.confirmDeleteCategory)) return;
    const category = venue.categories.find((c) => c.id === categoryId);
    const res = await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
    if (res.ok) {
      setVenue((v) => ({
        ...v,
        categories: v.categories.filter((c) => c.id !== categoryId),
      }));
      if (category) {
        setSelected((s) => {
          const next = new Set(s);
          category.items.forEach((i) => next.delete(i.id));
          return next;
        });
      }
    }
  }

  async function addCategory(nameOverride?: string) {
    const name = (nameOverride ?? newCategoryName).trim();
    if (!name) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId: venue.id,
        slug: slugify(name),
        nameKa: name,
        nameRu: name,
        nameEn: name,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setVenue((v) => ({ ...v, categories: [...v.categories, { ...created, items: [] }] }));
      setNewCategoryName("");
    }
  }

  // Ссылка на страницу этой точки на Wolt/Bolt/Glovo или в соцсетях —
  // просто сохраняется и открывается кнопкой, автоматически ничего на
  // этих платформах не меняет (прямой связи с их API нет).
  async function saveVenueUrl(
    key:
      | "urlWolt"
      | "urlBolt"
      | "urlGlovo"
      | "urlFacebook"
      | "urlInstagram"
      | "urlMaps"
      | "urlGoogleReview",
    label: string
  ) {
    const current = venue[key];
    const next = prompt(`${t.urlPrompt} ${label}:`, current);
    if (next === null) return;
    setVenue((v) => ({ ...v, [key]: next }));
    await fetch(`/api/admin/venues/${venue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
  }

  // Свободный текст про бренд/точку — читает только ИИ-помощник (см.
  // /api/admin/ai-assistant), чтобы отвечать на вопросы вроде "когда и
  // где открылись". На гостевое меню и на сами площадки это не влияет.
  async function saveAboutText() {
    setAboutStatus("saving");
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutText: venue.aboutText }),
      });
      if (!res.ok) throw new Error();
      setAboutStatus("saved");
      setTimeout(() => setAboutStatus(null), 1500);
    } catch {
      setAboutStatus("error");
    }
  }

  function updateIngredientLocal(id: string, patch: Partial<Ingredient>) {
    setIngredients((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    // Держим копии ингредиента в строках состава блюд синхронными,
    // чтобы себестоимость и наличие пересчитывались сразу на экране.
    setVenue((v) => ({
      ...v,
      categories: v.categories.map((c) => ({
        ...c,
        items: c.items.map((item) => ({
          ...item,
          recipeItems: item.recipeItems.map((ri) =>
            ri.ingredientId === id ? { ...ri, ingredient: { ...ri.ingredient, ...patch } } : ri
          ),
        })),
      })),
    }));
  }

  async function saveIngredient(ingredient: Ingredient) {
    setIngredientStatus((s) => ({ ...s, [ingredient.id]: "saving" }));
    try {
      const res = await fetch(`/api/admin/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ingredient.name,
          nameKa: ingredient.nameKa,
          nameRu: ingredient.nameRu,
          nameEn: ingredient.nameEn,
          unit: ingredient.unit,
          pricePerUnit: ingredient.pricePerUnit,
          available: ingredient.available,
        }),
      });
      if (!res.ok) throw new Error();
      setIngredientStatus((s) => ({ ...s, [ingredient.id]: "saved" }));
      setTimeout(() => setIngredientStatus((s) => ({ ...s, [ingredient.id]: undefined as any })), 1500);
      return true;
    } catch {
      setIngredientStatus((s) => ({ ...s, [ingredient.id]: "error" }));
      return false;
    }
  }

  // Режим "только просмотр / редактирование" для строки ингредиента.
  // editSnapshots хранит значение ингредиента на момент входа в
  // редактирование — нужно, чтобы "Отмена" откатывала несохранённые правки.
  function startEditIngredient(ing: Ingredient) {
    setEditSnapshots((s) => ({ ...s, [ing.id]: ing }));
  }

  function cancelEditIngredient(ing: Ingredient) {
    const snapshot = editSnapshots[ing.id];
    if (snapshot) updateIngredientLocal(ing.id, snapshot);
    setEditSnapshots((s) => {
      const next = { ...s };
      delete next[ing.id];
      return next;
    });
  }

  async function saveIngredientAndClose(ing: Ingredient) {
    const ok = await saveIngredient(ing);
    if (ok) {
      setEditSnapshots((s) => {
        const next = { ...s };
        delete next[ing.id];
        return next;
      });
    }
  }

  // "В наличии" — самое частое действие, поэтому сохраняется сразу по
  // клику, без входа в режим редактирования. Ингредиент общий на все
  // блюда, где он есть в составе, — переключение затронет их все разом.
  async function toggleIngredientAvailable(ing: Ingredient) {
    const updated = { ...ing, available: !ing.available };
    updateIngredientLocal(ing.id, { available: updated.available });
    await saveIngredient(updated);
  }

  async function runAiCommand() {
    const text = aiCommand.trim();
    if (!text) return;
    setAiRunning(true);
    setAiResult(null);

    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: venue.id, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiResult(data.error || t.genericError);
        setAiRunning(false);
        return;
      }

      const allItemsWithCategory = venue.categories.flatMap((c) =>
        c.items.map((i) => ({ ...i, categoryId: c.id }))
      );
      const appliedNames: string[] = [];

      type AiAction = {
        type: string;
        id?: string;
        categoryId?: string;
        name?: string;
        itemName?: string;
        ingredientName?: string;
        categoryName?: string;
        available?: boolean;
        priceGel?: number;
        pricePerUnit?: number;
        unit?: string;
        quantity?: number;
        itemId?: string;
        ingredientId?: string;
        field?: "discountMenuPercent" | "discountWoltPercent" | "discountBoltPercent" | "discountGlovoPercent";
        platform?: string;
        percent?: number;
      };

      for (const action of (data.actions || []) as AiAction[]) {
        if (action.type === "ingredient_availability" && action.id) {
          const ing = ingredients.find((i) => i.id === action.id);
          if (ing && ing.available !== action.available) {
            updateIngredientLocal(ing.id, { available: action.available });
            await saveIngredient({ ...ing, available: !!action.available });
            appliedNames.push(`${ingName(ing)}: ${action.available ? t.aiInStock : t.aiOutOfStock}`);
          }
        } else if (action.type === "item_availability" && action.id) {
          const item = allItemsWithCategory.find((i) => i.id === action.id);
          if (item && item.available !== action.available) {
            updateItem(item.categoryId, item.id, { available: action.available });
            await saveItem({ ...item, available: !!action.available });
            appliedNames.push(
              `${item[NAME_FIELD[displayLocale]] || item.nameRu}: ${
                action.available ? t.aiAvailable : t.aiUnavailable
              }`
            );
          }
        } else if (action.type === "item_price" && action.id && typeof action.priceGel === "number") {
          const item = allItemsWithCategory.find((i) => i.id === action.id);
          if (item) {
            updateItem(item.categoryId, item.id, { priceGel: action.priceGel });
            await saveItem({ ...item, priceGel: action.priceGel });
            appliedNames.push(`${item[NAME_FIELD[displayLocale]] || item.nameRu}: ${t.price} ${action.priceGel} ₾`);
          }
        } else if (action.type === "ingredient_price" && action.id && typeof action.pricePerUnit === "number") {
          const ing = ingredients.find((i) => i.id === action.id);
          if (ing) {
            updateIngredientLocal(ing.id, { pricePerUnit: action.pricePerUnit });
            await saveIngredient({ ...ing, pricePerUnit: action.pricePerUnit });
            appliedNames.push(`${ingName(ing)}: ${t.pricePerUnit} ${action.pricePerUnit}`);
          }
        } else if (action.type === "ingredient_create" && action.name) {
          const res = await fetch("/api/admin/ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              venueId: venue.id,
              name: action.name,
              unit: action.unit || UNIT_OPTIONS[0],
              pricePerUnit: action.pricePerUnit ?? 0,
            }),
          });
          if (res.ok) {
            const created = await res.json();
            setIngredients((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name, "ka")));
            appliedNames.push(`${t.aiIngredientAdded} ${action.name}`);
          }
        } else if (action.type === "ingredient_delete" && action.id) {
          const res = await fetch(`/api/admin/ingredients/${action.id}`, { method: "DELETE" });
          if (res.ok) {
            setIngredients((list) => list.filter((i) => i.id !== action.id));
            setVenue((v) => ({
              ...v,
              categories: v.categories.map((c) => ({
                ...c,
                items: c.items.map((item) => ({
                  ...item,
                  recipeItems: item.recipeItems.filter((ri) => ri.ingredientId !== action.id),
                })),
              })),
            }));
            appliedNames.push(`${t.aiIngredientDeleted} ${action.name}`);
          }
        } else if (action.type === "item_create" && action.name && action.categoryId) {
          const res = await fetch("/api/admin/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId: action.categoryId,
              slug: slugify(action.name),
              nameKa: action.name,
              nameRu: action.name,
              nameEn: action.name,
              priceGel: action.priceGel ?? 0,
            }),
          });
          if (res.ok) {
            const created = await res.json();
            const categoryId = action.categoryId;
            setVenue((v) => ({
              ...v,
              categories: v.categories.map((c) =>
                c.id !== categoryId ? c : { ...c, items: [...c.items, { ...created, recipeItems: [], modifierGroups: [] }] }
              ),
            }));
            appliedNames.push(`${t.aiItemAdded} ${action.name}`);
          }
        } else if (action.type === "item_delete" && action.id && action.categoryId) {
          const res = await fetch(`/api/admin/items/${action.id}`, { method: "DELETE" });
          if (res.ok) {
            const categoryId = action.categoryId;
            const itemId = action.id;
            setVenue((v) => ({
              ...v,
              categories: v.categories.map((c) =>
                c.id !== categoryId ? c : { ...c, items: c.items.filter((i) => i.id !== itemId) }
              ),
            }));
            appliedNames.push(`${t.aiItemDeleted} ${action.name}`);
          }
        } else if (action.type === "category_create" && action.name) {
          const res = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              venueId: venue.id,
              slug: slugify(action.name),
              nameKa: action.name,
              nameRu: action.name,
              nameEn: action.name,
            }),
          });
          if (res.ok) {
            const created = await res.json();
            setVenue((v) => ({ ...v, categories: [...v.categories, { ...created, items: [] }] }));
            appliedNames.push(`${t.aiCategoryAdded} ${action.name}`);
          }
        } else if (action.type === "recipe_add" && action.itemId && action.ingredientId && action.categoryId) {
          const res = await fetch("/api/admin/recipe-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              menuItemId: action.itemId,
              ingredientId: action.ingredientId,
              quantity: action.quantity,
            }),
          });
          if (res.ok) {
            const created = await res.json();
            const categoryId = action.categoryId;
            const itemId = action.itemId;
            setVenue((v) => ({
              ...v,
              categories: v.categories.map((c) =>
                c.id !== categoryId
                  ? c
                  : {
                      ...c,
                      items: c.items.map((i) =>
                        i.id !== itemId ? i : { ...i, recipeItems: [...i.recipeItems, created] }
                      ),
                    }
              ),
            }));
            appliedNames.push(`${action.ingredientName} ${t.aiAddedToRecipe} ${action.itemName}`);
          }
        } else if (action.type === "recipe_remove" && action.id && action.itemId && action.categoryId) {
          const res = await fetch(`/api/admin/recipe-items/${action.id}`, { method: "DELETE" });
          if (res.ok) {
            const categoryId = action.categoryId;
            const itemId = action.itemId;
            const recipeItemId = action.id;
            setVenue((v) => ({
              ...v,
              categories: v.categories.map((c) =>
                c.id !== categoryId
                  ? c
                  : {
                      ...c,
                      items: c.items.map((i) =>
                        i.id !== itemId
                          ? i
                          : { ...i, recipeItems: i.recipeItems.filter((ri) => ri.id !== recipeItemId) }
                      ),
                    }
              ),
            }));
            appliedNames.push(`${action.ingredientName} ${t.aiRemovedFromRecipe} ${action.itemName}`);
          }
        } else if (
          action.type === "item_discount" &&
          action.id &&
          action.categoryId &&
          action.field &&
          typeof action.percent === "number"
        ) {
          const item = allItemsWithCategory.find((i) => i.id === action.id);
          if (item) {
            const field = action.field;
            const percent = action.percent;
            updateItem(action.categoryId, action.id, { [field]: percent });
            await saveItem({ ...item, [field]: percent });
            appliedNames.push(
              `${item[NAME_FIELD[displayLocale]] || item.nameRu}: ${t.discount} ${action.platform} ${percent}%`
            );
          }
        }
      }

      setAiResult(
        (data.reply || t.aiDone) +
          (appliedNames.length ? `\n\n${t.aiChangedLabel}: ${appliedNames.join("; ")}` : "")
      );
      setAiCommand("");
    } catch {
      setAiResult(t.aiConnectionError);
    }
    setAiRunning(false);
  }

  async function deleteIngredient(id: string) {
    if (!confirm(t.confirmDeleteIngredient)) return;
    const res = await fetch(`/api/admin/ingredients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setIngredients((list) => list.filter((i) => i.id !== id));
      setVenue((v) => ({
        ...v,
        categories: v.categories.map((c) => ({
          ...c,
          items: c.items.map((item) => ({
            ...item,
            recipeItems: item.recipeItems.filter((ri) => ri.ingredientId !== id),
          })),
        })),
      }));
    }
  }

  async function addIngredient() {
    if (!newIngredientName.trim()) return;
    const res = await fetch("/api/admin/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId: venue.id,
        name: newIngredientName,
        unit: newIngredientUnit,
        pricePerUnit: parseFloat(newIngredientPrice) || 0,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      // Список ингредиентов всегда по алфавиту — вставляем новый сразу
      // на правильное место, а не в конец.
      setIngredients((list) =>
        [...list, created].sort((a, b) => a.name.localeCompare(b.name, "ka"))
      );
      setNewIngredientName("");
      setNewIngredientPrice("");
    }
  }

  function updateRecipeQuantityLocal(categoryId: string, itemId: string, recipeItemId: string, quantity: number) {
    setVenue((v) => ({
      ...v,
      categories: v.categories.map((c) =>
        c.id !== categoryId
          ? c
          : {
              ...c,
              items: c.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      recipeItems: item.recipeItems.map((ri) =>
                        ri.id === recipeItemId ? { ...ri, quantity } : ri
                      ),
                    }
              ),
            }
      ),
    }));
  }

  async function saveRecipeQuantity(recipeItemId: string, quantity: number) {
    await fetch(`/api/admin/recipe-items/${recipeItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
  }

  async function removeRecipeLine(categoryId: string, itemId: string, recipeItemId: string) {
    const res = await fetch(`/api/admin/recipe-items/${recipeItemId}`, { method: "DELETE" });
    if (res.ok) {
      setVenue((v) => ({
        ...v,
        categories: v.categories.map((c) =>
          c.id !== categoryId
            ? c
            : {
                ...c,
                items: c.items.map((item) =>
                  item.id !== itemId
                    ? item
                    : { ...item, recipeItems: item.recipeItems.filter((ri) => ri.id !== recipeItemId) }
                ),
              }
        ),
      }));
    }
  }

  async function addRecipeLine(categoryId: string, item: Item) {
    const quantity = parseFloat(recipePickQuantity);
    if (!recipePickIngredientId || Number.isNaN(quantity) || quantity <= 0) return;
    const res = await fetch("/api/admin/recipe-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId: item.id, ingredientId: recipePickIngredientId, quantity }),
    });
    if (res.ok) {
      const created = await res.json();
      setVenue((v) => ({
        ...v,
        categories: v.categories.map((c) =>
          c.id !== categoryId
            ? c
            : {
                ...c,
                items: c.items.map((i) =>
                  i.id !== item.id ? i : { ...i, recipeItems: [...i.recipeItems, created] }
                ),
              }
        ),
      }));
      setRecipePickIngredientId("");
      setRecipePickQuantity("");
      setRecipePickSearch("");
    }
  }

  async function moveRecipeLine(categoryId: string, item: Item, index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= item.recipeItems.length) return;

    const reordered = [...item.recipeItems];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setVenue((v) => ({
      ...v,
      categories: v.categories.map((c) =>
        c.id !== categoryId
          ? c
          : {
              ...c,
              items: c.items.map((i) => (i.id !== item.id ? i : { ...i, recipeItems: reordered })),
            }
      ),
    }));

    await fetch("/api/admin/recipe-items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId: item.id, orderedIds: reordered.map((ri) => ri.id) }),
    });
  }

  function itemCost(item: Item) {
    return item.recipeItems.reduce((sum, ri) => sum + ri.quantity * ri.ingredient.pricePerUnit, 0);
  }

  // Та же формула, что и на гостевом меню (src/lib/db/venues.ts): блюдо
  // реально видно гостям, только если его не выключили вручную И все
  // ингредиенты состава в наличии.
  function isItemEffectivelyAvailable(item: Item) {
    return item.available && item.recipeItems.every((ri) => ri.ingredient.available);
  }

  function missingIngredientNames(item: Item) {
    return item.recipeItems.filter((ri) => !ri.ingredient.available).map((ri) => ingName(ri.ingredient));
  }

  const ingredientSearchQuery = ingredientSearch.trim().toLowerCase();
  const filteredIngredients = ingredients.filter((ing) => {
    if (ingredientSearchQuery && !ingName(ing).toLowerCase().includes(ingredientSearchQuery)) return false;
    if (ingredientAvailabilityFilter === "available" && !ing.available) return false;
    if (ingredientAvailabilityFilter === "unavailable" && ing.available) return false;
    return true;
  });
  // Список группируем по первой букве (грузинский алфавит), чтобы в
  // списке были заголовки-разделители "Т", "А" и т.п., как в контактах —
  // но только когда язык показа "ka", иначе буквы грузинского алфавита
  // ничего не значат для русских/английских названий.
  const showAlphabetNav = displayLocale === "ka";
  const ingredientGroups: { letter: string; items: Ingredient[] }[] = showAlphabetNav
    ? GEORGIAN_ALPHABET.map((letter) => ({
        letter,
        items: filteredIngredients.filter((ing) => ingName(ing).charAt(0) === letter),
      })).filter((g) => g.items.length > 0)
    : [{ letter: "", items: filteredIngredients }];
  if (showAlphabetNav) {
    const otherIngredients = filteredIngredients.filter(
      (ing) => !GEORGIAN_ALPHABET.includes(ingName(ing).charAt(0))
    );
    if (otherIngredients.length > 0) {
      ingredientGroups.push({ letter: "#", items: otherIngredients });
    }
  }

  const availableIngredientsCount = ingredients.filter((ing) => ing.available).length;
  const ingredientAvailabilityCounts = {
    all: ingredients.length,
    available: availableIngredientsCount,
    unavailable: ingredients.length - availableIngredientsCount,
  };

  const allItemsFlat = venue.categories.flatMap((c) => c.items);
  const availableItemsCount = allItemsFlat.filter(isItemEffectivelyAvailable).length;
  const itemAvailabilityCounts = {
    all: allItemsFlat.length,
    available: availableItemsCount,
    unavailable: allItemsFlat.length - availableItemsCount,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
        <span className="mr-1 text-neutral-500">{t.langLabel}</span>
        {(["ka", "ru", "en"] as const).map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setDisplayLocale(loc)}
            className={`rounded-lg px-3 py-1 ${
              displayLocale === loc
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-600"
            }`}
          >
            {LOCALE_LABEL[loc]}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-800">
          {t.menuTitle} — {venue[NAME_FIELD[displayLocale]] || venue.nameRu}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/ka/menu/${venue.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            {t.viewAsGuest}
          </Link>
          <Link
            href={`/admin/${venue.slug}/orders`}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            📋 Заказы
          </Link>
          <Link
            href={`/admin/${venue.slug}/tables`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            🪑 Столики
          </Link>
          {(
            [
              { key: "urlWolt" as const, label: "Wolt" },
              { key: "urlBolt" as const, label: "Bolt" },
              { key: "urlGlovo" as const, label: "Glovo" },
              { key: "urlFacebook" as const, label: "Facebook" },
              { key: "urlInstagram" as const, label: "Instagram" },
              { key: "urlMaps" as const, label: t.mapLabel },
              { key: "urlGoogleReview" as const, label: "Google Review" },
            ]
          ).map((agg) =>
            venue[agg.key] ? (
              <span key={agg.key} className="flex items-center gap-1">
                <a
                  href={venue[agg.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
                >
                  {agg.label} ↗
                </a>
                <button
                  type="button"
                  onClick={() => saveVenueUrl(agg.key, agg.label)}
                  title={t.editLink}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ✎
                </button>
              </span>
            ) : (
              <button
                key={agg.key}
                type="button"
                onClick={() => saveVenueUrl(agg.key, agg.label)}
                className="rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-400"
              >
                + {agg.label}
              </button>
            )
          )}
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
        <button
          onClick={() => setShowAboutBox((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-neutral-700">{t.aboutTitle}</span>
          <span className="text-sm text-neutral-500">{showAboutBox ? t.hide : t.show}</span>
        </button>
        {showAboutBox && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-neutral-500">{t.aboutHelp}</p>
            <textarea
              value={venue.aboutText}
              onChange={(e) => setVenue((v) => ({ ...v, aboutText: e.target.value }))}
              placeholder={t.aboutPlaceholder}
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              onClick={saveAboutText}
              className="self-start rounded-lg bg-neutral-900 px-4 py-1.5 text-sm text-white"
            >
              {aboutStatus === "saving"
                ? t.saving
                : aboutStatus === "saved"
                ? t.saved
                : aboutStatus === "error"
                ? t.saveError
                : t.save}
            </button>
          </div>
        )}
      </section>

      {advancedOpen && (
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex w-full items-center justify-between text-left">
          <span className="text-lg font-semibold text-neutral-700">
            {t.ingredientsTitle} ({ingredients.length})
          </span>
          <button
            type="button"
            onClick={() => setAdvancedOpen(false)}
            className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-600"
          >
            {t.disableAdvanced}
          </button>
        </div>

        {advancedOpen && (
          <div className="mt-4 flex flex-col gap-3">
            {ingredients.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    placeholder={t.ingredientSearchPlaceholder}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 pr-8 text-sm"
                  />
                  {ingredientSearch && (
                    <button
                      type="button"
                      onClick={() => setIngredientSearch("")}
                      title={t.clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-neutral-500">{t.showIngredients}</span>
                  {(
                    [
                      { key: "all", label: t.all },
                      { key: "available", label: t.available },
                      { key: "unavailable", label: t.unavailable },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setIngredientAvailabilityFilter(opt.key)}
                      className={`rounded-lg px-3 py-1 text-sm ${
                        ingredientAvailabilityFilter === opt.key
                          ? "bg-neutral-900 text-white"
                          : "border border-neutral-300 text-neutral-600"
                      }`}
                    >
                      {opt.label} ({ingredientAvailabilityCounts[opt.key]})
                    </button>
                  ))}
                </div>
                {(ingredientSearchQuery || ingredientAvailabilityFilter !== "all") && (
                  <p className="text-xs text-neutral-400">
                    {t.shown}: {filteredIngredients.length} {t.of} {ingredients.length}
                  </p>
                )}
              </div>
            )}
            {ingredients.length === 0 && (
              <p className="text-sm text-neutral-400">{t.noIngredientsYet}</p>
            )}
            {ingredients.length > 0 && filteredIngredients.length === 0 && (
              <p className="text-sm text-neutral-400">{t.nothingFound}</p>
            )}
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                {ingredientGroups.map((group) => (
                  <div key={group.letter || "all"}>
                    {group.letter && (
                      <h3
                        id={`ing-letter-${group.letter}`}
                        className="mb-1 scroll-mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400"
                      >
                        {group.letter}
                      </h3>
                    )}
                    <div className="flex flex-col gap-2">
                      {group.items.map((ing) => {
              const isEditing = !!editSnapshots[ing.id];
              return (
              <div
                key={ing.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 p-2"
              >
                {isEditing ? (
                  <>
                    <input
                      value={ing[NAME_FIELD[displayLocale]] || ing.name}
                      onChange={(e) =>
                        updateIngredientLocal(ing.id, { [NAME_FIELD[displayLocale]]: e.target.value })
                      }
                      placeholder={t.ingredientNamePlaceholder}
                      className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                    />
                    <select
                      value={ing.unit}
                      onChange={(e) => updateIngredientLocal(ing.id, { unit: e.target.value })}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-sm text-neutral-600">
                      {t.pricePerUnit}
                      <input
                        type="number"
                        step="0.01"
                        value={ing.pricePerUnit}
                        onChange={(e) =>
                          updateIngredientLocal(ing.id, { pricePerUnit: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 rounded-lg border border-neutral-300 px-2 py-1"
                      />
                      ₾
                    </label>
                  </>
                ) : (
                  <div className="flex flex-1 flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-neutral-800">{ingName(ing)}</span>
                    <span className="text-neutral-500">{ing.unit}</span>
                    <span className="text-neutral-500">{ing.pricePerUnit} ₾</span>
                    {ingredientStatus[ing.id] === "saved" && (
                      <span className="text-xs text-green-600">✓ {t.saved}</span>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-1 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={ing.available}
                    onChange={() => toggleIngredientAvailable(ing)}
                  />
                  {t.inStock}
                </label>

                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveIngredientAndClose(ing)}
                      className="rounded-lg bg-neutral-900 px-3 py-1 text-sm text-white"
                    >
                      {ingredientStatus[ing.id] === "saving"
                        ? t.saving
                        : ingredientStatus[ing.id] === "error"
                        ? t.saveError
                        : t.save}
                    </button>
                    <button
                      onClick={() => cancelEditIngredient(ing)}
                      className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-600"
                    >
                      {t.cancel}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEditIngredient(ing)}
                    className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-700"
                  >
                    {t.edit}
                  </button>
                )}

                <button onClick={() => deleteIngredient(ing.id)} className="text-sm text-red-500">
                  {t.delete}
                </button>
              </div>
              );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {ingredientGroups.length > 0 && (
                <>
                  <div className="sticky top-4 relative flex flex-shrink-0 flex-col items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => setShowFloatingAddIngredient((v) => !v)}
                      title={t.addIngredientTitle}
                      className="flex w-14 flex-col items-center gap-0.5 rounded-lg bg-neutral-900 px-1 py-2 text-white shadow-lg hover:bg-neutral-700"
                    >
                      <span className="text-lg leading-none">{showFloatingAddIngredient ? "✕" : "+"}</span>
                      <span className="text-center text-[9px] leading-tight">
                        {t.addIngredientLine1}
                        <br />
                        {t.addIngredientLine2}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdvancedOpen(false)}
                      title={t.disableAdvanced}
                      className="flex w-14 flex-col items-center gap-0.5 rounded-lg border border-neutral-300 bg-white px-1 py-2 text-neutral-600 shadow hover:bg-neutral-100"
                    >
                      <span className="text-lg leading-none">▲</span>
                      <span className="text-center text-[9px] leading-tight">
                        {t.collapseLine1}
                        <br />
                        {t.collapseLine2}
                      </span>
                    </button>

                    {showFloatingAddIngredient && (
                      <div className="absolute top-0 right-full z-50 mr-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-neutral-700">{t.newIngredientTitle}</span>
                          <button
                            type="button"
                            onClick={() => setShowFloatingAddIngredient(false)}
                            className="text-sm text-neutral-400 hover:text-neutral-600"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            autoFocus
                            value={newIngredientName}
                            onChange={(e) => setNewIngredientName(e.target.value)}
                            placeholder={t.ingredientNamePlaceholder}
                            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={newIngredientUnit}
                              onChange={(e) => setNewIngredientUnit(e.target.value)}
                              className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                            >
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={newIngredientPrice}
                              onChange={(e) => setNewIngredientPrice(e.target.value)}
                              placeholder={t.pricePerUnitPlaceholder}
                              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={addIngredient}
                            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white"
                          >
                            {t.addIngredientBtn}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {showAlphabetNav && (
                  <div className="sticky top-4 flex flex-shrink-0 flex-col items-center gap-0.5 text-xs leading-none text-neutral-400">
                    {GEORGIAN_ALPHABET.map((letter) => {
                      const hasGroup = ingredientGroups.some((g) => g.letter === letter);
                      const isActive = activeIngredientLetter === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={!hasGroup}
                          onClick={() => {
                            if (!hasGroup) return;
                            setActiveIngredientLetter(letter);
                            document
                              .getElementById(`ing-letter-${letter}`)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`flex h-6 w-6 items-center justify-center rounded border text-[11px] font-medium ${
                            isActive
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : hasGroup
                              ? "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500 hover:bg-neutral-100"
                              : "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                          }`}
                          title={hasGroup ? undefined : undefined}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
      )}

      <GlovoImportPanel venueId={venue.id} existingCategories={venue.categories} />

      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            const name = prompt(t.newCategoryPrompt);
            if (name && name.trim()) addCategory(name);
          }}
          className="rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600"
        >
          {t.addCategory}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-500">{t.showItems}</span>
        {(
          [
            { key: "all", label: t.all },
            { key: "available", label: t.available },
            { key: "unavailable", label: t.unavailable },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setAvailabilityFilter(opt.key)}
            className={`rounded-lg px-3 py-1 text-sm ${
              availabilityFilter === opt.key
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-600"
            }`}
          >
            {opt.label} ({itemAvailabilityCounts[opt.key]})
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected(new Set(allItemsFlat.map((i) => i.id)))}
          className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-600"
        >
          {t.selectAllBtn}
        </button>
        <button
          type="button"
          onClick={() => {
            if (advancedOpen) {
              setAdvancedOpen(false);
              return;
            }
            const code = prompt(t.accessCodePrompt);
            if (code === null) return;
            if (code === ADVANCED_PASSCODE) {
              setAdvancedOpen(true);
            } else {
              alert(t.wrongCode);
            }
          }}
          className={`ml-auto rounded-lg px-3 py-1 text-sm ${
            advancedOpen ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
          }`}
        >
          {advancedOpen ? t.hideAdvancedParams : t.advancedParams}
        </button>
      </div>

      {venue.categories.map((category) => (
        <section key={category.id} className="mb-8">
          <div className="sticky top-0 z-20 mb-3 flex items-center justify-between border-b border-neutral-200 bg-white py-2">
            <h2 className="text-lg font-semibold text-neutral-700">
              {category[NAME_FIELD[displayLocale]] || category.nameRu}
            </h2>
            <div className="flex items-center gap-3">
              {category.items.length > 0 && (
                <button
                  onClick={() => toggleSelectAllInCategory(category)}
                  className="text-sm text-neutral-500 underline"
                >
                  {category.items.every((i) => selected.has(i.id)) ? t.deselectAll : t.selectAllInCategory}
                </button>
              )}
              <button
                onClick={() => deleteCategory(category.id)}
                className="text-sm text-red-500"
              >
                {t.deleteCategory}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {(() => {
              const visibleItems = category.items.filter((item) =>
                availabilityFilter === "all"
                  ? true
                  : availabilityFilter === "available"
                  ? isItemEffectivelyAvailable(item)
                  : !isItemEffectivelyAvailable(item)
              );
              if (category.items.length > 0 && visibleItems.length === 0) {
                return (
                  <p className="text-sm text-neutral-400">{t.noItemsForFilter}</p>
                );
              }
              return visibleItems.map((item) => (
              <div
                key={item.id}
                className={`grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-[24px_96px_1fr] ${
                  selected.has(item.id)
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div className="hidden items-start justify-center pt-1 sm:flex">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 sm:hidden">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                    />
                    <span className="text-xs text-neutral-500">{t.selectLabel}</span>
                  </div>
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-400">
                      {t.noPhoto}
                    </div>
                  )}
                  <label className="cursor-pointer rounded-lg border border-neutral-300 px-2 py-1 text-center text-xs text-neutral-600">
                    {photoStatus[item.id] === "uploading" ? t.uploading : t.uploadPhoto}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={photoStatus[item.id] === "uploading"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) uploadPhoto(category.id, item, file);
                      }}
                    />
                  </label>
                  {photoStatus[item.id] === "error" && (
                    <span className="text-xs text-red-500">{t.uploadError}</span>
                  )}
                  {item.photoUrl && (
                    <button
                      onClick={() => removePhoto(category.id, item)}
                      className="text-xs text-red-500"
                    >
                      {t.removePhoto}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    value={item[ITEM_NAME_FIELD[displayLocale]]}
                    onChange={(e) =>
                      updateItem(category.id, item.id, { [ITEM_NAME_FIELD[displayLocale]]: e.target.value })
                    }
                    placeholder={`${t.namePlaceholder} (${displayLocale.toUpperCase()})`}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-sm font-medium"
                  />
                  <input
                    value={item[ITEM_DESC_FIELD[displayLocale]]}
                    onChange={(e) =>
                      updateItem(category.id, item.id, { [ITEM_DESC_FIELD[displayLocale]]: e.target.value })
                    }
                    placeholder={`${t.descriptionPlaceholder} (${displayLocale.toUpperCase()})`}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                  />
                  <input
                    value={item.photoUrl}
                    onChange={(e) => updateItem(category.id, item.id, { photoUrl: e.target.value })}
                    placeholder={t.photoUrlPlaceholder}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-500"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1 text-sm text-neutral-600" title={t.basePriceHint}>
                      {t.price}
                      <input
                        type="number"
                        step="0.5"
                        value={item.priceGel}
                        onChange={(e) =>
                          updateItem(category.id, item.id, { priceGel: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 rounded-lg border border-neutral-300 px-2 py-1"
                      />
                      ₾
                    </label>
                    <span className="text-xs text-neutral-400">({t.basePriceHint})</span>
                    <label className="flex items-center gap-1 text-sm text-neutral-600">
                      <input
                        type="checkbox"
                        checked={item.available}
                        onChange={(e) => updateItem(category.id, item.id, { available: e.target.checked })}
                      />
                      {t.inStock}
                    </label>
                    {item.available && !isItemEffectivelyAvailable(item) && (
                      <span className="text-xs font-medium text-red-500">
                        ⚠ {t.notVisibleToGuests}: {missingIngredientNames(item).join(", ")}
                      </span>
                    )}
                    <button
                      onClick={() => saveItem(item)}
                      className="ml-auto rounded-lg bg-neutral-900 px-3 py-1 text-sm text-white"
                    >
                      {status[item.id] === "saving"
                        ? t.saving
                        : status[item.id] === "saved"
                        ? t.saved
                        : status[item.id] === "error"
                        ? t.saveError
                        : t.save}
                    </button>
                    <button
                      onClick={() => deleteItem(category.id, item.id)}
                      className="rounded-lg px-3 py-1 text-sm text-red-500"
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 sm:col-start-2 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                      {t.discountsTitle}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {t.basePriceNote.replace("{price}", item.priceGel.toFixed(2))}
                    </span>
                  </div>
                  <div className="flex flex-nowrap items-center gap-4 overflow-x-auto">
                    {(
                      [
                        { key: "discountMenuPercent" as const, label: t.discountMenuLabel, title: t.discountMenuTitle },
                        { key: "discountWoltPercent" as const, label: "Wolt", title: undefined },
                        { key: "discountBoltPercent" as const, label: "Bolt", title: undefined },
                        { key: "discountGlovoPercent" as const, label: "Glovo", title: undefined },
                      ]
                    ).map((agg) => {
                      const percent = item[agg.key];
                      const finalPrice =
                        percent != null ? item.priceGel * (1 - percent / 100) : item.priceGel;
                      return (
                        <label
                          key={agg.key}
                          title={agg.title}
                          className="flex shrink-0 items-center gap-1 text-sm text-neutral-600"
                        >
                          {agg.label}
                          <input
                            type="number"
                            step="1"
                            // Отрицательное значение — наценка (цена на площадке
                            // выше основной), положительное — обычная скидка.
                            value={percent ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateItem(category.id, item.id, {
                                [agg.key]: e.target.value === "" ? null : parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-14 rounded-lg border border-neutral-300 px-2 py-1"
                          />
                          %
                          <span className="whitespace-nowrap text-neutral-500">
                            → {finalPrice.toFixed(2)} ₾
                          </span>
                        </label>
                      );
                    })}
                    <button
                      onClick={() => saveItem(item)}
                      className="ml-auto shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700"
                    >
                      {t.saveDiscounts}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 sm:col-start-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setModifierPanelFor(modifierPanelFor === item.id ? null : item.id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {t.modifiersTitle}
                      {item.modifierGroups.length > 0 && ` (${item.modifierGroups.length})`}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {modifierPanelFor === item.id ? t.hide : t.show}
                    </span>
                  </button>

                  {modifierPanelFor === item.id && (
                    <div className="mt-1 flex flex-col gap-3">
                      <p className="text-xs text-neutral-500">{t.modifiersHelp}</p>

                      {item.modifierGroups.length === 0 && (
                        <p className="text-xs text-neutral-400">{t.noModifiers}</p>
                      )}

                      {item.modifierGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={group[NAME_FIELD[displayLocale]]}
                              onChange={(e) =>
                                updateModifierGroup(category.id, item, group.id, {
                                  [NAME_FIELD[displayLocale]]: e.target.value,
                                } as Partial<ModifierGroupDraft>)
                              }
                              placeholder={`${t.groupNamePlaceholder} (${displayLocale.toUpperCase()})`}
                              className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm font-medium"
                            />
                            <select
                              value={group.selectionType}
                              onChange={(e) =>
                                updateModifierGroup(category.id, item, group.id, {
                                  selectionType: e.target.value as "SINGLE" | "MULTIPLE",
                                })
                              }
                              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                            >
                              <option value="SINGLE">{t.selectionTypeSingle}</option>
                              <option value="MULTIPLE">{t.selectionTypeMultiple}</option>
                            </select>
                            {group.selectionType === "MULTIPLE" && (
                              <label className="flex items-center gap-1 text-sm text-neutral-600">
                                {t.maxSelectLabel}
                                <input
                                  type="number"
                                  min={1}
                                  value={group.maxSelect}
                                  onChange={(e) =>
                                    updateModifierGroup(category.id, item, group.id, {
                                      maxSelect: parseInt(e.target.value, 10) || 1,
                                    })
                                  }
                                  className="w-14 rounded-lg border border-neutral-300 px-2 py-1"
                                />
                              </label>
                            )}
                            <button
                              type="button"
                              onClick={() => removeModifierGroup(category.id, item, group.id)}
                              className="text-xs text-red-500"
                            >
                              {t.deleteGroup}
                            </button>
                          </div>

                          <div className="flex flex-col gap-1">
                            {group.options.map((option) => (
                              <div key={option.id} className="flex flex-wrap items-center gap-2">
                                <input
                                  value={option[NAME_FIELD[displayLocale]]}
                                  onChange={(e) =>
                                    updateModifierOption(category.id, item, group.id, option.id, {
                                      [NAME_FIELD[displayLocale]]: e.target.value,
                                    } as Partial<ModifierOptionDraft>)
                                  }
                                  placeholder={`${t.optionNamePlaceholder} (${displayLocale.toUpperCase()})`}
                                  className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                                />
                                <input
                                  type="number"
                                  step="0.5"
                                  value={option.priceGel}
                                  onChange={(e) =>
                                    updateModifierOption(category.id, item, group.id, option.id, {
                                      priceGel: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                                />
                                <span className="text-xs text-neutral-500">₾</span>
                                <button
                                  type="button"
                                  onClick={() => removeModifierOption(category.id, item, group.id, option.id)}
                                  className="text-xs text-red-500"
                                >
                                  {t.delete}
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addModifierOption(category.id, item, group.id)}
                              className="self-start text-xs text-neutral-500 underline"
                            >
                              {t.addModifierOption}
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => addModifierGroup(category.id, item)}
                          className="text-xs text-neutral-500 underline"
                        >
                          {t.addModifierGroup}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveModifiers(item)}
                          className="ml-auto rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700"
                        >
                          {modifierStatus[item.id] === "saving"
                            ? t.saving
                            : modifierStatus[item.id] === "saved"
                            ? t.saved
                            : t.saveModifiers}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {advancedOpen && (
                  <div className="mt-1 rounded-lg border border-neutral-100 bg-neutral-50 p-3 sm:col-start-2 sm:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {t.compositionTitle}
                      </span>
                      <button
                        onClick={() => {
                          const opening = recipePickerFor !== item.id;
                          setRecipePickerFor(opening ? item.id : null);
                          setRecipePickIngredientId("");
                          setRecipePickQuantity("");
                          setRecipePickSearch("");
                        }}
                        className="text-xs text-neutral-500 underline"
                      >
                        {recipePickerFor === item.id ? t.hidePlain : t.addIngredientToRecipe}
                      </button>
                    </div>

                    {item.recipeItems.length === 0 && recipePickerFor !== item.id && (
                      <p className="text-xs text-neutral-400">{t.noComposition}</p>
                    )}

                    {item.recipeItems.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {item.recipeItems.map((ri, riIndex) => (
                          <div
                            key={ri.id}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-sm"
                          >
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveRecipeLine(category.id, item, riIndex, -1)}
                                disabled={riIndex === 0}
                                className="px-1 text-xs text-neutral-500 disabled:opacity-20"
                                title={t.moveUp}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRecipeLine(category.id, item, riIndex, 1)}
                                disabled={riIndex === item.recipeItems.length - 1}
                                className="px-1 text-xs text-neutral-500 disabled:opacity-20"
                                title={t.moveDown}
                              >
                                ▼
                              </button>
                            </div>
                            <span
                              className={`flex-1 font-medium ${!ri.ingredient.available ? "text-red-500" : "text-neutral-800"}`}
                            >
                              {ingName(ri.ingredient)}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={ri.quantity}
                              onChange={(e) => {
                                const q = parseFloat(e.target.value) || 0;
                                updateRecipeQuantityLocal(category.id, item.id, ri.id, q);
                              }}
                              onBlur={(e) => saveRecipeQuantity(ri.id, parseFloat(e.target.value) || 0)}
                              className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-right"
                            />
                            <span className="w-8 text-neutral-500">{ri.ingredient.unit}</span>
                            <span className="w-16 text-right text-neutral-500">
                              {(ri.quantity * ri.ingredient.pricePerUnit).toFixed(2)} ₾
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleIngredientAvailable(ri.ingredient)}
                              title={t.toggleIngredientAvailTitle}
                              className={`whitespace-nowrap rounded px-2 py-0.5 text-xs ${
                                ri.ingredient.available
                                  ? "border border-neutral-300 text-neutral-500"
                                  : "bg-red-500 text-white"
                              }`}
                            >
                              {ri.ingredient.available ? t.outOfStockBtn : t.backInStockBtn}
                            </button>
                            <button
                              onClick={() => removeRecipeLine(category.id, item.id, ri.id)}
                              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm text-red-500"
                            >
                              {t.delete}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {recipePickerFor === item.id && (
                      <div className="mt-2 flex flex-wrap items-start gap-2 border-t border-neutral-200 pt-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={recipePickSearch}
                            onChange={(e) => {
                              setRecipePickSearch(e.target.value);
                              setRecipePickIngredientId("");
                            }}
                            placeholder={t.startTyping}
                            className="w-56 rounded border border-neutral-300 px-2 py-1 text-sm"
                          />
                          {!recipePickIngredientId && (
                            <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                              {ingredients
                                .filter((ing) => !item.recipeItems.some((ri) => ri.ingredientId === ing.id))
                                .filter((ing) =>
                                  ingName(ing).toLowerCase().includes(recipePickSearch.trim().toLowerCase())
                                )
                                .map((ing) => (
                                  <button
                                    key={ing.id}
                                    type="button"
                                    onClick={() => {
                                      setRecipePickIngredientId(ing.id);
                                      setRecipePickSearch(ingName(ing));
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                                  >
                                    {ingName(ing)}{" "}
                                    <span className="text-neutral-400">
                                      ({ing.unit}, {ing.pricePerUnit.toFixed(2)} ₾)
                                    </span>
                                  </button>
                                ))}
                              {ingredients
                                .filter((ing) => !item.recipeItems.some((ri) => ri.ingredientId === ing.id))
                                .filter((ing) =>
                                  ingName(ing).toLowerCase().includes(recipePickSearch.trim().toLowerCase())
                                ).length === 0 && (
                                <div className="px-3 py-1.5 text-sm text-neutral-400">{t.nothingFoundShort}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={recipePickQuantity}
                          onChange={(e) => setRecipePickQuantity(e.target.value)}
                          placeholder={t.quantityPlaceholder}
                          className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => addRecipeLine(category.id, item)}
                          disabled={!recipePickIngredientId}
                          className="rounded bg-neutral-900 px-2 py-1 text-sm text-white disabled:opacity-40"
                        >
                          {t.add}
                        </button>
                        {ingredients.length === 0 && (
                          <span className="text-xs text-neutral-400">{t.addIngredientsFirst}</span>
                        )}
                      </div>
                    )}

                    {item.recipeItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-200 pt-2 text-xs text-neutral-600">
                        <span>{t.costPrice}: {itemCost(item).toFixed(2)} ₾</span>
                        <span>{t.salePrice}: {item.priceGel.toFixed(2)} ₾</span>
                        <span
                          className={
                            item.priceGel - itemCost(item) < 0 ? "font-medium text-red-500" : "font-medium text-green-600"
                          }
                        >
                          {t.margin}: {(item.priceGel - itemCost(item)).toFixed(2)} ₾
                          {item.priceGel > 0 &&
                            ` (${(((item.priceGel - itemCost(item)) / item.priceGel) * 100).toFixed(0)}%)`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              ));
            })()}
            <button
              onClick={() => addItem(category)}
              className="self-start rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500"
            >
              {t.addItemBtn}
            </button>
          </div>
        </section>
      ))}

      <div className="mt-8 flex items-center gap-2 border-t border-neutral-200 pt-6">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder={t.newCategoryNamePlaceholder}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => addCategory()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          {t.addCategoryBtn}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">
                {t.selectedCount}: {selected.size}
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-neutral-500 underline"
              >
                {t.deselectAll}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-neutral-500">{t.bulkPlatformLabel}</span>
              <select
                value={bulkPlatform}
                onChange={(e) => {
                  const next = e.target.value as typeof bulkPlatform;
                  setBulkPlatform(next);
                  // "Изменить на %" (adjustPricePercent) существует только для
                  // основной цены — для площадки, где само значение уже %,
                  // такой режим не нужен и в списке не показывается.
                  if (next !== "menu" && bulkOp === "adjustPricePercent") setBulkOp("setPrice");
                }}
                className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
              >
                <option value="menu">{t.bulkPlatformMenu}</option>
                <option value="qr">{t.discountMenuLabel}</option>
                <option value="wolt">Wolt</option>
                <option value="bolt">Bolt</option>
                <option value="glovo">Glovo</option>
                <option value="all">{t.bulkPlatformAll}</option>
              </select>

              {bulkPlatform !== "all" && (
                <select
                  value={bulkOp}
                  onChange={(e) => setBulkOp(e.target.value as typeof bulkOp)}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="setPrice">{bulkPlatform === "menu" ? t.bulkSetPrice : t.bulkSetPercent}</option>
                  <option value="adjustPriceAmount">
                    {bulkPlatform === "menu" ? t.bulkAdjustAmount : t.bulkAdjustPercentAmount}
                  </option>
                  {bulkPlatform === "menu" && <option value="adjustPricePercent">{t.bulkAdjustPercent}</option>}
                </select>
              )}

              {bulkPlatform !== "all" && bulkOp !== "setPrice" && (
                <select
                  value={bulkSign}
                  onChange={(e) => setBulkSign(e.target.value as typeof bulkSign)}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="add">{t.addSign}</option>
                  <option value="subtract">{t.subtractSign}</option>
                </select>
              )}

              {bulkPlatform !== "all" && (
                <input
                  type="number"
                  step="0.5"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder={bulkPlatform !== "menu" || bulkOp === "adjustPricePercent" ? "%" : "₾"}
                  className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                />
              )}

              {bulkPlatform !== "all" && (
                <button
                  onClick={applyBulkPrice}
                  disabled={bulkStatus === "applying" || bulkStatus === "resetting" || !bulkValue}
                  className="rounded-lg bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                  {bulkStatus === "applying" ? t.applying : t.applyToPrice}
                </button>
              )}

              {/* Кнопка сброса цены — активна для QR-меню/Wolt/Bolt/Glovo и для
                  "Все платформы"; обнуляет скидку (возвращает к базовой цене
                  priceGel) на выбранной площадке(ях) для всех отмеченных позиций. */}
              {bulkPlatform !== "menu" && (
                <button
                  type="button"
                  onClick={resetBulkPrices}
                  disabled={bulkStatus === "applying" || bulkStatus === "resetting"}
                  className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 disabled:opacity-40"
                >
                  {bulkStatus === "resetting" ? t.resettingPrice : t.resetPrice}
                </button>
              )}

              <span className="mx-1 text-neutral-300">|</span>

              <button
                onClick={() => applyBulkAvailable(true)}
                disabled={bulkStatus === "applying" || bulkStatus === "resetting"}
                className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-700 disabled:opacity-50"
              >
                {t.enable}
              </button>
              <button
                onClick={() => applyBulkAvailable(false)}
                disabled={bulkStatus === "applying" || bulkStatus === "resetting"}
                className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-700 disabled:opacity-50"
              >
                {t.disable}
              </button>

              {bulkStatus === "error" && (
                <span className="text-sm text-red-500">{t.tryAgain}</span>
              )}
            </div>

            {bulkPlatform === "all" && (
              <p className="text-xs text-neutral-400">
                Используй кнопку «{t.resetPrice}» справа, чтобы сбросить скидку сразу на всех площадках (QR-меню, Wolt, Bolt, Glovo) для выбранных позиций.
              </p>
            )}
            {bulkPlatform !== "all" && bulkOp === "setPrice" && (
              <p className="text-xs text-neutral-400">{t.bulkSetPriceHelp}</p>
            )}
            {bulkPlatform !== "all" && bulkOp === "adjustPriceAmount" && (
              <p className="text-xs text-neutral-400">{t.bulkAdjustAmountHelp}</p>
            )}
            {bulkPlatform !== "all" && bulkOp === "adjustPricePercent" && (
              <p className="text-xs text-neutral-400">{t.bulkAdjustPercentHelp}</p>
            )}
          </div>
        </div>
      )}
      {selected.size > 0 && <div className="h-40" aria-hidden />}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {showAiPanel && (
          <div className="w-80 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-700">{t.aiPanelTitle}</span>
              <button
                type="button"
                onClick={() => setShowAiPanel(false)}
                className="text-sm text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-neutral-500">{t.aiPanelHelp}</p>
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runAiCommand();
                }}
                placeholder={t.aiPlaceholder}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={runAiCommand}
                disabled={aiRunning || !aiCommand.trim()}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {aiRunning ? t.aiRunning : t.aiRun}
              </button>
            </div>
            {aiResult && <p className="mt-2 text-sm text-neutral-700">{aiResult}</p>}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowAiPanel((v) => !v)}
          title={t.aiButtonTitle}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-2xl text-white shadow-xl hover:bg-neutral-700"
        >
          {showAiPanel ? "✕" : "🤖"}
        </button>
      </div>
    </main>
  );
}
