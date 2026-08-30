import { notFound } from "next/navigation";
import { resolveTheme } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";

export const revalidate = 60;

type Props = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_active", true)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: links } = await supabase
    .from("profile_links")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });

  const theme = resolveTheme(profile.theme);

  return (
    <main style={{ "--brand-color": theme.primary } as React.CSSProperties} className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-6 py-12">
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          width={96}
          height={96}
          className="h-24 w-24 rounded-full object-cover"
        />
      ) : (
        <div className="h-24 w-24 rounded-full bg-neutral-200" />
      )}

      <div className="text-center">
        <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
        {profile.designation && <p className="text-neutral-600">{profile.designation}</p>}
        {profile.company && <p className="text-neutral-600">{profile.company}</p>}
        {profile.bio && <p className="mt-3 text-sm text-neutral-700">{profile.bio}</p>}
      </div>

      {links && links.length > 0 && (
        <ul className="w-full space-y-2">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.value}
                className="block w-full rounded-lg border border-neutral-200 px-4 py-3 text-center"
                style={{ borderColor: theme.accent }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
