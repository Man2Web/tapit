import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/session";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="h-24 w-24 rounded-full bg-neutral-200" />
      )}
      <h1 className="text-xl font-semibold">{profile.display_name}</h1>
      {profile.designation && <p className="text-sm text-neutral-600">{profile.designation}</p>}
      {profile.company && <p className="text-sm text-neutral-600">{profile.company}</p>}

      <a
        href={`/u/${profile.username}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm underline"
      >
        tapit.in/u/{profile.username}
      </a>

      <form action={signOut}>
        <button className="mt-4 rounded-lg border border-neutral-200 px-4 py-2 text-sm">
          Sign out
        </button>
      </form>
    </main>
  );
}
