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
};

// --- 1. EXECUTIVE GLASS TEMPLATE ---
export function ExecutiveGlassTemplate({
  profile,
  links,
  brandColor,
  objectPosY,
  focusMode,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 20%", transform: "scale(1.08)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
      {/* Banner */}
      <div
        className="relative h-36 w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${brandColor}ee 0%, #0f172a 100%)` }}
      >
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-xs" />
        <div className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20">
          Executive Card
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative px-6 pb-6 pt-0">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800 shadow-xl ring-2 ring-slate-700/50">
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
                alt="Company Logo"
                className="absolute bottom-0 right-0 h-10 w-10 rounded-full border-2 border-slate-900 bg-white object-contain p-1.5 shadow-lg"
              />
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{profile.display_name}</h1>
            <svg className="w-5 h-5 text-indigo-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
            </svg>
          </div>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {affiliationLines.map((line) => (
                <span
                  key={line}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border"
                  style={{
                    backgroundColor: `${brandColor}25`,
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

        {/* Bio */}
        {profile.bio && (
          <div className="mt-4 rounded-2xl bg-slate-800/40 p-3.5 border border-slate-800 text-sm text-slate-300 leading-relaxed border-l-4" style={{ borderColor: brandColor }}>
            {profile.bio}
          </div>
        )}

        {/* Links */}
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
                  className="group flex items-center justify-between rounded-2xl bg-slate-800/50 p-3.5 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]"
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

        {/* QR Section */}
        <div className="mt-6 rounded-2xl bg-slate-800/30 border border-slate-800 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={120} height={120} className="h-[120px] w-[120px]" />
          </div>
          <p className="text-xs font-medium text-slate-400">Scan to share or save contact</p>
        </div>
      </div>
    </div>
  );
}

// --- 2. MINIMALIST LIGHT TEMPLATE ---
export function MinimalistLightTemplate({
  profile,
  links,
  objectPosY,
  focusMode,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 20%", transform: "scale(1.08)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-slate-900 border border-slate-200/90 shadow-xl">
      {/* Light Banner Header */}
      <div className="h-28 w-full bg-slate-100 border-b border-slate-200 relative p-4 flex items-start justify-end">
        <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Digital Card
        </span>
      </div>

      <div className="relative px-6 pb-6 pt-0">
        <div className="flex justify-between items-end -mt-14 mb-4">
          <div className="relative">
            <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-700 text-2xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{profile.display_name}</h1>
            <span className="text-blue-500 font-bold">✓</span>
          </div>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {affiliationLines.map((line) => (
                <span key={line} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-sm font-medium text-slate-500">🏢 {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-sm text-slate-600 border border-slate-200/80">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Links</h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <LinkIcon icon={link.icon} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-slate-800">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="text-slate-400">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={110} height={110} className="h-[110px] w-[110px]" />
          </div>
          <p className="text-xs font-medium text-slate-500">Scan card QR code</p>
        </div>
      </div>
    </div>
  );
}

// --- 3. AURORA GRADIENT TEMPLATE ---
export function AuroraGradientTemplate({
  profile,
  links,
  objectPosY,
  focusMode,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 20%", transform: "scale(1.08)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-neutral-950 text-white border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.2)]">
      {/* Aurora Banner */}
      <div className="h-36 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 p-4 relative flex items-start justify-end">
        <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider border border-white/20">
          Aurora Pro
        </span>
      </div>

      <div className="relative px-6 pb-6 pt-0">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-2xl ring-2 ring-pink-500/50">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-pink-900/50 text-pink-200 text-3xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">
            {profile.display_name}
          </h1>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {affiliationLines.map((line) => (
                <span key={line} className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-300 border border-pink-500/40">
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-sm font-medium text-neutral-400">✨ {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-2xl bg-neutral-900/80 p-3.5 text-sm text-neutral-300 border border-pink-500/20">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-pink-400 px-1">Channels</h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl bg-neutral-900/80 p-3.5 border border-pink-500/30 hover:border-pink-400 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <LinkIcon icon={link.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-pink-300/80">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-white">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="text-pink-400">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        <div className="mt-6 rounded-2xl bg-neutral-900/60 border border-pink-500/20 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={120} height={120} className="h-[120px] w-[120px]" />
          </div>
          <p className="text-xs font-medium text-neutral-400">Scan QR Code</p>
        </div>
      </div>
    </div>
  );
}

// --- 4. CYBER BOLD TEMPLATE ---
export function CyberBoldTemplate({
  profile,
  links,
  objectPosY,
  focusMode,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 20%", transform: "scale(1.08)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Cyber Banner */}
      <div className="h-32 w-full bg-yellow-400 border-b-4 border-black p-4 flex items-start justify-between">
        <span className="rounded-md bg-black px-3 py-1 text-[11px] font-black text-yellow-400 uppercase tracking-widest">
          CYBER PASS
        </span>
        <span className="text-2xl font-black">★</span>
      </div>

      <div className="relative px-6 pb-6 pt-0">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-black bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black text-white text-3xl font-black">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-black">{profile.display_name}</h1>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {affiliationLines.map((line) => (
                <span key={line} className="rounded-md bg-black px-3 py-1 text-xs font-black text-white border-2 border-black">
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-sm font-black text-black">⚡ {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-xl bg-yellow-100 p-3.5 text-sm font-bold text-black border-2 border-black">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-black px-1">CONNECT</h2>
            <div className="space-y-2.5">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl bg-white p-3.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-yellow-400 font-bold">
                      <LinkIcon icon={link.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-600">{link.label}</p>
                      <p className="truncate text-sm font-black text-black">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="font-black text-lg">➔</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        <div className="mt-6 rounded-xl bg-yellow-400 border-2 border-black p-4 flex flex-col items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-2 bg-white rounded-lg border-2 border-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={120} height={120} className="h-[120px] w-[120px]" />
          </div>
          <p className="text-xs font-black text-black uppercase">SCAN TO CONNECT</p>
        </div>
      </div>
    </div>
  );
}

// --- 5. OBSIDIAN GOLD LUXURY TEMPLATE ---
export function ObsidianGoldTemplate({
  profile,
  links,
  objectPosY,
  focusMode,
}: TemplateProps) {
  const affiliationLines = [profile.designation, profile.department].filter(Boolean);
  const imgStyle: React.CSSProperties =
    focusMode === "head"
      ? { objectPosition: "50% 20%", transform: "scale(1.08)" }
      : focusMode === "fit"
      ? { objectFit: "contain" }
      : { objectPosition: `50% ${objectPosY}` };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-neutral-950 text-amber-100 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
      {/* Luxury Gold Banner */}
      <div className="h-36 w-full bg-gradient-to-r from-neutral-950 via-amber-950 to-neutral-950 p-4 border-b border-amber-500/30 relative flex items-start justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300 uppercase tracking-widest border border-amber-500/30">
          <span>👑</span> LUXURY EXECUTIVE
        </div>
      </div>

      <div className="relative px-6 pb-6 pt-0">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-2xl ring-2 ring-amber-500/60">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" style={imgStyle} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-amber-950 text-amber-300 text-3xl font-bold">
                  {profile.display_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
              {profile.display_name}
            </h1>
            <span className="text-amber-400 text-lg">✦</span>
          </div>

          {affiliationLines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {affiliationLines.map((line) => (
                <span key={line} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  {line}
                </span>
              ))}
            </div>
          )}

          {profile.company && <p className="text-sm font-medium text-amber-200/80">🏛️ {profile.company}</p>}
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-2xl bg-neutral-900/90 p-3.5 text-sm text-amber-100/90 border border-amber-500/20 border-l-4 border-l-amber-500">
            {profile.bio}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-6 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 px-1">EXECUTIVE CONTACT</h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl bg-neutral-900/90 p-3.5 border border-amber-500/30 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <LinkIcon icon={link.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-300/70">{link.label}</p>
                      <p className="truncate text-sm font-semibold text-amber-100">{linkDisplayValue(link.value)}</p>
                    </div>
                  </div>
                  <span className="text-amber-400">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        <div className="mt-6 rounded-2xl bg-neutral-900/80 border border-amber-500/30 p-4 flex flex-col items-center gap-2">
          <div className="p-2 bg-white rounded-xl shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${profile.username}`} alt="QR" width={120} height={120} className="h-[120px] w-[120px]" />
          </div>
          <p className="text-xs font-medium text-amber-300/80">Scan Executive Pass</p>
        </div>
      </div>
    </div>
  );
}
