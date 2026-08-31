"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

// Fires client-side, not server-side, deliberately: this page is ISR-cached
// (`revalidate = 60` in page.tsx), so a server-side log call would only fire on a cache
// miss/regeneration and massively undercount real visits. Reading the query string here
// (not via a server-passed prop) also means a `?source=qr` request correctly gets counted
// as a QR scan even when it reuses a cached HTML response generated for a plain link visit.
export function ViewTracker({ username }: { username: string }) {
  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("source") === "qr"
      ? "qr"
      : "link";
    // supabase-js's query builder is a *lazy* thenable — the request is only actually sent
    // once something calls .then()/await on it. `void` alone discards the builder without
    // ever triggering that, so the call silently never goes out; the no-op handlers below
    // are what actually fire it.
    createClient()
      .rpc("log_profile_event", { p_username: username, p_event: "view", p_source: source })
      .then(
        () => {},
        () => {},
      );
    // Intentionally run once per mount, not once per (username) change — this component is
    // remounted on navigation to a different profile anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
