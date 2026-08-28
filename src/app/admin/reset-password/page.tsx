"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Ссылка из письма создаёт временную сессию восстановления —
    // просто дожидаемся, пока supabase-js её подхватит из URL.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Ошибка: " + error.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/admin/login");
    }, 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-800">
        Новый пароль
      </h1>

      {!ready && !done && (
        <p className="text-sm text-neutral-500">
          Проверяем ссылку из письма...
        </p>
      )}

      {ready && !done && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Новый пароль
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Повтори пароль
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-neutral-900 py-2 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Сохраняем..." : "Сохранить пароль"}
          </button>
        </form>
      )}

      {done && (
        <p className="text-sm text-green-600">
          Пароль обновлён. Переходим на страницу входа...
        </p>
      )}
    </main>
  );
}
