"use client";

import { useState } from "react";
import Link from "next/link";

type Table = {
  id: string;
  label: string;
};

// Ссылка на гостевое меню конкретного столика — по ней и генерируется
// QR-код для распечатки. Локаль в ссылке — грузинская по умолчанию,
// гость может переключить язык прямо в меню (табличка остаётся той же).
function guestUrl(origin: string, venueSlug: string, tableId: string) {
  return `${origin}/ka/menu/${venueSlug}?table=${tableId}`;
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(data)}`;
}

export function TablesPanel({
  venueId,
  venueSlug,
  venueName,
  initialTables,
}: {
  venueId: string;
  venueSlug: string;
  venueName: string;
  initialTables: Table[];
}) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function addTable() {
    const label = newLabel.trim();
    if (!label) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, label }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setTables((list) => [...list, created]);
      setNewLabel("");
    } catch {
      alert("Не удалось добавить столик — проверь интернет и попробуй ещё раз.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTable(id: string) {
    if (!confirm("Удалить этот столик? Ссылка/QR-код на него перестанут работать.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/tables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTables((list) => list.filter((t) => t.id !== id));
    } catch {
      alert("Не удалось удалить столик — проверь интернет и попробуй ещё раз.");
    } finally {
      setDeletingId(null);
    }
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(guestUrl(origin, venueSlug, id));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // буфер обмена недоступен — гость может скопировать ссылку вручную
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-800">{venueName} — столики</h1>
          <p className="text-xs text-neutral-400">
            Каждый столик — своя QR-ссылка на меню. Распечатайте QR-код и положите на стол:
            гость откроет меню, заказ автоматически привяжется к этому столу, и появится кнопка
            «Позвать официанта».
          </p>
        </div>
        <Link
          href={`/admin/${venueSlug}`}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
        >
          ← В меню
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTable();
          }}
          placeholder="Например: Стол 5"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          onClick={addTable}
          disabled={creating || !newLabel.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {creating ? "Добавляем..." : "+ Добавить столик"}
        </button>
      </div>

      {tables.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
          Столиков пока нет — добавьте первый выше.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tables.map((table) => {
            const url = guestUrl(origin, venueSlug, table.id);
            return (
              <li
                key={table.id}
                className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm"
              >
                <p className="font-semibold text-neutral-800">{table.label}</p>
                {origin && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImageUrl(url)}
                    alt={`QR-код для ${table.label}`}
                    className="h-40 w-40"
                  />
                )}
                <p className="w-full truncate text-xs text-neutral-400" title={url}>
                  {url}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(table.id)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600"
                  >
                    {copiedId === table.id ? "Скопировано!" : "Копировать ссылку"}
                  </button>
                  <button
                    onClick={() => deleteTable(table.id)}
                    disabled={deletingId === table.id}
                    className="rounded-lg px-3 py-1.5 text-xs text-red-500 disabled:opacity-40"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
