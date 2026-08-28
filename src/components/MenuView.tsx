"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@/lib/data/venues";
import { locales, localeNames, t, type Locale } from "@/lib/i18n";

type CartLine = {
  itemSlug: string;
  qty: number;
};

function storageKey(venueSlug: string) {
  return `cart:${venueSlug}`;
}

export function MenuView({
  venue,
  locale,
}: {
  venue: Venue;
  locale: Locale;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [orderState, setOrderState] = useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "placed"; orderNumber: string }
  >({ status: "idle" });

  // Load/persist cart per-venue so a refresh at the table doesn't wipe it.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(venue.slug));
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore — start with an empty cart if storage is unavailable
    }
  }, [venue.slug]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(venue.slug), JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, venue.slug]);

  const allItems = useMemo(
    () => venue.categories.flatMap((c) => c.items),
    [venue.categories]
  );

  function itemBySlug(slug: string) {
    return allItems.find((i) => i.slug === slug);
  }

  // Реальная цена, которую видит и платит гость: базовая цена, если для
  // этого блюда не задана скидка/наценка на QR-меню, иначе — со скидкой.
  function effectivePrice(item: { priceGel: number; discountMenuPercent?: number | null }) {
    return item.discountMenuPercent != null
      ? item.priceGel * (1 - item.discountMenuPercent / 100)
      : item.priceGel;
  }

  function addItem(slug: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemSlug === slug);
      if (existing) {
        return prev.map((l) =>
          l.itemSlug === slug ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { itemSlug: slug, qty: 1 }];
    });
  }

  function decrementItem(slug: string) {
    setCart((prev) =>
      prev
        .map((l) => (l.itemSlug === slug ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function removeItem(slug: string) {
    setCart((prev) => prev.filter((l) => l.itemSlug !== slug));
  }

  const totalCount = cart.reduce((sum, l) => sum + l.qty, 0);
  const totalPrice = cart.reduce((sum, l) => {
    const item = itemBySlug(l.itemSlug);
    return sum + (item ? effectivePrice(item) * l.qty : 0);
  }, 0);

  async function placeOrder() {
    setOrderState({ status: "submitting" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug: venue.slug,
          locale,
          items: cart.map((l) => {
            const item = itemBySlug(l.itemSlug);
            return {
              slug: l.itemSlug,
              qty: l.qty,
              name: item?.name[locale],
              // Цена со скидкой/наценкой на QR-меню, если она задана —
              // именно её и должен заплатить гость.
              priceGel: item ? effectivePrice(item) : undefined,
            };
          }),
        }),
      });
      const data = await res.json();
      setOrderState({ status: "placed", orderNumber: data.orderNumber });
      setCart([]);
    } catch {
      setOrderState({ status: "idle" });
    }
  }

  function startNewOrder() {
    setOrderState({ status: "idle" });
    setDrawerOpen(false);
  }

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
    <main className="mx-auto min-h-screen max-w-md pb-28">
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
        </div>
        <div className="mt-4 flex gap-2">
          {locales.map((l) => (
            <Link
              key={l}
              href={`/${l}/menu/${venue.slug}`}
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

      <div className="px-5">
        {venue.categories.map((category) => (
          <section key={category.slug} className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">
              {category.name[locale]}
            </h2>
            <ul className="flex flex-col gap-3">
              {category.items.map((item) => {
                const line = cart.find((l) => l.itemSlug === item.slug);
                const qty = line?.qty ?? 0;
                return (
                  <li
                    key={item.slug}
                    className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm ${
                      item.available ? "" : "opacity-50"
                    }`}
                  >
                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt={item.name[locale]}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium text-neutral-800">
                          {item.name[locale]}
                        </h3>
                        {item.discountMenuPercent != null ? (
                          <span className="flex shrink-0 flex-col items-end whitespace-nowrap">
                            <span className="text-xs text-neutral-400 line-through">
                              {item.priceGel} {t(locale, "currency")}
                            </span>
                            <span className="font-semibold text-red-600">
                              {effectivePrice(item).toFixed(2)} {t(locale, "currency")}
                            </span>
                          </span>
                        ) : (
                          <span className="whitespace-nowrap font-semibold text-neutral-900">
                            {item.priceGel} {t(locale, "currency")}
                          </span>
                        )}
                      </div>
                      {item.description[locale] && (
                        <p className="mt-1 text-sm text-neutral-500">
                          {item.description[locale]}
                        </p>
                      )}
                      {!item.available ? (
                        <p className="mt-2 text-xs font-medium text-red-500">
                          {t(locale, "outOfStock")}
                        </p>
                      ) : (
                        <div className="mt-3 flex items-center justify-end gap-3">
                          {qty > 0 && (
                            <>
                              <button
                                onClick={() => decrementItem(item.slug)}
                                aria-label="-"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-lg font-medium text-neutral-700"
                              >
                                −
                              </button>
                              <span className="w-4 text-center font-medium">
                                {qty}
                              </span>
                            </>
                          )}
                          <button
                            onClick={() => addItem(item.slug)}
                            aria-label="+"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-white"
                            style={{ backgroundColor: venue.brandColor }}
                          >
                            +
                          </button>
                        </div>
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
          className="fixed inset-x-5 bottom-5 z-20 flex items-center justify-between rounded-full px-5 py-3 text-white shadow-lg"
          style={{ backgroundColor: venue.brandColor }}
        >
          <span className="font-medium">
            {t(locale, "cart")} · {totalCount}
          </span>
          <span className="font-semibold">
            {totalPrice.toFixed(2)} {t(locale, "currency")}
          </span>
        </button>
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
                      return (
                        <li
                          key={line.itemSlug}
                          className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3"
                        >
                          <div>
                            <p className="font-medium text-neutral-800">
                              {item.name[locale]}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {item.discountMenuPercent != null ? (
                                <>
                                  <span className="mr-1 line-through">
                                    {item.priceGel} {t(locale, "currency")}
                                  </span>
                                  {effectivePrice(item).toFixed(2)} {t(locale, "currency")}
                                </>
                              ) : (
                                <>
                                  {item.priceGel} {t(locale, "currency")}
                                </>
                              )}{" "}
                              × {line.qty}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decrementItem(line.itemSlug)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300"
                            >
                              −
                            </button>
                            <span className="w-4 text-center">{line.qty}</span>
                            <button
                              onClick={() => addItem(line.itemSlug)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeItem(line.itemSlug)}
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
