// Уведомления персонала в Telegram о новых заказах и вызовах официанта.
//
// Зачем: раньше узнать о новом заказе можно было, только если у кого-то
// открыта вкладка с доской заказов (/admin/[venueSlug]/orders) — а она
// обновляется раз в 10 секунд и звук глушится браузером. Если планшет на
// кухне заснул или вкладку закрыли — заказ повисал незамеченным.
//
// Как настроить (переменные окружения, в т.ч. на Vercel → Settings →
// Environment Variables):
//   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
//   TELEGRAM_CHAT_ID   — id группы, куда бот пишет (число с минусом,
//                        например -1001234567890)
// Если хотя бы одна из них не задана — уведомления просто молча
// отключены, на работу заказов это не влияет.
//
// Ограничение: пока одна общая группа на все точки. Разные группы под
// разные рестораны — следующий шаг (поле telegramChatId у Venue).

const TG_API = "https://api.telegram.org";

// Инлайн-клавиатура Telegram (кнопки прямо под сообщением).
export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

// Человеческие названия статусов заказа для сообщений.
const STATUS_RU: Record<string, string> = {
  NEW: "Принят",
  IN_PROGRESS: "Готовим",
  READY: "Готов",
  DONE: "Выдан",
  CANCELLED: "Отменён",
};

export function statusLabelRu(status: string): string {
  return STATUS_RU[status] ?? status;
}

// Кнопки под сообщением о заказе: одно нажатие меняет Order.status.
// callback_data = "o:<orderId>:<STATUS>" (лимит Telegram — 64 байта,
// cuid ~25 символов, укладываемся).
export function orderStatusButtons(orderId: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "👨‍🍳 Готовим", callback_data: `o:${orderId}:IN_PROGRESS` },
        { text: "🔔 Готов", callback_data: `o:${orderId}:READY` },
        { text: "✅ Выдан", callback_data: `o:${orderId}:DONE` },
      ],
    ],
  };
}

// Пустая клавиатура — чтобы убрать кнопки у сообщения (заказ выдан).
const NO_KEYBOARD: InlineKeyboard = { inline_keyboard: [] };

// Экранируем то, что подставляем в HTML-разметку сообщения Telegram
// (названия блюд, метки столов вводит человек — там может быть < > &).
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Отправка одного сообщения. Никогда не бросает исключение и не «висит»
// дольше 4 секунд — сбой Telegram не должен ронять оформление заказа.
export async function sendTelegram(
  text: string,
  replyMarkup?: InlineKeyboard
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // не настроено — тихо выходим

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[notify] Telegram ответил ошибкой:", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("[notify] не удалось отправить в Telegram:", err);
  } finally {
    clearTimeout(timeout);
  }
}

// Ответ на нажатие инлайн-кнопки — обязателен, иначе у нажавшего
// кнопка «крутится» ~10 секунд. text показывается ему всплывашкой.
export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch(`${TG_API}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("[notify] answerCallbackQuery:", err);
  } finally {
    clearTimeout(timeout);
  }
}

// Перерисовать уже отправленное сообщение (после смены статуса кнопкой).
// Если replyMarkup не передан — кнопки убираются совсем.
export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboard
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${TG_API}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup ?? NO_KEYBOARD,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[notify] editMessageText ошибка:", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("[notify] editMessageText:", err);
  } finally {
    clearTimeout(timeout);
  }
}

type OrderLineForNotify = {
  nameSnapshot: string;
  priceGel: number;
  qty: number;
  modifiers: { optionName: string }[];
};

// Сообщение о новом заказе.
export function formatNewOrder(params: {
  venueName: string;
  orderNumber: number;
  tableLabel: string | null;
  totalGel: number;
  lines: OrderLineForNotify[];
  // Строка о текущем статусе, напр. "Готовим · Анна 14:32". Появляется
  // после того, как по заказу нажали кнопку.
  statusNote?: string | null;
}): string {
  const where = params.tableLabel ? esc(params.tableLabel) : "без стола";
  const head = `🆕 <b>${esc(params.venueName)} — заказ №${params.orderNumber}</b> · ${where}`;
  const items = params.lines
    .map((l) => {
      const mods = l.modifiers.length
        ? " (" + l.modifiers.map((m) => esc(m.optionName)).join(", ") + ")"
        : "";
      return `• ${esc(l.nameSnapshot)}${mods} × ${l.qty} — ${(l.priceGel * l.qty).toFixed(2)} ₾`;
    })
    .join("\n");
  const footer = params.statusNote
    ? `\n<b>▶ ${esc(params.statusNote)}</b>`
    : "";
  return `${head}\n${items}\n────────\nИтого: <b>${params.totalGel.toFixed(2)} ₾</b>${footer}`;
}

const WAITER_REASON_RU: Record<string, string> = {
  water: "вода / стаканы",
  bill: "просит счёт",
  help: "нужна помощь",
  other: "другое",
};

// Сообщение о вызове официанта.
export function formatWaiterCall(params: {
  venueName: string;
  tableLabel: string;
  reason: string;
}): string {
  const reason = WAITER_REASON_RU[params.reason] ?? esc(params.reason);
  return `🛎️ <b>${esc(params.venueName)} — официант</b> · ${esc(params.tableLabel)}\nПричина: ${reason}`;
}

// Сообщение о низкой оценке заказа (1–3 звезды). Отправляется только при
// такой оценке — хорошие отзывы уходят гостем в Google и в Telegram не
// дублируются.
export function formatFeedback(params: {
  venueName: string;
  orderNumber: number | null;
  tableLabel: string | null;
  rating: number;
  comment: string;
}): string {
  const stars = "★".repeat(params.rating) + "☆".repeat(Math.max(0, 5 - params.rating));
  const where = params.tableLabel ? ` · ${esc(params.tableLabel)}` : "";
  const order = params.orderNumber != null ? ` — заказ №${params.orderNumber}` : "";
  const commentLine = params.comment.trim() ? `\n«${esc(params.comment.trim())}»` : "";
  return `⚠️ <b>${esc(params.venueName)}${order}</b>${where}\nОценка: ${stars} (${params.rating}/5)${commentLine}`;
}
