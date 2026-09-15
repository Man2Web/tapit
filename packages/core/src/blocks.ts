export type BlockType =
  | "contact"
  | "social"
  | "website"
  | "video"
  | "file"
  | "portfolio"
  | "product"
  | "service"
  | "payment"
  | "booking"
  | "testimonial"
  | "location"
  | "text"
  | "image"
  | "gallery"
  | "review"
  | "custom_link"
  | "cta";

export type ProfileBlockData = {
  url?: string;
  value?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  price?: string;
  image_url?: string;
  author?: string;
  designation?: string;
  embed_url?: string;
  file_url?: string;
  action_label?: string;
  [key: string]: unknown;
};

export type ProfileBlock = {
  id: string;
  profile_id: string;
  block_type: BlockType;
  title: string;
  data: ProfileBlockData;
  position: number;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BlockDefinition = {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  category: "contact" | "content" | "business" | "action";
  defaultTitle: string;
  placeholderUrl?: string;
};

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "contact",
    label: "Contact Direct",
    description: "Phone, Email, WhatsApp & Address details",
    icon: "call-outline",
    category: "contact",
    defaultTitle: "Get in Touch",
    placeholderUrl: "tel:+1234567890",
  },
  {
    type: "social",
    label: "Social Networks",
    description: "LinkedIn, Instagram, X, YouTube & GitHub",
    icon: "logo-linkedin",
    category: "contact",
    defaultTitle: "LinkedIn Profile",
    placeholderUrl: "https://linkedin.com/in/username",
  },
  {
    type: "website",
    label: "Website / Blog",
    description: "Link to your company site or personal blog",
    icon: "globe-outline",
    category: "content",
    defaultTitle: "Official Website",
    placeholderUrl: "https://example.com",
  },
  {
    type: "booking",
    label: "Book a Meeting",
    description: "Calendly or Cal.com appointment booking",
    icon: "calendar-outline",
    category: "action",
    defaultTitle: "Schedule 15-Min Meeting",
    placeholderUrl: "https://calendly.com/username",
  },
  {
    type: "service",
    label: "Professional Services",
    description: "Showcase service offerings and pricing",
    icon: "briefcase-outline",
    category: "business",
    defaultTitle: "Executive Consulting",
  },
  {
    type: "product",
    label: "Product Showcase",
    description: "Highlight key products or hardware gear",
    icon: "bag-handle-outline",
    category: "business",
    defaultTitle: "NFC Executive Card",
  },
  {
    type: "portfolio",
    label: "Portfolio Gallery",
    description: "Showcase client projects & case studies",
    icon: "images-outline",
    category: "content",
    defaultTitle: "Design Portfolio",
  },
  {
    type: "video",
    label: "Featured Video",
    description: "Embed YouTube, Vimeo or Loom presentation",
    icon: "play-circle-outline",
    category: "content",
    defaultTitle: "Watch Product Intro",
    placeholderUrl: "https://youtube.com/watch?v=...",
  },
  {
    type: "file",
    label: "Brochure / PDF Deck",
    description: "Upload downloadable pitch deck or PDF",
    icon: "document-text-outline",
    category: "content",
    defaultTitle: "Company Brochure PDF",
  },
  {
    type: "payment",
    label: "Payment Link",
    description: "Stripe, PayPal, UPI or CashApp link",
    icon: "card-outline",
    category: "action",
    defaultTitle: "Send Payment",
    placeholderUrl: "https://paypal.me/username",
  },
  {
    type: "testimonial",
    label: "Client Review",
    description: "Quotes & recommendations from clients",
    icon: "star-outline",
    category: "business",
    defaultTitle: "Client Recommendation",
  },
  {
    type: "location",
    label: "Office Location",
    description: "Google Maps directions & address",
    icon: "location-outline",
    category: "contact",
    defaultTitle: "Headquarters Address",
  },
  {
    type: "text",
    label: "Announcement / Note",
    description: "Highlighted text memo or message banner",
    icon: "information-circle-outline",
    category: "content",
    defaultTitle: "Special Announcement",
  },
  {
    type: "image",
    label: "Image",
    description: "Upload or link a single image",
    icon: "image-outline",
    category: "content",
    defaultTitle: "Featured Image",
  },
  {
    type: "gallery",
    label: "Image Gallery",
    description: "Showcase multiple images in a grid",
    icon: "images-outline",
    category: "content",
    defaultTitle: "Photo Gallery",
  },
  {
    type: "review",
    label: "Review / Rating",
    description: "Customer review with star rating",
    icon: "star-half-outline",
    category: "business",
    defaultTitle: "Customer Review",
  },
  {
    type: "custom_link",
    label: "Custom Link",
    description: "Any URL with a custom label",
    icon: "link-outline",
    category: "content",
    defaultTitle: "Custom Link",
    placeholderUrl: "https://example.com",
  },
  {
    type: "cta",
    label: "Call to Action",
    description: "Prominent button to drive a specific action",
    icon: "megaphone-outline",
    category: "action",
    defaultTitle: "Get Started",
    placeholderUrl: "https://example.com",
  },
];

export function getBlockDefinition(type: BlockType): BlockDefinition {
  return (
    BLOCK_DEFINITIONS.find((b) => b.type === type) ?? {
      type,
      label: "Custom Link",
      description: "Custom content block",
      icon: "link-outline",
      category: "content",
      defaultTitle: "Custom Block",
    }
  );
}

/** Starter blocks created during onboarding for a new profile. */
export function getStarterBlocks(profileId: string): Omit<ProfileBlock, "id" | "created_at" | "updated_at">[] {
  return [
    {
      profile_id: profileId,
      block_type: "contact",
      title: "Get in Touch",
      data: {},
      position: 0,
      is_visible: true,
    },
    {
      profile_id: profileId,
      block_type: "social",
      title: "Connect Online",
      data: {},
      position: 1,
      is_visible: true,
    },
  ];
}

/** Create a duplicate of an existing block with a new position. */
export function duplicateBlock(
  block: ProfileBlock,
  newPosition: number,
): Omit<ProfileBlock, "id" | "created_at" | "updated_at"> {
  return {
    profile_id: block.profile_id,
    block_type: block.block_type,
    title: `${block.title} (Copy)`,
    data: { ...block.data },
    position: newPosition,
    is_visible: block.is_visible,
  };
}

export type BlockValidationResult = { valid: boolean; error?: string };

/** Validate a block's data based on its type. */
export function validateBlock(block: Pick<ProfileBlock, "block_type" | "title" | "data">): BlockValidationResult {
  if (!block.title.trim()) {
    return { valid: false, error: "Title is required." };
  }

  const urlTypes: BlockType[] = ["website", "booking", "payment", "custom_link", "cta"];
  if (urlTypes.includes(block.block_type) && block.data.url) {
    try {
      new URL(block.data.url);
    } catch {
      return { valid: false, error: "Please enter a valid URL." };
    }
  }

  if (block.block_type === "testimonial") {
    if (!block.data.author?.trim()) {
      return { valid: false, error: "Author name is required for testimonials." };
    }
  }

  if (block.block_type === "cta") {
    if (!block.data.url?.trim() && !block.data.action_label?.trim()) {
      return { valid: false, error: "CTA needs either a URL or action label." };
    }
  }

  return { valid: true };
}
