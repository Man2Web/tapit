import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/session";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
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
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-600">Your digital visiting card.</p>
      </div>

      <SignUpForm />

      <p className="text-center text-sm text-neutral-600">
        Already have an account? <a href="/login" className="font-medium underline">Sign in</a>
      </p>
    </main>
  );
}
