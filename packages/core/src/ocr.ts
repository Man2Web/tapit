export type ParsedCardData = {
  name: string;
  designation: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  rawText: string;
};

const TITLE_KEYWORDS = [
  "ceo",
  "founder",
  "co-founder",
  "director",
  "manager",
  "engineer",
  "developer",
  "designer",
  "consultant",
  "vp",
  "vice president",
  "head",
  "lead",
  "executive",
  "officer",
  "agent",
  "specialist",
  "architect",
  "partner",
  "owner",
  "doctor",
  "advocate",
];

const COMPANY_SUFFIXES = [
  "inc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "llc",
  "pvts",
  "pvt",
  "private",
  "tech",
  "technologies",
  "solutions",
  "studio",
  "agency",
  "group",
  "labs",
];

/**
 * AI-assisted Heuristic Business Card Text Parser
 * Parses raw OCR lines extracted from paper business card images into structured contact fields.
 */
export function parseBusinessCardText(rawInput: string | string[]): ParsedCardData {
  const lines = Array.isArray(rawInput)
    ? rawInput.map((l) => l.trim()).filter(Boolean)
    : rawInput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

  const fullText = lines.join(" ");

  let email = "";
  let phone = "";
  let website = "";
  let designation = "";
  let company = "";
  let name = "";

  const remainingLines: string[] = [];

  for (const line of lines) {
    // Extract Email
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    if (emailMatch && !email) {
      email = emailMatch[0];
      continue;
    }

    // Extract Website
    const webMatch = line.match(/(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}(\/[^\s]*)?/i);
    if (webMatch && !webMatch[0].includes("@") && !website) {
      website = webMatch[0];
      continue;
    }

    // Extract Phone Number
    const phoneMatch = line.match(/(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/);
    if (phoneMatch && line.replace(/[^0-9]/g, "").length >= 7 && !phone) {
      phone = phoneMatch[0].trim();
      continue;
    }

    // Check for Title / Designation
    const lowerLine = line.toLowerCase();
    const isTitle = TITLE_KEYWORDS.some((kw) => lowerLine.includes(kw));
    if (isTitle && !designation) {
      designation = line;
      continue;
    }

    // Check for Company name
    const isCompany = COMPANY_SUFFIXES.some((sfx) => lowerLine.includes(sfx));
    if (isCompany && !company) {
      company = line;
      continue;
    }

    remainingLines.push(line);
  }

  // Heuristic for Name: line with 2-4 words, capitalized, not containing URLs/numbers
  for (const line of remainingLines) {
    const words = line.split(/\s+/);
    if (!name && words.length >= 1 && words.length <= 4 && !/\d/.test(line) && !line.includes("http")) {
      name = line;
    } else if (!company && line !== name) {
      company = line;
    }
  }

  // Fallback: If no name found, use first line
  if (!name && lines.length > 0) {
    name = lines[0] ?? "";
  }

  return {
    name: name || "New Contact",
    designation: designation || "",
    company: company || "",
    phone: phone || "",
    email: email || "",
    website: website || "",
    notes: `Scanned on ${new Date().toLocaleDateString()}`,
    rawText: fullText,
  };
}
