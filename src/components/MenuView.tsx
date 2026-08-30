"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  Venue,
  MenuItem as MenuItemT,
  ModifierGroup as ModifierGroupT,
} from "@/lib/data/venues";
import { locales, localeNames, t, type Locale } from "@/lib/i18n";

type CartLine = {
  lineId: string;
  itemSlug: string;
  optionIds: string[];
  qty: number;
};

type OrderState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "placed"; id: string; orderNumber: string };

function storageKey(venueSlug: string) {
  return `cart:${venueSlug}`;
}

function lastOrderStorageKey(venueSlug: string) {
  return `lastOrder:${venueSlug}`;
}

// Ключ строки корзины: одно и то же блюдо с одним и тем же набором
// выбранных опций — одна строка (qty > 1); тот же slug с другим набором
// опций — отдельная строка. Совпадает с логикой на сервере (см.
// src/app/api/orders/route.ts), чтобы дедупликация была одинаковой.
function lineKey(slug: string, optionIds: string[]) {
  return `${slug}::${[...optionIds].sort().join(",")}`;
}

function statusLabel(locale: Locale, status: string) {
  switch (status) {
    case "NEW":
      return t(locale, "statusNew");
    case "IN_PROGRESS":
      return t(locale, "statusInProgress");
    case "READY":
      return t(locale, "statusReady");
    case "DONE":
      return t(locale, "statusDone");
    case "CANCELLED":
      return t(locale, "statusCancelled");
    default:
      return status;
  }
}

export function MenuView({
  venue,
  locale,
  tableId,
  tableLabel,
}: {
  venue: Venue;
  locale: Locale;
  tableId?: string;
  tableLabel?: string;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [orderState, setOrderState] = useState<OrderState>({ status: "idle" });
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  // Оценка заказа после выдачи: сначала звёзды, потом (при 1–3) поле
  // "что не так", потом "спасибо". 4–5 ведёт сразу на "done" с кнопкой
  // отзыва в Google, 1–3 — на экран комментария, который остаётся внутри.
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackPhase, setFeedbackPhase] = useState<"stars" | "comment" | "done">("stars");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [customizeItem, setCustomizeItem] = useState<MenuItemT | null>(null);
  const [lastOrder, setLastOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [lastOrderDismissed, setLastOrderDismissed] = useState(false);
  const [waiterOpen, setWaiterOpen] = useState(false);
  const [waiterSending, setWaiterSending] = useState(false);
  const [waiterSentAt, setWaiterSentAt] = useState<number | null>(null);

  // Load/persist cart per-venue so a refresh at the table doesn't wipe it.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(venue.slug));
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore — start with an empty cart if storage is unavailable
    }
    try {
      const rawLast = window.localStorage.getItem(lastOrderStorageKey(venue.slug));
      if (rawLast) setLastOrder(JSON.parse(rawLast));
    } catch {
      // ignore
    }
  }, [venue.slug]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(venue.slug), JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, venue.slug]);

  const placedOrderId = orderState.status === "placed" ? orderState.id : null;

  // Гость видит статус СВОЕГО заказа в реальном времени — опрашиваем
  // публичный /api/orders/[id] каждые ~8 сек, пока открыт экран "заказ
  // оформлен".
  useEffect(() => {
    if (!placedOrderId) {
      setLiveStatus(null);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/orders/${placedOrderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setLiveStatus(data.status);
      } catch {
        // ignore — попробуем на следующем тике
      }
    }
    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [placedOrderId]);

  // Запоминаем последний заказ гостя (для баннера "ваш последний заказ"
  // при следующем визите на эту же точку — например, отсканировал QR
  // снова, или вернулся в меню по ссылке).
  useEffect(() => {
    if (orderState.status !== "placed") return;
    try {
      window.localStorage.setItem(
        lastOrderStorageKey(venue.slug),
        JSON.stringify({ id: orderState.id, orderNumber: orderState.orderNumber })
      );
    } catch {
      // ignore
    }
    setLastOrder({ id: orderState.id, orderNumber: orderState.orderNumber });
  }, [orderState, venue.slug]);

  const allItems = useMemo(
    () => venue.categories.flatMap((c) => c.items),
    [venue.categories]
  );

  function itemBySlug(slug: string) {
    return allItems.find((i) => i.slug === slug);
  }

  function findOption(item: MenuItemT, optionId: string) {
    for (const g of item.modifierGroups ?? []) {
      const opt = g.options.find((o) => o.id === optionId);
      if (opt) return opt;
    }
    return null;
  }

  // Реальная цена, которую видит и платит гость: базовая цена, если для
  // этого блюда не задана скидка/наценка на QR-меню, иначе — со скидкой.
  function effectivePrice(item: { priceGel: number; discountMenuPercent?: number | null }) {
    return item.discountMenuPercent != null
      ? item.priceGel * (1 - item.discountMenuPercent / 100)
      : item.priceGel;
  }

  function lineUnitPrice(line: CartLine) {
    const item = itemBySlug(line.itemSlug);
    if (!item) return 0;
    const optionsTotal = line.optionIds.reduce((sum, id) => {
      const opt = findOption(item, id);
      return sum + (opt?.priceGel ?? 0);
    }, 0);
    return effectivePrice(item) + optionsTotal;
  }

  function lineOptionsLabel(line: CartLine) {
    const item = itemBySlug(line.itemSlug);
    if (!item) return "";
    return line.optionIds
      .map((id) => findOption(item, id)?.name[locale])
      .filter(Boolean)
      .join(", ");
  }

  function qtyForItemSlug(slug: string) {
    return cart.filter((l) => l.itemSlug === slug).reduce((sum, l) => sum + l.qty, 0);
  }

  function incrementLine(lineId: string) {
    setCart((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + 1 } : l)));
  }

  function addItem(slug: string) {
    const lineId = lineKey(slug, []);
    setCart((prev) => {
      const existing = prev.find((l) => l.lineId === lineId);
      if (existing) {
        return prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { lineId, itemSlug: slug, optionIds: [], qty: 1 }];
    });
  }

  function decrementItem(lineId: string) {
    setCart((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0)
    );
  }

  function removeItem(lineId: string) {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  }

  function addCustomizedLine(itemSlug: string, optionIds: string[], qty: number) {
    const lineId = lineKey(itemSlug, optionIds);
    setCart((prev) => {
      const existing = prev.find((l) => l.lineId === lineId);
      if (existing) {
        return prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { lineId, itemSlug, optionIds, qty }];
    });
  }

  const totalCount = cart.reduce((sum, l) => sum + l.qty, 0);
  const totalPrice = cart.reduce((sum, l) => sum + lineUnitPrice(l) * l.qty, 0);

  async function placeOrder() {
    setOrderState({ status: "submitting" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug: venue.slug,
          locale,
          tableId: tableId ?? undefined,
          items: cart.map((l) => ({
            slug: l.itemSlug,
            qty: l.qty,
            optionIds: l.optionIds,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setReviewDismissed(false);
      resetFeedback();
      setOrderState({ status: "placed", id: data.id, orderNumber: String(data.orderNumber) });
      setCart([]);
    } catch {
      setOrderState({ status: "idle" });
    }
  }

  function startNewOrder() {
    setOrderState({ status: "idle" });
    setDrawerOpen(false);
  }

  function resetFeedback() {
    setRating(null);
    setFeedbackComment("");
    setFeedbackPhase("stars");
  }

  // Оценка уходит на сервер сразу при выборе звёзд (чтобы не потерять её,
  // если гость закроет страницу до комментария), и ещё раз — когда
  // дописан комментарий. Сбой отправки не должен «застревать» на экране.
  async function submitFeedback(stars: number, comment: string) {
    const orderId = orderState.status === "placed" ? orderState.id : null;
    if (!orderId) return;
    setFeedbackSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating: stars, comment }),
      });
    } catch {
      // не критично — просто идём дальше
    }
    setFeedbackSending(false);
  }

  function pickRating(stars: number) {
    setRating(stars);
    submitFeedback(stars, "");
    setFeedbackPhase(stars >= 4 ? "done" : "comment");
  }

  async function sendFeedbackComment() {
    if (rating == null) return;
    await submitFeedback(rating, feedbackComment.trim());
    setFeedbackPhase("done");
  }

  async function callWaiter(reason: string) {
    if (!tableId) return;
    setWaiterSending(true);
    try {
      await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, reason }),
      });
      setWaiterSentAt(Date.now());
      setTimeout(() => {
        setWaiterOpen(false);
        setWaiterSentAt(null);
      }, 2500);
    } catch {
      // ignore — гость может попробовать ещё раз
    }
    setWaiterSending(false);
  }

  const WAITER_REASONS = [
    { key: "water", label: t(locale, "callWaiterReasonWater") },
    { key: "bill", label: t(locale, "callWaiterReasonBill") },
    { key: "help", label: t(locale, "callWaiterReasonHelp") },
    { key: "other", label: t(locale, "callWaiterReasonOther") },
  ];

  // Только отвечает на вопросы про меню (состав, наличие, история бренда)
  // — не может ничего менять в системе, это read-only помощник для гостя.
  async function askAi() {
    const text = aiMessage.trim();
    if (!text) return;
    setAiRunning(true);
    setAiReply(null);
    try {
      const res = await fetch("/api/guest/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug: venue.slug, message: text, locale }),
      });
      const data = await res.json();
      setAiReply(
        data.reply ||
          data.error ||
          (locale === "ru"
            ? "Не удалось получить ответ, попробуйте ещё раз."
            : locale === "ka"
            ? "პასუხის მიღება ვერ მოხერხდა."
            : "Couldn't get an answer, please try again.")
      );
    } catch {
      setAiReply(locale === "ru" ? "Не удалось связаться с сервером." : locale === "ka" ? "სერვერთან დაკავშირება ვერ მოხერხდა." : "Couldn't reach the server.");
    }
    setAiRunning(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md pb-32">
      <header
        className="sticky top-0 z-10 px-5 pb-5 pt-6 text-white shadow-sm"
        style={{ backgroundColor: venue.brandColor }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {t(locale, "poweredBy")}
          </p>
          <h1 className="text-xl font-semibold">{venue.name[locale]}</h1>
          <p className="text-sm text-white/80">{venue.address[locale]}</p>
          {tableLabel && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/70">
              {tableLabel}
            </p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          {locales.map((l) => (
            <Link
              key={l}
              href={`/${l}/menu/${venue.slug}${tableId ? `?table=${tableId}` : ""}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                l === locale
                  ? "bg-white text-neutral-900"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {localeNames[l]}
            </Link>
          ))}
        </div>
      </header>

      {lastOrder && !lastOrderDismissed && orderState.status === "idle" && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
          <span className="text-neutral-600">
            {t(locale, "lastOrderBanner")} #{lastOrder.orderNumber}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setOrderState({ status: "placed", id: lastOrder.id, orderNumber: lastOrder.orderNumber });
                setDrawerOpen(true);
              }}
              className="font-medium underline"
              style={{ color: venue.brandColor }}
            >
              {t(locale, "lastOrderView")}
            </button>
            <button
              onClick={() => setLastOrderDismissed(true)}
              className="text-neutral-400"
              aria-label="dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="px-5">
        {venue.categories.map((category) => (
          <section key={category.slug} className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-neutral-800">
              {category.name[locale]}
            </h2>
            <ul className="flex flex-col gap-4">
              {category.items.map((item) => {
                const hasModifiers = (item.modifierGroups?.length ?? 0) > 0;
                const line = hasModifiers
                  ? null
                  : cart.find((l) => l.lineId === lineKey(item.slug, []));
                const qty = hasModifiers ? qtyForItemSlug(item.slug) : line?.qty ?? 0;
                // Кнопка добавления — плавающим кружком поверх фото (как в
                // Wolt/Bolt), если фото есть; иначе — обычной строкой внизу
                // карточки, там для неё просто нет фото, на которое можно
                // "положить" кнопку.
                const addControl = !item.available ? null : hasModifiers ? (
                  <button
                    onClick={() => setCustomizeItem(item)}
                    aria-label={t(locale, "modifierAddToCart")}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full text-2xl font-medium text-white shadow-md"
                    style={{ backgroundColor: venue.brandColor }}
                  >
                    +
                    {qty > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                        {qty}
                      </span>
                    )}
                  </button>
                ) : qty === 0 ? (
                  <button
                    onClick={() => addItem(item.slug)}
                    aria-label="+"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-2xl font-medium text-white shadow-md"
                    style={{ backgroundColor: venue.brandColor }}
                  >
                    +
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-full bg-white px-1.5 py-1.5 shadow-md">
                    <button
                      onClick={() => line && decrementItem(line.lineId)}
                      aria-label="-"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-lg font-medium text-neutral-700"
                    >
                      −
                    </button>
                    <span className="w-4 text-center font-semibold">{qty}</span>
                    <button
                      onClick={() => addItem(item.slug)}
                      aria-label="+"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-white"
                      style={{ backgroundColor: venue.brandColor }}
                    >
                      +
                    </button>
                  </div>
                );
                return (
                  <li
                    key={item.slug}
                    className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-opacity ${
                      item.available ? "" : "opacity-50"
                    }`}
                  >
                    {item.photoUrl && (
                      <div className="relative">
                        <img
                          src={item.photoUrl}
                          alt={item.name[locale]}
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                        {addControl && (
                          <div className="absolute bottom-2 right-2">{addControl}</div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-snug text-neutral-800">
                          {item.name[locale]}
                        </h3>
                        {item.discountMenuPercent != null ? (
                          <span className="flex shrink-0 flex-col items-end whitespace-nowrap">
                            <span className="text-xs text-neutral-400 line-through">
                              {item.priceGel} {t(locale, "currency")}
                            </span>
                            <span className="text-base font-bold text-red-600">
                              {effectivePrice(item).toFixed(2)} {t(locale, "currency")}
                            </span>
                          </span>
                        ) : (
                          <span className="whitespace-nowrap text-base font-bold text-neutral-900">
                            {item.priceGel} {t(locale, "currency")}
                          </span>
                        )}
                      </div>
                      {item.description[locale] && (
                        <p className="mt-1 text-sm leading-snug text-neutral-500">
                          {item.description[locale]}
                        </p>
                      )}
                      {!item.available && (
                        <p className="mt-2 text-xs font-medium text-red-500">
                          {t(locale, "outOfStock")}
                        </p>
                      )}
                      {/* Без фото кнопке негде "лежать" сверху — показываем её обычной строкой здесь */}
                      {!item.photoUrl && addControl && (
                        <div className="mt-3 flex justify-end">{addControl}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {totalCount > 0 && !drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed inset-x-5 z-20 flex items-center justify-between rounded-full px-5 py-3 text-white shadow-lg"
          style={{
            backgroundColor: venue.brandColor,
            // На iPhone с "чёлкой"/полоской снизу отступ от края экрана
            // считаем через safe-area-inset, чтобы кнопка не пряталась под
            // системной полосой свайпа.
            bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
          }}
        >
          <span className="font-medium">
            {t(locale, "cart")} · {totalCount}
          </span>
          <span className="font-semibold">
            {totalPrice.toFixed(2)} {t(locale, "currency")}
          </span>
        </button>
      )}

      {tableId && (
        <div className="fixed bottom-24 left-5 z-40 flex flex-col items-start gap-2">
          {waiterOpen && (
            <div className="w-64 max-w-[calc(100vw-2.5rem)] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
              {waiterSentAt ? (
                <p className="py-2 text-center text-sm font-medium text-neutral-700">
                  {t(locale, "callWaiterSent")}
                </p>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-700">
                      {t(locale, "callWaiterTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWaiterOpen(false)}
                      className="text-sm text-neutral-400 hover:text-neutral-600"
                      aria-label="close"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {WAITER_REASONS.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        disabled={waiterSending}
                        onClick={() => callWaiter(r.key)}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setWaiterOpen((v) => !v)}
            aria-label={t(locale, "callWaiterTitle")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-xl text-white shadow-xl hover:bg-neutral-700"
          >
            {waiterOpen ? "✕" : "🛎️"}
          </button>
        </div>
      )}

      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2">
        {aiOpen && (
          <div className="w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-700">{t(locale, "askAi")}</span>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                className="text-sm text-neutral-400 hover:text-neutral-600"
                aria-label="close"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") askAi();
                }}
                placeholder={t(locale, "aiPlaceholder")}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={askAi}
                disabled={aiRunning || !aiMessage.trim()}
                className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-40"
                style={{ backgroundColor: venue.brandColor }}
              >
                {aiRunning ? t(locale, "aiThinking") : t(locale, "aiSend")}
              </button>
            </div>
            {aiReply && <p className="mt-2 text-sm text-neutral-700">{aiReply}</p>}
          </div>
        )}
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-label={t(locale, "askAi")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-xl text-white shadow-xl hover:bg-neutral-700"
        >
          {aiOpen ? "✕" : "🤖"}
        </button>
      </div>

      {customizeItem && (
        <ItemModifierModal
          item={customizeItem}
          locale={locale}
          brandColor={venue.brandColor}
          onClose={() => setCustomizeItem(null)}
          onAdd={(optionIds, qty) => {
            addCustomizedLine(customizeItem.slug, optionIds, qty);
            setCustomizeItem(null);
          }}
        />
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5">
            {orderState.status === "placed" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                  style={{ backgroundColor: venue.brandColor }}
                >
                  ✓
                </div>
                <h2 className="text-lg font-semibold text-neutral-800">
                  {t(locale, "orderPlacedTitle")}
                </h2>
                <p className="text-neutral-500">
                  {t(locale, "orderPlacedBody")}: #{orderState.orderNumber}
                </p>
                <span
                  className="mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: `${venue.brandColor}1a`, color: venue.brandColor }}
                >
                  {t(locale, "orderStatusLabel")}: {statusLabel(locale, liveStatus ?? "NEW")}
                </span>

                {liveStatus === "DONE" && !reviewDismissed && (
                  <div className="mt-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    {feedbackPhase === "stars" && (
                      <>
                        <p className="font-medium text-neutral-800">
                          {t(locale, "rateOrderTitle")}
                        </p>
                        <div className="mt-3 flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => pickRating(n)}
                              disabled={feedbackSending}
                              aria-label={String(n)}
                              className="text-3xl leading-none text-amber-400 disabled:opacity-50"
                            >
                              {rating != null && n <= rating ? "★" : "☆"}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {feedbackPhase === "comment" && (
                      <>
                        <p className="font-medium text-neutral-800">
                          {t(locale, "rateWhatWrong")}
                        </p>
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder={t(locale, "rateCommentPlaceholder")}
                          rows={3}
                          className="mt-2 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        />
                        <button
                          onClick={sendFeedbackComment}
                          disabled={feedbackSending}
                          className="mt-2 w-full rounded-full py-2 text-sm font-medium text-white disabled:opacity-50"
                          style={{ backgroundColor: venue.brandColor }}
                        >
                          {t(locale, "rateSend")}
                        </button>
                      </>
                    )}

                    {feedbackPhase === "done" && (
                      <>
                        <p className="font-medium text-neutral-800">
                          {rating != null && rating >= 4
                            ? t(locale, "rateThanks")
                            : t(locale, "rateSent")}
                        </p>
                        {rating != null && rating >= 4 && venue.urlGoogleReview && (
                          <>
                            <p className="mt-1 text-sm text-neutral-500">
                              {t(locale, "reviewPromptBody")}
                            </p>
                            <div className="mt-3 flex justify-center">
                              <a
                                href={venue.urlGoogleReview}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full px-4 py-2 text-sm font-medium text-white"
                                style={{ backgroundColor: venue.brandColor }}
                              >
                                {t(locale, "reviewPromptCta")}
                              </a>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => setReviewDismissed(true)}
                      className="mt-3 block w-full text-center text-xs text-neutral-400"
                    >
                      {t(locale, "reviewPromptDismiss")}
                    </button>
                  </div>
                )}

                <button
                  onClick={startNewOrder}
                  className="mt-2 rounded-full px-5 py-2 text-white"
                  style={{ backgroundColor: venue.brandColor }}
                >
                  {t(locale, "continueMenu")}
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-800">
                    {t(locale, "yourOrder")}
                  </h2>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="text-neutral-400"
                    aria-label="close"
                  >
                    ✕
                  </button>
                </div>

                {cart.length === 0 ? (
                  <p className="py-8 text-center text-neutral-400">
                    {t(locale, "emptyCart")}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {cart.map((line) => {
                      const item = itemBySlug(line.itemSlug);
                      if (!item) return null;
                      const optionsLabel = lineOptionsLabel(line);
                      const unitPrice = lineUnitPrice(line);
                      return (
                        <li
                          key={line.lineId}
                          className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3"
                        >
                          <div>
                            <p className="font-medium text-neutral-800">
                              {item.name[locale]}
                            </p>
                            {optionsLabel && (
                              <p className="text-xs text-neutral-400">{optionsLabel}</p>
                            )}
                            <p className="text-sm text-neutral-500">
                              {unitPrice.toFixed(2)} {t(locale, "currency")} × {line.qty}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decrementItem(line.lineId)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300"
                            >
                              −
                            </button>
                            <span className="w-4 text-center">{line.qty}</span>
                            <button
                              onClick={() => incrementLine(line.lineId)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeItem(line.lineId)}
                              className="ml-2 text-xs text-red-500"
                            >
                              {t(locale, "remove")}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {cart.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between text-lg font-semibold text-neutral-800">
                      <span>{t(locale, "total")}</span>
                      <span>
                        {totalPrice.toFixed(2)} {t(locale, "currency")}
                      </span>
                    </div>
                    <button
                      onClick={placeOrder}
                      disabled={orderState.status === "submitting"}
                      className="w-full rounded-full py-3 font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: venue.brandColor }}
                    >
                      {orderState.status === "submitting"
                        ? t(locale, "placingOrder")
                        : t(locale, "placeOrder")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Модалка выбора платных опций блюда (модификаторов) — открывается по
// кнопке "Добавить" у блюд, у которых заданы modifierGroups. Блюда без
// модификаторов используют простой инлайн-степпер +/- в самом списке.
function ItemModifierModal({
  item,
  locale,
  brandColor,
  onClose,
  onAdd,
}: {
  item: MenuItemT;
  locale: Locale;
  brandColor: string;
  onClose: () => void;
  onAdd: (optionIds: string[], qty: number) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  const groups: ModifierGroupT[] = item.modifierGroups ?? [];

  function toggle(group: ModifierGroupT, optionId: string) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selectionType === "SINGLE") {
        return { ...prev, [group.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  const canSubmit = groups.every(
    (g) => g.selectionType !== "SINGLE" || (selections[g.id]?.length ?? 0) === 1
  );

  const basePrice =
    item.discountMenuPercent != null
      ? item.priceGel * (1 - item.discountMenuPercent / 100)
      : item.priceGel;
  const optionsTotal = groups.reduce((sum, g) => {
    const selected = selections[g.id] ?? [];
    return (
      sum +
      selected.reduce((s, id) => {
        const opt = g.options.find((o) => o.id === id);
        return s + (opt?.priceGel ?? 0);
      }, 0)
    );
  }, 0);
  const unitTotal = basePrice + optionsTotal;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">{item.name[locale]}</h2>
          <button onClick={onClose} className="text-neutral-400" aria-label="close">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mb-2 text-sm font-semibold text-neutral-700">
                {g.name[locale]}{" "}
                <span className="ml-1 text-xs font-normal text-neutral-400">
                  {g.selectionType === "SINGLE"
                    ? t(locale, "modifierChooseOne")
                    : `${t(locale, "modifierChooseUpTo")} ${g.maxSelect}`}
                </span>
              </p>
              <div className="flex flex-col gap-2">
                {g.options.map((o) => {
                  const checked = (selections[g.id] ?? []).includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                        checked ? "border-neutral-800 bg-neutral-50" : "border-neutral-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type={g.selectionType === "SINGLE" ? "radio" : "checkbox"}
                          name={g.id}
                          checked={checked}
                          onChange={() => toggle(g, o.id)}
                        />
                        {o.name[locale]}
                      </span>
                      {o.priceGel > 0 && (
                        <span className="text-neutral-500">
                          +{o.priceGel} {t(locale, "currency")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500">{t(locale, "modifierQty")}</span>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-lg"
            >
              −
            </button>
            <span className="w-4 text-center font-medium">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-lg"
            >
              +
            </button>
          </div>
          <span className="text-sm text-neutral-500">
            {t(locale, "modifierTotalPrice")}: {(unitTotal * qty).toFixed(2)} {t(locale, "currency")}
          </span>
        </div>

        <button
          onClick={() => {
            const optionIds = groups.flatMap((g) => selections[g.id] ?? []);
            onAdd(optionIds, qty);
          }}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-full py-3 font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
        >
          {t(locale, "modifierAddToCart")}
        </button>
      </div>
    </div>
  );
}
