import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-neutral-600">
          We&apos;ll email you a link to set a new one.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-neutral-600">
        <a href="/login" className="font-medium underline">Back to sign in</a>
      </p>
    </main>
  );
}
