import { notFound } from "next/navigation";
import { resolveTheme, type WebTemplateId } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";
import {
  AppleMinimalTemplate,
  ExecutivePassTemplate,
  ModernGlassTemplate,
  EditorialSlateTemplate,
  PaperLinenTemplate,
} from "./card-templates";
import { ViewTracker } from "./view-tracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ username: string }>;
};

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
    brandColor,
    objectPosY,
    focusMode,
    radiusStyle,
    densityStyle,
  };

  const isLightBackground = templateId === "apple_minimal" || templateId === "paper_linen";

  return (
    <main
      style={{ "--brand-color": brandColor } as React.CSSProperties}
      className={`min-h-dvh flex flex-col items-center justify-start pb-32 sm:px-4 sm:py-8 ${
        isLightBackground
          ? "bg-slate-100 text-slate-900"
          : "bg-slate-950 text-slate-100"
      }`}
    >
      <ViewTracker username={profile.username} />

      {templateId === "apple_minimal" && <AppleMinimalTemplate {...props} />}
      {templateId === "executive_pass" && <ExecutivePassTemplate {...props} />}
      {templateId === "modern_glass" && <ModernGlassTemplate {...props} />}
      {templateId === "editorial_slate" && <EditorialSlateTemplate {...props} />}
      {templateId === "paper_linen" && <PaperLinenTemplate {...props} />}
      {!["apple_minimal", "executive_pass", "modern_glass", "editorial_slate", "paper_linen"].includes(templateId) && (
        <AppleMinimalTemplate {...props} />
      )}
    </main>
  );
}
