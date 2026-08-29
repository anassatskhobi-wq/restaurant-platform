"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  nameSnapshot: string;
  priceGel: number;
  qty: number;
  modifiersSnapshot: { groupName: string; optionName: string; priceGel: number }[] | null;
};

type Order = {
  id: string;
  orderNumber: number;
  status: string;
  locale: string;
  tableLabel: string | null;
  totalGel: number;
  createdAt: string;
  items: OrderItem[];
};

type WaiterCall = {
  id: string;
  tableLabel: string;
  reason: string;
  createdAt: string;
};

const POLL_MS = 10_000;

const WAITER_REASON_LABEL: Record<string, string> = {
  water: "Вода/стаканы",
  bill: "Хочет счёт",
  help: "Нужна помощь",
  other: "Другое",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "Новый",
  IN_PROGRESS: "Готовится",
  READY: "Готов",
  DONE: "Выдан",
  CANCELLED: "Отменён",
};

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800 border-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  READY: "bg-purple-100 text-purple-800 border-purple-300",
  DONE: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-neutral-100 text-neutral-400 border-neutral-200 line-through",
};

// Следующий шаг статуса + подпись кнопки, которая туда переводит.
// CANCELLED достижим отдельной кнопкой "Отменить", а не отсюда.
const NEXT_STEP: Record<string, { status: string; label: string } | undefined> = {
  NEW: { status: "IN_PROGRESS", label: "Начать готовить" },
  IN_PROGRESS: { status: "READY", label: "Готово" },
  READY: { status: "DONE", label: "Выдано" },
};

const ACTIVE_STATUSES = new Set(["NEW", "IN_PROGRESS", "READY"]);

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function minutesAgo(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

// Короткий сигнал через Web Audio — без внешнего аудиофайла. Браузеры
// глушат звук до первого клика по странице (autoplay policy), поэтому
// самый первый заказ после открытия доски может прозвучать без звука.
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // звук не критичен — новый заказ и так виден и подсвечен
  }
}

export function OrdersBoard({
  venueId,
  venueName,
  venueSlug,
  initialOrders,
  initialWaiterCalls,
}: {
  venueId: string;
  venueName: string;
  venueSlug: string;
  initialOrders: Order[];
  initialWaiterCalls: WaiterCall[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>(initialWaiterCalls);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [busyCallId, setBusyCallId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const knownCallIds = useRef<Set<string>>(new Set(initialWaiterCalls.map((c) => c.id)));

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders?venueId=${venueId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const next: Order[] = data.orders ?? [];
      const nextCalls: WaiterCall[] = data.waiterCalls ?? [];
      const hasNewOrder = next.some((o) => !knownIds.current.has(o.id));
      const hasNewCall = nextCalls.some((c) => !knownCallIds.current.has(c.id));
      if ((hasNewOrder || hasNewCall) && knownIds.current.size > 0) beep();
      knownIds.current = new Set(next.map((o) => o.id));
      knownCallIds.current = new Set(nextCalls.map((c) => c.id));
      setOrders(next);
      setWaiterCalls(nextCalls);
      setFetchError(false);
      setLastUpdated(new Date());
    } catch {
      setFetchError(true);
    }
  }, [venueId]);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  async function setStatus(orderId: string, status: string) {
    setBusyOrderId(orderId);
    const prev = orders;
    setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setOrders(prev); // откатываем оптимистичное обновление
      alert("Не удалось изменить статус — проверь интернет и попробуй ещё раз.");
    } finally {
      setBusyOrderId(null);
    }
  }

  async function acceptWaiterCall(callId: string) {
    setBusyCallId(callId);
    const prev = waiterCalls;
    setWaiterCalls((list) => list.filter((c) => c.id !== callId));
    try {
      const res = await fetch(`/api/admin/waiter-calls/${callId}`, { method: "PATCH" });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setWaiterCalls(prev); // откатываем оптимистичное обновление
      alert("Не удалось отметить вызов — проверь интернет и попробуй ещё раз.");
    } finally {
      setBusyCallId(null);
    }
  }

  const active = orders
    .filter((o) => ACTIVE_STATUSES.has(o.status))
    .sort((a, b) => a.orderNumber - b.orderNumber); // старые — первыми, их ждут дольше
  const finished = orders
    .filter((o) => !ACTIVE_STATUSES.has(o.status))
    .sort((a, b) => b.orderNumber - a.orderNumber)
    .slice(0, 20);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-800">{venueName} — заказы</h1>
          <p className="text-xs text-neutral-400">
            {fetchError
              ? "Не удалось обновить список — проверь интернет."
              : lastUpdated
              ? `Обновлено в ${timeLabel(lastUpdated.toISOString())} · обновляется каждые 10 сек`
              : "Обновляется каждые 10 сек"}
          </p>
        </div>
        <Link
          href={`/admin/${venueSlug}`}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
        >
          ← В меню
        </Link>
      </div>

      {waiterCalls.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-500">
            🛎️ Официант нужен ({waiterCalls.length})
          </h2>
          <ul className="mb-6 flex flex-col gap-2">
            {waiterCalls.map((call) => {
              const busy = busyCallId === call.id;
              return (
                <li
                  key={call.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-neutral-800">
                      {call.tableLabel}
                      <span className="ml-2 text-sm font-normal text-neutral-600">
                        {WAITER_REASON_LABEL[call.reason] ?? call.reason}
                      </span>
                    </p>
                    <p className="text-xs text-neutral-400">
                      {timeLabel(call.createdAt)} · {minutesAgo(call.createdAt)} мин назад
                    </p>
                  </div>
                  <button
                    onClick={() => acceptWaiterCall(call.id)}
                    disabled={busy}
                    className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Принято
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Активные {active.length > 0 && `(${active.length})`}
      </h2>
      {active.length === 0 ? (
        <p className="mb-6 rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
          Пока нет активных заказов.
        </p>
      ) : (
        <ul className="mb-6 flex flex-col gap-3">
          {active.map((order) => {
            const next = NEXT_STEP[order.status];
            const busy = busyOrderId === order.id;
            return (
              <li
                key={order.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-800">
                      №{order.orderNumber}
                      {order.tableLabel && (
                        <span className="ml-2 text-sm font-normal text-neutral-500">
                          {order.tableLabel}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {timeLabel(order.createdAt)} · {minutesAgo(order.createdAt)} мин назад
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                <ul className="mb-3 flex flex-col gap-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="text-sm text-neutral-700">
                      <div className="flex justify-between">
                        <span>
                          {item.nameSnapshot} × {item.qty}
                        </span>
                        <span className="text-neutral-400">
                          {(item.priceGel * item.qty).toFixed(2)} ₾
                        </span>
                      </div>
                      {item.modifiersSnapshot && item.modifiersSnapshot.length > 0 && (
                        <p className="pl-2 text-xs text-neutral-400">
                          + {item.modifiersSnapshot.map((m) => m.optionName).join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                  <span className="font-semibold text-neutral-800">
                    {order.totalGel.toFixed(2)} ₾
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatus(order.id, "CANCELLED")}
                      disabled={busy}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-500 disabled:opacity-40"
                    >
                      Отменить
                    </button>
                    {next && (
                      <button
                        onClick={() => setStatus(order.id, next.status)}
                        disabled={busy}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                      >
                        {next.label}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Завершённые
      </h2>
      {finished.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
          Пока пусто.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {finished.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm"
            >
              <span className="text-neutral-500">
                №{order.orderNumber} · {timeLabel(order.createdAt)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status]}`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
              <span className="text-neutral-400">{order.totalGel.toFixed(2)} ₾</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
