import { NextResponse } from "next/server";
import { buildVCard, type VCardPhoto } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { username } = await params;
  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_active", true)
    .single();

  if (!profile) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: links } = await supabase
    .from("profile_links")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_visible", true);

  let photo: VCardPhoto | undefined;
  if (profile.avatar_url) {
    try {
      const res = await fetch(profile.avatar_url);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        photo = {
          base64: buffer.toString("base64"),
          mimeType: res.headers.get("content-type") ?? "image/jpeg",
        };
      }
    } catch {
      // Best-effort — a photo fetch failure shouldn't break the vCard.
    }
  }

  const vcard = buildVCard(profile, links ?? [], photo);

  return new NextResponse(vcard, {
    headers: {
      // iOS Safari needs text/vcard specifically, not text/x-vcard or application/octet-stream.
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${profile.username}.vcf"`,
    },
  });
}
