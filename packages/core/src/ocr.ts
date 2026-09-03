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
  "cto",
  "cfo",
  "coo",
  "cmo",
  "founder",
  "co-founder",
  "director",
  "managing director",
  "president",
  "vice president",
  "vp",
  "manager",
  "general manager",
  "sales manager",
  "marketing manager",
  "project manager",
  "head",
  "head of",
  "lead",
  "chief",
  "executive",
  "officer",
  "engineer",
  "software engineer",
  "developer",
  "designer",
  "architect",
  "consultant",
  "specialist",
  "analyst",
  "strategist",
  "coordinator",
  "partner",
  "managing partner",
  "principal",
  "advisor",
  "owner",
  "proprietor",
  "doctor",
  "dr",
  "advocate",
  "professor",
  "prof",
];

const COMPANY_SUFFIXES = [
  "inc",
  "incorporated",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "llc",
  "pvt",
  "private",
  "private limited",
  "tech",
  "technologies",
  "technology",
  "solutions",
  "services",
  "group",
  "labs",
  "studio",
  "agency",
  "enterprises",
  "industries",
  "holdings",
  "capital",
  "partners",
  "global",
  "systems",
  "digital",
  "media",
  "interactive",
  "software",
  "infotech",
  "consulting",
  "man 2 web",
  "man2web",
];

const SLOGAN_KEYWORDS = [
  "ideas",
  "boost",
  "success",
  "business",
  "bussiness",
  "innovative",
  "creative",
  "design",
  "create",
  "solutions",
  "empowering",
  "growth",
  "future",
  "vision",
  "tagline",
  "slogan",
  "mission",
  "service",
  "services",
  "quality",
  "trust",
  "excellence",
  "crafting",
  "building",
  "shaping",
  "bringing",
  "leading",
  "transforming",
  "your",
  "our",
  "best",
  "help",
  "make",
  "world",
  "partner",
];

/**
 * High-Precision Business Card Text & Field Disambiguation Parser
 */
export function parseBusinessCardText(rawInput: string | string[]): ParsedCardData {
  const lines = Array.isArray(rawInput)
    ? rawInput.map((l) => l.trim()).filter(Boolean)
    : rawInput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

  const fullText = lines.join("\n");

  let email = "";
  let phone = "";
  let website = "";
  let designation = "";
  let company = "";
  let name = "";

  const candidateLines: { text: string; originalIndex: number }[] = [];

  // Phase 1: Extract explicitly labelled or regex-unambiguous fields (Email, Phone, Website)
  lines.forEach((originalLine, idx) => {
    let cleanLine = originalLine.trim();

    // 1. Email Extraction
    if (!email) {
      const emailMatch = cleanLine.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
      if (emailMatch) {
        email = emailMatch[0];
        cleanLine = cleanLine.replace(emailMatch[0], "").replace(/^(email|e-mail|e|mail)[\s:-]*/i, "").trim();
      }
    }

    // 2. Website Extraction
    if (!website) {
      const webMatch = cleanLine.match(/(https?:\/\/[^\s]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}|[a-zA-Z0-9-]+\.(com|net|org|io|in|co|ai|dev|app|biz|me)(\/[^\s]*)?)/i);
      if (webMatch && !webMatch[0].includes("@")) {
        website = webMatch[0];
        cleanLine = cleanLine.replace(webMatch[0], "").replace(/^(web|website|site|w)[\s:-]*/i, "").trim();
      }
    }

    // 3. Phone Extraction
    if (!phone) {
      const phoneMatch = cleanLine.match(/(?:(?:\+|00)\d{1,3}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/);
      if (phoneMatch) {
        const digitCount = phoneMatch[0].replace(/\D/g, "").length;
        if (digitCount >= 7 && digitCount <= 15) {
          phone = phoneMatch[0].trim();
          cleanLine = cleanLine.replace(phoneMatch[0], "").replace(/^(phone|tel|mobile|cell|call|ph|m|t)[\s:-]*/i, "").trim();
        }
      }
    }

    // Strip field labels if left over
    cleanLine = cleanLine
      .replace(/^(name|company|title|designation|org|organization)[\s:-]*/i, "")
      .trim();

    if (cleanLine.length > 0) {
      candidateLines.push({ text: cleanLine, originalIndex: idx });
    }
  });

  // Phase 2: Identify Designation & Company from candidate lines
  const unassignedLines: { text: string; originalIndex: number }[] = [];
  let designationIndex = -1;

  for (const item of candidateLines) {
    const lower = item.text.toLowerCase();

    // Check Title / Designation
    const isTitle = TITLE_KEYWORDS.some((kw) => {
      const regex = new RegExp(`\\b${kw.replace('-', '\\-')}\\b`, 'i');
      return regex.test(lower);
    });

    if (isTitle && !designation) {
      designation = item.text;
      designationIndex = item.originalIndex;
      continue;
    }

    // Check Company
    const isCompany = COMPANY_SUFFIXES.some((sfx) => {
      const regex = new RegExp(`\\b${sfx}\\b`, 'i');
      return regex.test(lower);
    });

    if (isCompany && !company) {
      company = item.text;
      continue;
    }

    unassignedLines.push(item);
  }

  // Phase 3: Score candidate lines to find the true Person Name
  let bestNameCandidate = "";
  let highestNameScore = -999;

  for (const item of unassignedLines) {
    const text = item.text;
    const lower = text.toLowerCase();
    const words = text.split(/\s+/);

    let score = 0;

    // Filter out slogans / sentences containing slogan keywords or prepositions
    const isSlogan =
      SLOGAN_KEYWORDS.some((kw) => lower.includes(kw)) ||
      /\b(to|in|for|with|your|our|of|the|by|at|from|on|about|into|through|over|under|and)\b/i.test(lower);

    if (isSlogan) {
      score -= 100;
    }

    // 1-3 words is ideal for a person's name
    if (words.length >= 1 && words.length <= 3) {
      score += 20;
    } else if (words.length > 4) {
      score -= 30;
    }

    // Capitalized Proper Nouns (e.g. Manikandan, John Smith)
    const isCapitalized = words.every((w) => /^[A-Z][a-z]*$/.test(w) || /^[A-Z]+$/.test(w));
    if (isCapitalized) {
      score += 30;
    }

    // Proximity score: line immediately adjacent to the Designation / Job Title
    if (designationIndex >= 0 && Math.abs(item.originalIndex - designationIndex) <= 1) {
      score += 50;
    }

    // Penalize digits or special symbols
    if (/\d/.test(text)) score -= 40;
    if (/[@#$^&*()_+={}\[\]|\\:;"'<>,?\/]/.test(text)) score -= 40;

    if (score > highestNameScore && score > 0) {
      highestNameScore = score;
      bestNameCandidate = text;
    }
  }

  if (bestNameCandidate) {
    name = bestNameCandidate;
  } else if (unassignedLines.length > 0) {
    name = unassignedLines[0]?.text ?? "";
  }

  return {
    name: name || "",
    designation: designation || "",
    company: company || "",
    phone: phone || "",
    email: email || "",
    website: website || "",
    notes: `Scanned card on ${new Date().toLocaleDateString()}`,
    rawText: fullText,
  };
}
