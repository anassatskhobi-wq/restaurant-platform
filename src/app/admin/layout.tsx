import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-50">
      {user && (
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
          <Link href="/admin" className="font-semibold text-neutral-800">
            Админ-панель
          </Link>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span>{user.email}</span>
            <LogoutButton />
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
