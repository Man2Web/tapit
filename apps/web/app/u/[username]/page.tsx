import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveTheme, type WebTemplateId } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";
import {
  AppleMinimalTemplate,
  ExecutivePassTemplate,
  ModernGlassTemplate,
  EditorialSlateTemplate,
  PaperLinenTemplate,
  GradientAuroraTemplate,
} from "./card-templates";
import { ViewTracker } from "./view-tracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ username: string }>;
};

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_active", true)
    .single();

  if (!profile) {
    return {
      title: "Profile Not Found | Tapit",
    };
  }

  const title = `${profile.display_name} ${profile.designation ? `• ${profile.designation}` : ""} | Tapit Digital Pass`;
  const description =
    profile.bio ||
    `${profile.display_name} - ${profile.designation || "Executive"} ${profile.company ? `at ${profile.company}` : ""}. Connect instantly via NFC or QR code.`;

  const profileUrl = `${WEB_BASE_URL}/u/${profile.username}`;
  const avatarUrl = profile.avatar_url || `${WEB_BASE_URL}/og-default.png`;

  return {
    title,
    description,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: "Tapit Digital Identity",
      images: [
        {
          url: avatarUrl,
          width: 800,
          height: 800,
          alt: profile.display_name,
        },
      ],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [avatarUrl],
    },
  };
}

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

  const { data: blocks } = await supabase
    .from("profile_blocks")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });

  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const theme = resolveTheme(profile.theme);
  const brandColor = theme.primary || "#0071E3";

  const avatarOffsetY = typeof themeObj.avatar_offset_y === "number" ? themeObj.avatar_offset_y : 0;
  const objectPosY = `${Math.min(100, Math.max(0, 50 + avatarOffsetY))}%`;
  const focusMode = typeof themeObj.avatar_focus === "string" ? themeObj.avatar_focus : "head";
  const radiusStyle = typeof themeObj.radius === "string" ? themeObj.radius : "rounded";
  const densityStyle = typeof themeObj.density === "string" ? themeObj.density : "spacious";
  const templateId = (themeObj.template as WebTemplateId) || (theme.template as WebTemplateId) || "apple_minimal";

  const props = {
    profile,
    links: links ?? [],
    blocks: blocks ?? [],
    brandColor,
    objectPosY,
    focusMode,
    radiusStyle,
    densityStyle,
  };

  const isLightBackground = templateId === "apple_minimal" || templateId === "paper_linen";

  // JSON-LD Person Schema Markup for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.display_name,
    jobTitle: profile.designation,
    worksFor: profile.company ? { "@type": "Organization", name: profile.company } : undefined,
    url: `${WEB_BASE_URL}/u/${profile.username}`,
    image: profile.avatar_url,
    description: profile.bio,
  };

  return (
    <main
      style={{ "--brand-color": brandColor } as React.CSSProperties}
      className={`min-h-dvh flex flex-col items-center justify-start pb-32 sm:px-4 sm:py-8 ${
        isLightBackground
          ? "bg-slate-100 text-slate-900"
          : "bg-slate-950 text-slate-100"
      }`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker username={profile.username} />

      {templateId === "apple_minimal" && <AppleMinimalTemplate {...props} />}
      {templateId === "executive_pass" && <ExecutivePassTemplate {...props} />}
      {templateId === "modern_glass" && <ModernGlassTemplate {...props} />}
      {templateId === "editorial_slate" && <EditorialSlateTemplate {...props} />}
      {templateId === "paper_linen" && <PaperLinenTemplate {...props} />}
      {templateId === "gradient_aurora" && <GradientAuroraTemplate {...props} />}
      {!["apple_minimal", "executive_pass", "modern_glass", "editorial_slate", "paper_linen", "gradient_aurora"].includes(templateId) && (
        <AppleMinimalTemplate {...props} />
      )}
    </main>
  );
}
