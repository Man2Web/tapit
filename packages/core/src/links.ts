import type { Database } from "@tapit/types";

type LinkKind = Database["public"]["Enums"]["link_kind"];

export type StarterLinkDef = {
  key: string;
  kind: LinkKind;
  platform?: string;
  label: string;
  placeholder: string;
  inputType: "tel" | "email" | "url" | "text";
  /** Turns what the user typed into the value stored in profile_links.value. */
  formatValue: (raw: string) => string;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
    formatValue: (raw) => `https://wa.me/${digitsOnly(raw).replace(/^\+/, "")}`,
  },
  {
    key: "phone",
    kind: "phone",
    label: "Call",
    placeholder: "+91 98765 43210",
    inputType: "tel",
    formatValue: (raw) => `tel:${digitsOnly(raw)}`,
  },
  {
    key: "email",
    kind: "email",
    label: "Email",
    placeholder: "you@example.com",
    inputType: "email",
    formatValue: (raw) => `mailto:${raw.trim()}`,
  },
  {
    key: "instagram",
    kind: "social",
    platform: "instagram",
    label: "Instagram",
    placeholder: "instagram.com/you",
    inputType: "text",
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
    formatValue: normalizeUrl,
  },
  {
    key: "website",
    kind: "website",
    label: "Website",
    placeholder: "yoursite.com",
    inputType: "text",
    formatValue: normalizeUrl,
  },
];

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
