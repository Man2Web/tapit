import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/session";

// Landing spot for Supabase email links (signup confirmation, password reset) — the
// account itself is created and managed in the mobile app, not here. This just completes
// the code exchange so the link isn't a dead end, then sends the visitor home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(origin);
}
