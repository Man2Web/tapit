import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@tapit/types";

// Cookie-aware client for authenticated server components/route handlers/actions.
// Separate from lib/supabase/server.ts, which is a plain anon client for the
// public /u/[username] route that has no session to read.
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fzxgikhutdptltvcruej.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGdpa2h1dGRwdGx0dmNydWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyMjEsImV4cCI6MjEwMzc3MTIyMX0.Ffcwyk804Sr4vZjpB-Do1Isx20KexYfVOZhegXXfw-4";

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component during render — middleware.ts
            // handles refreshing the session cookie on the next request.
          }
        },
      },
    },
  );
}
