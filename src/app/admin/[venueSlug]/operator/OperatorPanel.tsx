"use client";

import { useState } from "react";

type OpItem = { id: string; nameRu: string; available: boolean };
type OpCategory = { id: string; nameRu: string; items: OpItem[] };
type OpIngredient = { id: string; name: string; unit: string; available: boolean };

export function OperatorPanel({
  venueName,
  initialCategories,
  initialIngredients,
}: {
  venueName: string;
  initialCategories: OpCategory[];
  initialIngredients: OpIngredient[];
}) {
  const [tab, setTab] = useState<"items" | "ingredients">("items");
  const [categories, setCategories] = useState(initialCategories);
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [itemSearch, setItemSearch] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function toggleItem(categoryId: string, item: OpItem) {
    const next = !item.available;
    setErrorMessage(null);
    setCategories((cats) =>
      cats.map((c) =>
        c.id !== categoryId
          ? c
          : { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, available: next } : i)) }
      )
    );
    const res = await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
    if (!res.ok) {
      setCategories((cats) =>
        cats.map((c) =>
          c.id !== categoryId
            ? c
            : { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, available: !next } : i)) }
        )
      );
      setErrorMessage(`Не удалось сохранить «${item.nameRu}» — проверь интернет и попробуй ещё раз.`);
    }
  }

  async function toggleIngredient(ing: OpIngredient) {
    const next = !ing.available;
    setErrorMessage(null);
    setIngredients((list) => list.map((i) => (i.id === ing.id ? { ...i, available: next } : i)));
    const res = await fetch(`/api/admin/ingredients/${ing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
    if (!res.ok) {
      setIngredients((list) => list.map((i) => (i.id === ing.id ? { ...i, available: !next } : i)));
      setErrorMessage(`Не удалось сохранить «${ing.name}» — проверь интернет и попробуй ещё раз.`);
    }
  }

  const itemQuery = itemSearch.trim().toLowerCase();
  const visibleCategories = categories
    .map((c) => ({
      ...c,
      items: c.items.filter((i) => !itemQuery || i.nameRu.toLowerCase().includes(itemQuery)),
    }))
    .filter((c) => c.items.length > 0);

  const ingredientQuery = ingredientSearch.trim().toLowerCase();
  const visibleIngredients = ingredients.filter(
    (i) => !ingredientQuery || i.name.toLowerCase().includes(ingredientQuery)
  );

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-800">{venueName} — режим оператора</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={`flex-1 rounded-lg py-3 text-base font-medium ${
            tab === "items" ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
          }`}
        >
          Блюда
        </button>
        <button
          type="button"
          onClick={() => setTab("ingredients")}
          className={`flex-1 rounded-lg py-3 text-base font-medium ${
            tab === "ingredients" ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
          }`}
        >
          Ингредиенты
        </button>
      </div>

      {errorMessage && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      {tab === "items" ? (
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Поиск блюда..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-base"
          />
          {visibleCategories.length === 0 && (
            <p className="text-sm text-neutral-400">Ничего не найдено.</p>
          )}
          {visibleCategories.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-neutral-500">{c.nameRu}</h2>
              {c.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(c.id, item)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left text-base ${
                    item.available ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <span className="font-medium text-neutral-800">{item.nameRu}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      item.available ? "bg-green-600 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {item.available ? "Есть" : "Нет"}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={ingredientSearch}
            onChange={(e) => setIngredientSearch(e.target.value)}
            placeholder="Поиск ингредиента..."
            className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-3 text-base"
          />
          {visibleIngredients.length === 0 && (
            <p className="text-sm text-neutral-400">Ничего не найдено.</p>
          )}
          {visibleIngredients.map((ing) => (
            <button
              key={ing.id}
              type="button"
              onClick={() => toggleIngredient(ing)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left text-base ${
                ing.available ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <span className="font-medium text-neutral-800">
                {ing.name} <span className="text-sm text-neutral-400">({ing.unit})</span>
              </span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  ing.available ? "bg-green-600 text-white" : "bg-red-500 text-white"
                }`}
              >
                {ing.available ? "Есть" : "Нет"}
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
