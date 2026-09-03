import type { Database } from "@tapit/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];

export type ApplePassJsonOptions = {
  passTypeIdentifier?: string;
  teamIdentifier?: string;
  baseUrl?: string;
};

export type GoogleWalletOptions = {
  issuerId?: string;
  baseUrl?: string;
};

export function cardWalletUrl(username: string, platform: "apple" | "google", baseUrl = "https://tapit.man2web.in"): string {
  return `${baseUrl}/api/wallet/${platform}/${username}`;
}

export function buildApplePassJson(
  profile: Profile,
  links: ProfileLink[],
  options: ApplePassJsonOptions = {}
) {
  const passTypeIdentifier = options.passTypeIdentifier || process.env.APPLE_PASS_TYPE_ID || "pass.in.man2web.tapit";
  const teamIdentifier = options.teamIdentifier || process.env.APPLE_TEAM_ID || "TAPITPASS";
  const baseUrl = options.baseUrl || "https://tapit.man2web.in";
  const profileUrl = `${baseUrl}/u/${profile.username}?source=wallet`;

  const phoneLink = links.find((l) => l.kind === "phone")?.value.replace(/^tel:/, "");
  const emailLink = links.find((l) => l.kind === "email")?.value.replace(/^mailto:/, "");
  const websiteLink = links.find((l) => l.kind === "website")?.value;

  const secondaryFields = [];
  if (profile.designation) {
    secondaryFields.push({
      key: "designation",
      label: "TITLE",
      value: profile.designation,
    });
  }
  if (profile.company) {
    secondaryFields.push({
      key: "company",
      label: "COMPANY",
      value: profile.company,
    });
  }

  const auxiliaryFields = [];
  if (phoneLink) {
    auxiliaryFields.push({
      key: "phone",
      label: "PHONE",
      value: phoneLink,
    });
  }
  if (emailLink) {
    auxiliaryFields.push({
      key: "email",
      label: "EMAIL",
      value: emailLink,
    });
  } else if (websiteLink) {
    auxiliaryFields.push({
      key: "website",
      label: "WEBSITE",
      value: websiteLink,
    });
  }

  const backFields = [
    {
      key: "profile_url",
      label: "TAPIT PROFILE",
      value: `${baseUrl}/u/${profile.username}`,
    },
  ];

  if (profile.bio) {
    backFields.push({
      key: "bio",
      label: "ABOUT",
      value: profile.bio,
    });
  }

  if (links.length > 0) {
    const linkList = links
      .slice(0, 8)
      .map((l) => `• ${l.label}: ${l.value}`)
      .join("\n");
    backFields.push({
      key: "links",
      label: "CONNECT LINKS",
      value: linkList,
    });
  }

  backFields.push({
    key: "powered_by",
    label: "POWERED BY",
    value: "TapIt — Digital Business Card Platform",
  });

  return {
    formatVersion: 1,
    passTypeIdentifier,
    serialNumber: profile.id,
    teamIdentifier,
    organizationName: "TapIt",
    description: `${profile.display_name} - Digital Business Card`,
    logoText: "TapIt",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(15, 23, 42)",
    labelColor: "rgb(148, 163, 184)",
    generic: {
      headerFields: [
        {
          key: "card_type",
          label: "DIGITAL CARD",
          value: profile.company || "TapIt",
        },
      ],
      primaryFields: [
        {
          key: "name",
          label: "NAME",
          value: profile.display_name,
        },
      ],
      secondaryFields,
      auxiliaryFields,
      backFields,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: profileUrl,
        messageEncoding: "iso-8859-1",
        altText: `Scan to connect with ${profile.display_name}`,
      },
    ],
    barcode: {
      format: "PKBarcodeFormatQR",
      message: profileUrl,
      messageEncoding: "iso-8859-1",
      altText: `Scan to connect with ${profile.display_name}`,
    },
  };
}

export function buildGoogleWalletPayload(
  profile: Profile,
  links: ProfileLink[],
  options: GoogleWalletOptions = {}
) {
  const issuerId = options.issuerId || process.env.GOOGLE_WALLET_ISSUER_ID || "3388000000022345678";
  const baseUrl = options.baseUrl || "https://tapit.man2web.in";
  const profileUrl = `${baseUrl}/u/${profile.username}?source=wallet`;

  const phoneLink = links.find((l) => l.kind === "phone")?.value.replace(/^tel:/, "");
  const emailLink = links.find((l) => l.kind === "email")?.value.replace(/^mailto:/, "");
  const websiteLink = links.find((l) => l.kind === "website")?.value;

  const textModulesData = [
    {
      id: "profile_link",
      header: "Profile Link",
      body: `${baseUrl}/u/${profile.username}`,
    },
  ];

  if (profile.company) {
    textModulesData.push({
      id: "company",
      header: "Company",
      body: profile.company,
    });
  }

  if (phoneLink) {
    textModulesData.push({
      id: "phone",
      header: "Phone",
      body: phoneLink,
    });
  }

  if (emailLink) {
    textModulesData.push({
      id: "email",
      header: "Email",
      body: emailLink,
    });
  }

  if (websiteLink) {
    textModulesData.push({
      id: "website",
      header: "Website",
      body: websiteLink,
    });
  }

  if (profile.bio) {
    textModulesData.push({
      id: "bio",
      header: "Bio",
      body: profile.bio,
    });
  }

  return {
    iss: options.issuerId || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "tapit-wallet@service.account",
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericObjects: [
        {
          id: `${issuerId}.${profile.id.replace(/-/g, "_")}`,
          classId: `${issuerId}.tapit_business_card`,
          cardTitle: {
            defaultValue: {
              language: "en-US",
              value: profile.company || "TapIt Business Card",
            },
          },
          header: {
            defaultValue: {
              language: "en-US",
              value: profile.display_name,
            },
          },
          subheader: {
            defaultValue: {
              language: "en-US",
              value: profile.designation || "Digital Card",
            },
          },
          hexBackgroundColor: "#0f172a",
          barcode: {
            type: "QR_CODE",
            value: profileUrl,
            alternateText: `Scan to connect with ${profile.display_name}`,
          },
          textModulesData,
          linksModuleData: {
            uris: [
              {
                kind: "WALLET_CARD",
                uri: `${baseUrl}/u/${profile.username}`,
                description: "Open Digital Card",
              },
            ],
          },
        },
      ],
    },
  };
}
