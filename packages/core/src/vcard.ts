import type { Database } from "@tapit/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];

export type VCardPhoto = { base64: string; mimeType: string };

function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

// RFC 2425 line folding: continuation lines are prefixed with a space. PHOTO lines
// (base64) are the ones actually likely to exceed 75 octets here.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 75) {
    chunks.push(line.slice(i, i + 75));
  }
  return chunks.join("\r\n ");
}

// PRODUCT.md §7.2: vCard 3.0, generated server-side, photo embedded as base64.
export function buildVCard(profile: Profile, links: ProfileLink[], photo?: VCardPhoto): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCardText(profile.display_name)}`];

  if (profile.company) lines.push(`ORG:${escapeVCardText(profile.company)}`);
  if (profile.designation) lines.push(`TITLE:${escapeVCardText(profile.designation)}`);

  const phone = links.find((l) => l.kind === "phone");
  if (phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardText(phone.value.replace(/^tel:/, ""))}`);
  }

  const email = links.find((l) => l.kind === "email");
  if (email) {
    lines.push(`EMAIL:${escapeVCardText(email.value.replace(/^mailto:/, ""))}`);
  }

  const website = links.find((l) => l.kind === "website");
  if (website) {
    lines.push(`URL:${escapeVCardText(website.value)}`);
  }

  for (const link of links) {
    if (link.kind === "social" && link.value) {
      lines.push(`URL;TYPE=${escapeVCardText(link.platform ?? "social")}:${escapeVCardText(link.value)}`);
    }
  }

  if (photo) {
    const type = photo.mimeType.split("/")[1]?.toUpperCase() ?? "JPEG";
    lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${photo.base64}`);
  }

  lines.push("END:VCARD");

  return lines.map(foldLine).join("\r\n");
}
