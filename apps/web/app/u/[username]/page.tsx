import { notFound } from "next/navigation";
import { linkDisplayValue, resolveTheme } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";
import { LinkIcon } from "./link-icon";
import { SaveContactButton } from "./save-contact-button";
import { ViewTracker } from "./view-tracker";

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
  // Title + Department render as two separate colored lines below the name, matching the
  // mobile editor's Affiliation grouping (designation="Title", department="Department").
  const affiliationLines = [profile.designation, profile.department].filter(
    (line): line is string => !!line,
  );

  return (
    <main
      style={{ "--brand-color": theme.primary } as React.CSSProperties}
      className="min-h-dvh bg-neutral-100 pb-28 sm:px-4 sm:pt-8"
    >
      <ViewTracker username={profile.username} />
      {/* Full-bleed on mobile — how this page is actually viewed, via a QR scan or a shared
          link — and becomes a wider centered card at sm+. Small rounding applies at every
          size, not just sm+, so the corners read as a card even flush against the viewport
          edges on mobile. */}
      <div className="mx-auto w-full overflow-hidden rounded-lg bg-white shadow-lg shadow-neutral-300/60 sm:max-w-md sm:shadow-xl">
        <div className="relative h-64 w-full bg-neutral-200">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-full w-full object-cover"
            />
          )}
          <svg
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
            className="absolute -bottom-px left-0 h-14 w-full"
          >
            <path d="M0,20 C100,60 260,0 400,35 L400,60 L0,60 Z" fill={theme.primary} />
          </svg>
          {profile.logo_url && (
            // Floats on top of the wave divider, bottom-right — org logo is optional, so
            // this only renders once one's actually been uploaded (Display tab).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo_url}
              alt={profile.company ? `${profile.company} logo` : "Organization logo"}
              className="absolute bottom-2 right-4 z-10 h-14 w-14 rounded-full border-2 border-white bg-white object-contain p-2 shadow-md"
            />
          )}
        </div>

        <div className="px-6 pb-6 pt-3">
          <div className="flex gap-3">
            <div
              className="shrink-0 border-l-2 border-dotted"
              style={{ borderColor: theme.primary }}
            />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-neutral-900">{profile.display_name}</h1>
              {affiliationLines.map((line) => (
                <p key={line} className="font-semibold leading-tight" style={{ color: theme.primary }}>
                  {line}
                </p>
              ))}
              {profile.company && (
                <p
                  className="italic uppercase leading-tight tracking-tight"
                  style={{ color: theme.primary }}
                >
                  {profile.company}
                </p>
              )}
            </div>
          </div>

          {profile.bio && <p className="mt-3 text-sm text-neutral-500">{profile.bio}</p>}

          {links && links.length > 0 && (
            <ul className="mt-6 space-y-3">
              {links.map((link) => (
                <li key={link.id}>
                  <a href={link.value} className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <LinkIcon icon={link.icon} />
                    </span>
                    <span className="truncate text-sm text-neutral-700">
                      {linkDisplayValue(link.value)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${profile.username}`}
              alt="QR code for this profile"
              width={140}
              height={140}
              className="h-[140px] w-[140px]"
            />
            <p className="text-xs text-neutral-400">Scan to open this card</p>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <SaveContactButton username={profile.username} displayName={profile.display_name} />
        </div>
      </div>
    </main>
  );
}
