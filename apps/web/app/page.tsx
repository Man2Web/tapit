export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">TapIt</h1>
      <p className="text-neutral-600">Your digital visiting card, one tap away.</p>

      <div className="flex w-full flex-col gap-3">
        <a
          href="/signup"
          className="rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white"
        >
          Get started
        </a>
        <a
          href="/login"
          className="rounded-lg border border-neutral-200 px-4 py-3 font-medium"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}
