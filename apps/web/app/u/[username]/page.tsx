import { notFound } from "next/navigation";
import { resolveTheme, type WebTemplateId } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";
import {
  ExecutiveGlassTemplate,
  MinimalistLightTemplate,
  AuroraGradientTemplate,
  CyberBoldTemplate,
  ObsidianGoldTemplate,
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
  const brandColor = theme.primary || "#8b5cf6";

  const avatarOffsetY = typeof themeObj.avatar_offset_y === "number" ? themeObj.avatar_offset_y : 0;
  const objectPosY = `${Math.min(100, Math.max(0, 50 + avatarOffsetY))}%`;
  const focusMode = typeof themeObj.avatar_focus === "string" ? themeObj.avatar_focus : "head";
  const templateId = (themeObj.template as WebTemplateId) || (theme.template as WebTemplateId) || "executive";

  const props = {
    profile,
    links: links ?? [],
    brandColor,
    objectPosY,
    focusMode,
  };

  return (
    <main
      style={{ "--brand-color": brandColor } as React.CSSProperties}
      className={`min-h-dvh flex flex-col items-center justify-start pb-32 sm:px-4 sm:py-8 ${
        templateId === "minimal_light" || templateId === "cyber_bold"
          ? "bg-slate-100 text-slate-900"
          : "bg-neutral-950 text-neutral-100"
      }`}
    >
      <ViewTracker username={profile.username} />

      {templateId === "minimal_light" && <MinimalistLightTemplate {...props} />}
      {templateId === "aurora_gradient" && <AuroraGradientTemplate {...props} />}
      {templateId === "cyber_bold" && <CyberBoldTemplate {...props} />}
      {templateId === "obsidian_gold" && <ObsidianGoldTemplate {...props} />}
      {(templateId === "executive" || !["minimal_light", "aurora_gradient", "cyber_bold", "obsidian_gold"].includes(templateId)) && (
        <ExecutiveGlassTemplate {...props} />
      )}
    </main>
  );
}
