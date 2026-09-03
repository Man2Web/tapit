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

            {/* Digital Wallet Passes */}
            <div className="mt-2 w-full flex flex-row gap-2">
              <a
                href={`/api/wallet/apple/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 py-2 px-3 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.04.22-9.94-1.89-14.7-6.35-3.26-3.04-7.14-7.85-11.64-14.43-6.2-9.01-11.1-18.99-14.68-29.93-3.58-10.95-5.37-21.49-5.37-31.64 0-14.54 3.79-26.17 11.37-34.88 7.58-8.71 16.99-13.16 28.23-13.35 4.88 0 10.05 1.15 15.52 3.44 5.47 2.29 9.3 3.44 11.48 3.44 1.95 0 5.92-1.2 11.91-3.6 5.99-2.4 10.9-3.5 14.75-3.3 10.63.54 19.34 4.54 26.14 12.01-9.55 5.75-14.2 13.99-13.95 24.71.22 8.46 3.42 15.63 9.61 21.5 6.19 5.86 13.56 9.17 22.11 9.93-2.18 6.4-4.88 12.48-8.1 18.26zM119.22 31.81c0-6.4 2.39-12.59 7.18-18.57 4.79-5.98 10.74-9.55 17.85-10.71.32 1.3.49 2.5.49 3.6 0 6.62-2.52 13.1-7.55 19.44-5.04 6.34-11.02 9.87-17.97 10.59-.11-1.3-.17-2.76-.17-4.35z"/>
                </svg>
                Apple Wallet
              </a>
              <a
                href={`/api/wallet/google/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 py-2 px-3 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.82 3.08-3.84 3.08-2.3 0-4.17-1.87-4.17-4.17s1.87-4.17 4.17-4.17c1.07 0 2.04.4 2.79 1.07l2.05-2.05C18.44 6.36 16.73 5.6 14.86 5.6c-4.09 0-7.4 3.31-7.4 7.4s3.31 7.4 7.4 7.4c4.27 0 7.12-3 7.12-7.25 0-.58-.06-1.12-.18-1.65z"/>
                </svg>
                Google Wallet
              </a>
            </div>

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
