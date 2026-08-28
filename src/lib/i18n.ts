export const locales = ["ka", "ru", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ka";

export const localeNames: Record<Locale, string> = {
  ka: "ქართული",
  ru: "Русский",
  en: "English",
};

// Small dictionary of UI strings used around the menu page.
// Menu content itself (item names/descriptions) lives per-locale in the venue data.
const dictionary = {
  ka: {
    menu: "მენიუ",
    currency: "₾",
    poweredBy: "ციფრული მენიუ",
    outOfStock: "დროებით არ არის",
    callWaiter: "ოფიციანტის გამოძახება",
    cart: "კალათა",
    yourOrder: "თქვენი შეკვეთა",
    emptyCart: "კალათა ცარიელია",
    total: "სულ",
    placeOrder: "შეკვეთის გაფორმება",
    placingOrder: "იგზავნება...",
    orderPlacedTitle: "შეკვეთა მიღებულია!",
    orderPlacedBody: "თქვენი შეკვეთის ნომერია",
    newOrder: "ახალი შეკვეთა",
    continueMenu: "მენიუში დაბრუნება",
    remove: "წაშლა",
    askAi: "შეკითხვა მენიუზე",
    aiPlaceholder: "მაგ: გაქვთ ვეგეტარიანული?",
    aiSend: "გაგზავნა",
    aiThinking: "ვფიქრობ...",
  },
  ru: {
    menu: "Меню",
    currency: "₾",
    poweredBy: "Цифровое меню",
    outOfStock: "Временно недоступно",
    callWaiter: "Позвать официанта",
    cart: "Корзина",
    yourOrder: "Ваш заказ",
    emptyCart: "Корзина пуста",
    total: "Итого",
    placeOrder: "Оформить заказ",
    placingOrder: "Отправляем...",
    orderPlacedTitle: "Заказ принят!",
    orderPlacedBody: "Номер вашего заказа",
    newOrder: "Новый заказ",
    continueMenu: "Вернуться в меню",
    remove: "Убрать",
    askAi: "Спросить про меню",
    aiPlaceholder: "Например: есть что-то вегетарианское?",
    aiSend: "Отправить",
    aiThinking: "Думаю...",
  },
  en: {
    menu: "Menu",
    currency: "₾",
    poweredBy: "Digital menu",
    outOfStock: "Currently unavailable",
    callWaiter: "Call waiter",
    cart: "Cart",
    yourOrder: "Your order",
    emptyCart: "Your cart is empty",
    total: "Total",
    placeOrder: "Place order",
    placingOrder: "Sending...",
    orderPlacedTitle: "Order received!",
    orderPlacedBody: "Your order number is",
    newOrder: "New order",
    continueMenu: "Back to menu",
    remove: "Remove",
    askAi: "Ask about the menu",
    aiPlaceholder: "E.g. anything vegetarian?",
    aiSend: "Send",
    aiThinking: "Thinking...",
  },
} satisfies Record<Locale, Record<string, string>>;

export function t(locale: Locale, key: keyof (typeof dictionary)["en"]): string {
  return dictionary[locale][key];
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
