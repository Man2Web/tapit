import type { Database } from "@tapit/types";

type LinkKind = Database["public"]["Enums"]["link_kind"];

export type StarterLinkDef = {
  key: string;
  kind: LinkKind;
  platform?: string;
  label: string;
  placeholder: string;
  inputType: "tel" | "email" | "url" | "text";
  /** Ionicons glyph name. A plain string, not a component — this package stays UI-framework-
   *  agnostic; each platform's UI layer resolves it against its own icon set. */
  icon: string;
  /** Turns what the user typed into the value stored in profile_links.value. */
  formatValue: (raw: string) => string;
};

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// `@handle` → profile URL for platforms where users type a handle rather than a full link.
// Falls through to normalizeUrl for anything already URL-shaped.
function handleOrUrl(raw: string, buildFromHandle: (handle: string) => string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("@") ? buildFromHandle(trimmed.slice(1)) : normalizeUrl(trimmed);
}

// The inverse of formatValue, roughly: turns a stored profile_links.value (a real URI —
// `mailto:`, `tel:`, `https://wa.me/91...`, `upi://pay?pa=...`) into a short string worth
// actually showing next to a contact-row icon, instead of the raw URI or a generic label.
export function linkDisplayValue(value: string): string {
  const trimmed = value.trim();
  if (/^mailto:/i.test(trimmed)) return trimmed.replace(/^mailto:/i, "");
  if (/^tel:/i.test(trimmed)) return trimmed.replace(/^tel:/i, "");
  if (/^skype:/i.test(trimmed)) return trimmed.replace(/^skype:/i, "").replace(/\?chat$/i, "");
  if (/^upi:\/\/pay\?pa=/i.test(trimmed)) return trimmed.replace(/^upi:\/\/pay\?pa=/i, "");
  const waMatch = /^https?:\/\/wa\.me\/(\d+)/i.exec(trimmed);
  if (waMatch?.[1]) return waMatch[1];
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function digitsOnly(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

// The "6 most common" starter links shown as toggles during onboarding — PRODUCT.md §7.1.
export const STARTER_LINKS: StarterLinkDef[] = [
  {
    key: "whatsapp",
    kind: "whatsapp",
    label: "WhatsApp",
    placeholder: "+91 98765 43210",
    inputType: "tel",
    icon: "logo-whatsapp",
    formatValue: (raw) => `https://wa.me/${digitsOnly(raw).replace(/^\+/, "")}`,
  },
  {
    key: "phone",
    kind: "phone",
    label: "Call",
    placeholder: "+91 98765 43210",
    inputType: "tel",
    icon: "call",
    formatValue: (raw) => `tel:${digitsOnly(raw)}`,
  },
  {
    key: "email",
    kind: "email",
    label: "Email",
    placeholder: "you@example.com",
    inputType: "email",
    icon: "mail",
    // Idempotent: re-applying to an already-formatted value (e.g. when re-saving an
    // unedited link on an edit screen) must not double the prefix.
    formatValue: (raw) => `mailto:${raw.trim().replace(/^mailto:/i, "")}`,
  },
  {
    key: "instagram",
    kind: "social",
    platform: "instagram",
    label: "Instagram",
    placeholder: "instagram.com/you",
    inputType: "text",
    icon: "logo-instagram",
    formatValue: (raw) =>
      raw.trim().startsWith("@")
        ? `https://instagram.com/${raw.trim().slice(1)}`
        : normalizeUrl(raw),
  },
  {
    key: "linkedin",
    kind: "social",
    platform: "linkedin",
    label: "LinkedIn",
    placeholder: "linkedin.com/in/you",
    inputType: "text",
    icon: "logo-linkedin",
    formatValue: normalizeUrl,
  },
  {
    key: "website",
    kind: "website",
    label: "Website",
    placeholder: "yoursite.com",
    inputType: "text",
    icon: "globe-outline",
    formatValue: normalizeUrl,
  },
];

// Full social set for the editor — PRODUCT.md §3's "20+ socials" (Instagram + LinkedIn above
// plus these = 23). Not shown during onboarding; §7.1 deliberately keeps onboarding to the 6
// most common (STARTER_LINKS). Icon names verified against the installed Ionicons glyph map
// (node_modules/@expo/vector-icons); a few platforms have no dedicated Ionicons logo and fall
// back to a generic glyph, noted inline.
export const MORE_SOCIAL_LINKS: StarterLinkDef[] = [
  {
    key: "facebook",
    kind: "social",
    platform: "facebook",
    label: "Facebook",
    placeholder: "facebook.com/you",
    inputType: "text",
    icon: "logo-facebook",
    formatValue: normalizeUrl,
  },
  {
    key: "x",
    kind: "social",
    platform: "x",
    label: "X (Twitter)",
    placeholder: "@you",
    inputType: "text",
    icon: "logo-x",
    formatValue: (raw) => handleOrUrl(raw, (h) => `https://x.com/${h}`),
  },
  {
    key: "youtube",
    kind: "social",
    platform: "youtube",
    label: "YouTube",
    placeholder: "@you",
    inputType: "text",
    icon: "logo-youtube",
    formatValue: (raw) => handleOrUrl(raw, (h) => `https://youtube.com/@${h}`),
  },
  {
    key: "tiktok",
    kind: "social",
    platform: "tiktok",
    label: "TikTok",
    placeholder: "@you",
    inputType: "text",
    icon: "logo-tiktok",
    formatValue: (raw) => handleOrUrl(raw, (h) => `https://tiktok.com/@${h}`),
  },
  {
    key: "snapchat",
    kind: "social",
    platform: "snapchat",
    label: "Snapchat",
    placeholder: "snapchat.com/add/you",
    inputType: "text",
    icon: "logo-snapchat",
    formatValue: normalizeUrl,
  },
  {
    key: "pinterest",
    kind: "social",
    platform: "pinterest",
    label: "Pinterest",
    placeholder: "pinterest.com/you",
    inputType: "text",
    icon: "logo-pinterest",
    formatValue: normalizeUrl,
  },
  {
    key: "threads",
    kind: "social",
    platform: "threads",
    label: "Threads",
    placeholder: "@you",
    inputType: "text",
    icon: "logo-threads",
    formatValue: (raw) => handleOrUrl(raw, (h) => `https://threads.net/@${h}`),
  },
  {
    key: "github",
    kind: "social",
    platform: "github",
    label: "GitHub",
    placeholder: "github.com/you",
    inputType: "text",
    icon: "logo-github",
    formatValue: normalizeUrl,
  },
  {
    key: "behance",
    kind: "social",
    platform: "behance",
    label: "Behance",
    placeholder: "behance.net/you",
    inputType: "text",
    icon: "logo-behance",
    formatValue: normalizeUrl,
  },
  {
    key: "dribbble",
    kind: "social",
    platform: "dribbble",
    label: "Dribbble",
    placeholder: "dribbble.com/you",
    inputType: "text",
    icon: "logo-dribbble",
    formatValue: normalizeUrl,
  },
  {
    key: "medium",
    kind: "social",
    platform: "medium",
    label: "Medium",
    placeholder: "@you",
    inputType: "text",
    icon: "logo-medium",
    formatValue: (raw) => handleOrUrl(raw, (h) => `https://medium.com/@${h}`),
  },
  {
    key: "reddit",
    kind: "social",
    platform: "reddit",
    label: "Reddit",
    placeholder: "u/you",
    inputType: "text",
    icon: "logo-reddit",
    formatValue: (raw) => {
      const trimmed = raw.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const handle = trimmed.replace(/^u\//i, "");
      return `https://reddit.com/u/${handle}`;
    },
  },
  {
    key: "discord",
    kind: "social",
    platform: "discord",
    label: "Discord",
    placeholder: "discord.gg/invite-code",
    inputType: "text",
    icon: "logo-discord",
    formatValue: normalizeUrl,
  },
  {
    key: "twitch",
    kind: "social",
    platform: "twitch",
    label: "Twitch",
    placeholder: "twitch.tv/you",
    inputType: "text",
    icon: "logo-twitch",
    formatValue: normalizeUrl,
  },
  {
    key: "soundcloud",
    kind: "social",
    platform: "soundcloud",
    label: "SoundCloud",
    placeholder: "soundcloud.com/you",
    inputType: "text",
    icon: "logo-soundcloud",
    formatValue: normalizeUrl,
  },
  {
    key: "vimeo",
    kind: "social",
    platform: "vimeo",
    label: "Vimeo",
    placeholder: "vimeo.com/you",
    inputType: "text",
    icon: "logo-vimeo",
    formatValue: normalizeUrl,
  },
  {
    key: "tumblr",
    kind: "social",
    platform: "tumblr",
    label: "Tumblr",
    placeholder: "you.tumblr.com",
    inputType: "text",
    icon: "logo-tumblr",
    formatValue: normalizeUrl,
  },
  {
    key: "mastodon",
    kind: "social",
    platform: "mastodon",
    label: "Mastodon",
    placeholder: "@you@instance.social",
    inputType: "text",
    icon: "logo-mastodon",
    formatValue: (raw) => {
      const trimmed = raw.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const match = /^@([^@\s]+)@([^@\s]+)$/.exec(trimmed);
      return match ? `https://${match[2]}/@${match[1]}` : normalizeUrl(trimmed);
    },
  },
  {
    key: "skype",
    kind: "social",
    platform: "skype",
    label: "Skype",
    placeholder: "Skype ID",
    inputType: "text",
    // No dedicated "call" glyph beyond the brand mark itself; logo-skype covers it.
    icon: "logo-skype",
    formatValue: (raw) => `skype:${raw.trim().replace(/^skype:/i, "").replace(/\?.*$/, "")}?chat`,
  },
  {
    key: "telegram",
    kind: "social",
    platform: "telegram",
    label: "Telegram",
    placeholder: "@you",
    inputType: "text",
    // Ionicons has no logo-telegram; paper-plane is the closest generic stand-in.
    icon: "paper-plane-outline",
    formatValue: (raw) => handleOrUrl(raw, (h) => `https://t.me/${h}`),
  },
  {
    key: "wechat",
    kind: "social",
    platform: "wechat",
    label: "WeChat",
    placeholder: "WeChat ID",
    inputType: "text",
    icon: "logo-wechat",
    // WeChat has no public profile URL scheme — store the ID as-is; already idempotent.
    formatValue: (raw) => raw.trim(),
  },
];

// Non-social link kinds beyond the STARTER_LINKS set — PRODUCT.md §3's "UPI, Google Maps".
export const UTILITY_LINKS: StarterLinkDef[] = [
  {
    key: "upi",
    kind: "upi",
    label: "UPI",
    placeholder: "yourname@upi",
    inputType: "text",
    icon: "cash-outline",
    formatValue: (raw) => `upi://pay?pa=${raw.trim().replace(/^upi:\/\/pay\?pa=/i, "")}`,
  },
  {
    key: "address",
    kind: "address",
    label: "Location (Google Maps)",
    placeholder: "Search an address, or paste a Maps link",
    inputType: "text",
    icon: "location-outline",
    formatValue: (raw) => {
      const trimmed = raw.trim();
      return /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
    },
  },
];

// The full toggle set shown on the editor (as opposed to onboarding's minimal STARTER_LINKS).
export const ALL_TOGGLE_LINKS: StarterLinkDef[] = [
  ...STARTER_LINKS,
  ...MORE_SOCIAL_LINKS,
  ...UTILITY_LINKS,
];

// Custom links (link_kind 'custom') carry a user-typed label, not one of the fixed defs above,
// so they format the same way `website` does — just a plain URL — but aren't part of the
// toggle list.
export const formatCustomLinkValue = normalizeUrl;

// Onboarding auto-suggests a username from the display name — lowercase, ascii only,
// collapsed to the schema's allowed charset (mirrors the username_format check constraint).
// eslint-disable-next-line no-control-regex
const COMBINING_MARKS_PATTERN = "[̀-ͯ]";
const COMBINING_MARKS = new RegExp(COMBINING_MARKS_PATTERN, "g");

export function suggestUsername(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 30);
}
