import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@tapit/types";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fzxgikhutdptltvcruej.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGdpa2h1dGRwdGx0dmNydWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyMjEsImV4cCI6MjEwMzc3MTIyMX0.Ffcwyk804Sr4vZjpB-Do1Isx20KexYfVOZhegXXfw-4";
  return createBrowserClient<Database>(url, key);
}
