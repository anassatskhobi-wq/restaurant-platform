"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Неверный email или пароль");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Сначала введи email выше, потом нажми «Забыли пароль»");
      return;
    }
    setResetLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    setResetLoading(false);
    if (error) {
      setError("Не удалось отправить письмо: " + error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-800">
        Вход в админ-панель
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">Пароль</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {resetSent && (
          <p className="text-sm text-green-600">
            Письмо со ссылкой для сброса пароля отправлено на {email}. Проверь почту.
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-neutral-900 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Входим..." : "Войти"}
        </button>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading}
          className="text-sm text-neutral-500 underline disabled:opacity-60"
        >
          {resetLoading ? "Отправляем..." : "Забыли пароль?"}
        </button>
      </form>
    </main>
  );
}
