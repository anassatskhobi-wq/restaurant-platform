"use client";

import { createBrowserClient } from "@supabase/ssr";

// Used from client components (the admin login form).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
