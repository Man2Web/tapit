import React from "react";
import { linkDisplayValue } from "@tapit/core";
import type { Database } from "@tapit/types";
import { LinkIcon } from "./link-icon";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];

export type TemplateProps = {
  profile: Profile;
  links: ProfileLink[];
  brandColor: string;
  objectPosY: string;
  focusMode: string;
  radiusStyle?: string;
  densityStyle?: string;
};

function getRadiusClass(radius?: string) {
  if (radius === "pill") return "rounded-[32px]";
  if (radius === "sharp") return "rounded-xl";
  return "rounded-3xl"; // default rounded
}

function getAvatarRadiusClass(radius?: string) {
  if (radius === "sharp") return "rounded-2xl";
  return "rounded-full";
}

function getPaddingClass(density?: string) {
  if (density === "compact") return "p-4 gap-3";
  return "p-6 gap-4"; // default spacious
}

// --- 1. STUDIO MINIMALIST LIGHT ---
export function AppleMinimalTemplate({
  profile,
  links,
  brandColor,
  objectPosY,
  focusMode,
  radiusStyle,
  densityStyle,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const cardRadius = getRadiusClass(radiusStyle);
  const avatarRadius = getAvatarRadiusClass(radiusStyle);
  const padding = getPaddingClass(densityStyle);

  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 18%", transform: "scale(1.1)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className={`w-full max-w-md overflow-hidden bg-white text-slate-900 border border-slate-200/90 shadow-2xl ${cardRadius}`}>
      {/* Banner */}
      <div
        className="relative h-36 w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}40 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-xs" />
        <div className="absolute top-4 right-4 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-800 border border-slate-200/80 shadow-xs">
          Digital Card
        </div>
      </div>

      {/* Header Avatar & Identity */}
      <div className={`relative px-6 pb-6 pt-0 ${padding}`}>
        <div className="flex justify-between items-end -mt-16 mb-2">
          <div className="relative">
            <div className={`h-28 w-28 overflow-hidden border-4 border-white bg-slate-100 shadow-lg ring-1 ring-slate-200/80 ${avatarRadius}`}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="h-full w-full object-cover"
                  style={imgStyle}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-700 text-2xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>

            {profile.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt="Logo"
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full border-2 border-white bg-white object-contain p-1 shadow-md"
              />
            )}
          </div>
        </div>

        {/* Identity Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {profile.display_name}
            </h1>
            <svg className="w-5 h-5 text-blue-500 fill-current shrink-0" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
            </svg>
          </div>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {affiliationLines.map((line) => (
                <span
                  key={line}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `${brandColor}12`,
                    color: brandColor,
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && (
            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 pt-0.5">
              <span>🏢</span> {profile.company}
            </p>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 border border-slate-200/70 leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Links List */}
        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Contact & Links
            </h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 hover:bg-slate-100/80 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: brandColor }}
                    >
                      <LinkIcon icon={link.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {linkDisplayValue(link.value)}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Pass */}
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR Code" width={120} height={120} className="h-[120px] w-[120px]" />
          </div>
          <p className="text-xs font-medium text-slate-500">Scan card to save contact</p>
        </div>
      </div>
    </div>
  );
}

// --- 2. EXECUTIVE OBSIDIAN PASS DARK ---
export function ExecutivePassTemplate({
  profile,
  links,
  brandColor,
  objectPosY,
  focusMode,
  radiusStyle,
  densityStyle,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const cardRadius = getRadiusClass(radiusStyle);
  const avatarRadius = getAvatarRadiusClass(radiusStyle);
  const padding = getPaddingClass(densityStyle);

  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 18%", transform: "scale(1.1)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className={`w-full max-w-md overflow-hidden bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl ${cardRadius}`}>
      {/* Banner */}
      <div
        className="relative h-36 w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brandColor}dd 0%, #090d16 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
        <div className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20">
          Executive Pass
        </div>
      </div>

      <div className={`relative px-6 pb-6 pt-0 ${padding}`}>
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <div className={`h-32 w-32 overflow-hidden border-4 border-slate-950 bg-slate-900 shadow-2xl ring-2 ring-slate-800 ${avatarRadius}`}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="h-full w-full object-cover"
                  style={imgStyle}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-300 text-3xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>

            {profile.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt="Logo"
                className="absolute bottom-0 right-0 h-10 w-10 rounded-full border-2 border-slate-950 bg-white object-contain p-1 shadow-lg"
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{profile.display_name}</h1>
            <svg className="w-5 h-5 fill-current shrink-0" style={{ color: brandColor }} viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
            </svg>
          </div>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
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
            <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
              <span>🏢</span> {profile.company}
            </p>
          )}
        </div>

        {profile.bio && (
          <div
            className="mt-4 rounded-2xl bg-slate-900/70 p-4 text-sm text-slate-300 leading-relaxed border-l-4"
            style={{ borderLeftColor: brandColor }}
          >
            {profile.bio}
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Connected Channels
            </h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-2xl bg-slate-900/90 p-3.5 border border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ backgroundColor: brandColor }}
                    >
                      <LinkIcon icon={link.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-400">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {linkDisplayValue(link.value)}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 group-hover:text-white transition-colors">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR Pass */}
        <div className="mt-6 rounded-2xl bg-slate-900/50 border border-slate-800 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR Code" width={120} height={120} className="h-[120px] w-[120px]" />
          </div>
          <p className="text-xs font-medium text-slate-400">Scan Executive Pass</p>
        </div>
      </div>
    </div>
  );
}

// --- 3. macOS SONOMA FROSTED GLASS ---
export function ModernGlassTemplate({
  profile,
  links,
  brandColor,
  objectPosY,
  focusMode,
  radiusStyle,
  densityStyle,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const cardRadius = getRadiusClass(radiusStyle);
  const avatarRadius = getAvatarRadiusClass(radiusStyle);
  const padding = getPaddingClass(densityStyle);

  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 18%", transform: "scale(1.1)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className={`w-full max-w-md overflow-hidden bg-slate-900/75 text-white border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl ${cardRadius}`}>
      {/* Ambient Lighting Background */}
      <div className="relative h-32 w-full overflow-hidden">
        <div
          className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-50"
          style={{ backgroundColor: brandColor }}
        />
        <div className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white uppercase tracking-wider backdrop-blur-md border border-white/20">
          macOS Glass
        </div>
      </div>

      <div className={`relative px-6 pb-6 pt-0 ${padding}`}>
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <div className={`h-30 w-30 overflow-hidden border-4 border-slate-900/80 bg-slate-800/80 shadow-2xl ring-1 ring-white/20 backdrop-blur-md ${avatarRadius}`}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-200 text-2xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{profile.display_name}</h1>
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
              verified
            </span>
          </div>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {affiliationLines.map((line) => (
                <span key={line} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 border border-white/15 backdrop-blur-md">
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-sm font-medium text-slate-300">🏢 {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-slate-200 border border-white/10 backdrop-blur-md leading-relaxed">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Channels</h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl bg-white/10 p-3.5 border border-white/15 hover:bg-white/20 transition-all backdrop-blur-md"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: brandColor }}
                    >
                      <LinkIcon icon={link.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-white">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="text-white/70">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR Pass */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-2 backdrop-blur-md">
          <div className="p-2 bg-white rounded-xl shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={115} height={115} className="h-[115px] w-[115px]" />
          </div>
          <p className="text-xs font-medium text-slate-300">Scan macOS Glass Pass</p>
        </div>
      </div>
    </div>
  );
}

// --- 4. ARCHITECTURAL SLATE ---
export function EditorialSlateTemplate({
  profile,
  links,
  brandColor,
  objectPosY,
  focusMode,
  radiusStyle,
  densityStyle,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const cardRadius = getRadiusClass(radiusStyle);
  const avatarRadius = getAvatarRadiusClass(radiusStyle);
  const padding = getPaddingClass(densityStyle);

  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 18%", transform: "scale(1.1)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className={`w-full max-w-md overflow-hidden bg-slate-900 text-slate-100 border border-slate-800 shadow-2xl ${cardRadius}`}>
      <div className="h-28 w-full bg-slate-950 p-4 flex items-start justify-between border-b border-slate-800">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          EDITORIAL // SLATE
        </span>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
      </div>

      <div className={`relative px-6 pb-6 pt-0 ${padding}`}>
        <div className="flex justify-between items-end -mt-14 mb-4">
          <div className="relative">
            <div className={`h-28 w-28 overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-xl ${avatarRadius}`}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300 text-2xl font-mono">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-serif font-normal tracking-wide text-white">{profile.display_name}</h1>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {affiliationLines.map((line) => (
                <span key={line} className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  [{line}]
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-xs font-mono text-slate-400 uppercase">COMPANY: {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm font-sans text-slate-300 leading-relaxed border-l-2 pl-3 border-slate-700">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 px-1">
              DIRECTORY
            </h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl bg-slate-950 p-3.5 border border-slate-800 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-slate-200 border border-slate-800">
                      <LinkIcon icon={link.icon} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-slate-400 uppercase">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-slate-100">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono text-xs">OPEN ↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        <div className="mt-6 rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={110} height={110} className="h-[110px] w-[110px]" />
          </div>
          <p className="text-[10px] font-mono uppercase text-slate-400">SCAN DIRECTORY CARD</p>
        </div>
      </div>
    </div>
  );
}

// --- 5. WARM IVORY LINEN ---
export function PaperLinenTemplate({
  profile,
  links,
  brandColor,
  objectPosY,
  focusMode,
  radiusStyle,
  densityStyle,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const cardRadius = getRadiusClass(radiusStyle);
  const avatarRadius = getAvatarRadiusClass(radiusStyle);
  const padding = getPaddingClass(densityStyle);

  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 18%", transform: "scale(1.1)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className={`w-full max-w-md overflow-hidden bg-[#FAF7F2] text-[#2C2825] border border-[#E6E0D5] shadow-xl ${cardRadius}`}>
      {/* Linen Header */}
      <div className="h-28 w-full bg-[#F2EDE4] border-b border-[#E6E0D5] p-4 flex items-start justify-end">
        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[#5C544D] border border-[#E6E0D5]">
          Personal Press Card
        </span>
      </div>

      <div className={`relative px-6 pb-6 pt-0 ${padding}`}>
        <div className="flex justify-between items-end -mt-14 mb-4">
          <div className="relative">
            <div className={`h-28 w-28 overflow-hidden border-4 border-[#FAF7F2] bg-[#F2EDE4] shadow-md ring-1 ring-[#E6E0D5] ${avatarRadius}`}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#E6E0D5] text-[#2C2825] text-2xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#2C2825]">{profile.display_name}</h1>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {affiliationLines.map((line) => (
                <span key={line} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5C544D] border border-[#E6E0D5]">
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-sm font-medium text-[#7A6F65]">🏢 {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-[#474039] border border-[#E6E0D5] leading-relaxed">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8C8075] px-1">Links</h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl bg-white p-3.5 border border-[#E6E0D5] hover:bg-[#F5F0E6] transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      <LinkIcon icon={link.icon} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#7A6F65]">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-[#2C2825]">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="text-[#8C8075]">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        <div className="mt-6 rounded-2xl bg-white border border-[#E6E0D5] p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl border border-[#E6E0D5] shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={110} height={110} className="h-[110px] w-[110px]" />
          </div>
          <p className="text-xs font-medium text-[#7A6F65]">Scan Linen Card Pass</p>
        </div>
      </div>
    </div>
  );
}
