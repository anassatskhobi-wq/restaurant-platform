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

// Экранируем то, что подставляем в HTML-разметку сообщения Telegram
// (названия блюд, метки столов вводит человек — там может быть < > &).
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Отправка одного сообщения. Никогда не бросает исключение и не «висит»
// дольше 4 секунд — сбой Telegram не должен ронять оформление заказа.
export async function sendTelegram(text: string): Promise<void> {
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
  return `${head}\n${items}\n────────\nИтого: <b>${params.totalGel.toFixed(2)} ₾</b>`;
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
