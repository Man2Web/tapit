import { createClient } from "@/lib/supabase/session";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
      </div>

      {user ? (
        <ResetPasswordForm />
      ) : (
        <p className="text-center text-sm text-neutral-600">
          This reset link is invalid or has expired.{" "}
          <a href="/forgot-password" className="font-medium underline">
            Request a new one
          </a>
          .
        </p>
      )}
    </main>
  );
}
