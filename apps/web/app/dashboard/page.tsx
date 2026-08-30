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
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      {profile?.avatar_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full" />
      )}
      <h1 className="text-xl font-semibold">{profile?.full_name ?? user.email}</h1>
      <p className="text-sm text-neutral-600">{profile?.email ?? user.email}</p>

      <form action={signOut}>
        <button className="mt-4 rounded-lg border border-neutral-200 px-4 py-2 text-sm">
          Sign out
        </button>
      </form>
    </main>
  );
}
