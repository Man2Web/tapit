import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tapit/types";

// AsyncStorage, not SecureStore: GoTrue's persisted session (access + refresh token +
// user metadata) regularly exceeds SecureStore's 2048-byte per-key limit.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://fzxgikhutdptltvcruej.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGdpa2h1dGRwdGx0dmNydWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyMjEsImV4cCI6MjEwMzc3MTIyMX0.Ffcwyk804Sr4vZjpB-Do1Isx20KexYfVOZhegXXfw-4";

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
