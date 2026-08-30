import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tapit/types";

// Public-profile route only needs anonymous, RLS-scoped reads — no cookies/session
// handling required yet. Revisit with @supabase/ssr once auth'd routes land in Phase 1.
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
