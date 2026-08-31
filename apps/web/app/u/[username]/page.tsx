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
  const brandColor = theme.primary || "#8b5cf6";

  // Calculate objectPosition vertical percentage from avatar_offset_y (-50 to +50)
  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const avatarOffsetY = typeof themeObj.avatar_offset_y === "number" ? themeObj.avatar_offset_y : 0;
  const objectPosY = `${Math.min(100, Math.max(0, 50 + avatarOffsetY))}%`;

  const affiliationLines = [profile.designation, profile.department].filter(
    (line): line is string => !!line
  );

  return (
    <main
      style={{ "--brand-color": brandColor } as React.CSSProperties}
      className="min-h-dvh bg-neutral-950 text-neutral-100 flex flex-col items-center justify-start pb-32 sm:px-4 sm:py-8"
    >
      <ViewTracker username={profile.username} />

      {/* Main Glassmorphic Profile Card */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-neutral-900/90 border border-neutral-800/80 shadow-2xl backdrop-blur-xl">
        {/* Banner Cover with Gradient Ambient Glow */}
        <div
          className="relative h-36 w-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${brandColor}dd 0%, ${brandColor}44 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-neutral-950/20 backdrop-blur-sm" />
          <div
            className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-2xl opacity-60"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Header Avatar & Logo */}
        <div className="relative px-6 pb-4 pt-0">
          <div className="flex justify-between items-end -mt-16 mb-4">
            <div className="relative">
              <div
                className="h-32 w-32 rounded-full overflow-hidden border-4 border-neutral-900 bg-neutral-800 shadow-xl ring-2 ring-neutral-700/50"
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `50% ${objectPosY}` }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-400">
                    <span className="text-3xl font-bold">
                      {profile.display_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {profile.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt={profile.company ? `${profile.company} logo` : "Organization logo"}
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full border-2 border-neutral-900 bg-white object-contain p-1.5 shadow-lg"
                />
              )}
            </div>
          </div>

          {/* Name & Titles */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {profile.display_name}
            </h1>

            {affiliationLines.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {affiliationLines.map((line) => (
                  <span
                    key={line}
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border"
                    style={{
                      backgroundColor: `${brandColor}20`,
                      color: brandColor,
                      borderColor: `${brandColor}40`,
                    }}
                  >
                    {line}
                  </span>
                ))}
              </div>
            )}

            {profile.company && (
              <p className="text-sm font-medium text-neutral-400 flex items-center gap-1.5 pt-0.5">
                <svg className="w-4 h-4 text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h5m-5 0V11m0 0h5m-5 0H7" />
                </svg>
                {profile.company}
              </p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-4 rounded-2xl bg-neutral-800/40 p-3.5 border border-neutral-800/80 text-sm text-neutral-300 leading-relaxed">
              {profile.bio}
            </div>
          )}

          {/* Action Links */}
          {links && links.length > 0 && (
            <div className="mt-6 space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
                Contact & Links
              </h2>
              <div className="space-y-2">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-2xl bg-neutral-800/50 p-3.5 border border-neutral-800/90 hover:bg-neutral-800 hover:border-neutral-700 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: brandColor }}
                      >
                        <LinkIcon icon={link.icon} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-400">
                          {link.label}
                        </p>
                        <p className="truncate text-sm font-semibold text-neutral-100">
                          {linkDisplayValue(link.value)}
                        </p>
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors shrink-0 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* QR Code Container */}
          <div className="mt-6 rounded-2xl bg-neutral-800/40 border border-neutral-800 p-4 flex flex-col items-center gap-2">
            <div className="p-2 bg-white rounded-xl shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${profile.username}`}
                alt="QR code for this profile"
                width={130}
                height={130}
                className="h-[130px] w-[130px]"
              />
            </div>
            <p className="text-xs font-medium text-neutral-400 mt-1">
              Scan to open or share card
            </p>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800/80 bg-neutral-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <SaveContactButton username={profile.username} displayName={profile.display_name} />
        </div>
      </div>
    </main>
  );
}
