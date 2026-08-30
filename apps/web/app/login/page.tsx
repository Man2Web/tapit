import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/session";
import { GoogleSignInButton } from "./google-button";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in to TapIt</h1>
        <p className="mt-1 text-sm text-neutral-600">Your digital visiting card.</p>
      </div>
      <GoogleSignInButton />
    </main>
  );
}
