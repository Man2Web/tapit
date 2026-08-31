import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tapit/types";

// Public-profile route only needs anonymous, RLS-scoped reads — no cookies/session
// handling required yet. Revisit with @supabase/ssr once auth'd routes land in Phase 1.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fzxgikhutdptltvcruej.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGdpa2h1dGRwdGx0dmNydWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyMjEsImV4cCI6MjEwMzc3MTIyMX0.Ffcwyk804Sr4vZjpB-Do1Isx20KexYfVOZhegXXfw-4";
  return createClient<Database>(
    url,
    key,
    { auth: { persistSession: false } },
  );
}
