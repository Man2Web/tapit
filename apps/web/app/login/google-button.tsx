"use client";

import { createClient } from "@/lib/supabase/browser";

export function GoogleSignInButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <button
      onClick={signIn}
      className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-center font-medium"
    >
      Continue with Google
    </button>
  );
}
