import { NextResponse } from "next/server";
import crypto from "crypto";
import JSZip from "jszip";
import { buildApplePassJson } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ username: string }>;
};

// 1x1 dark slate PNG fallback buffer for Apple Pass icon/logo
const FALLBACK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function getFallbackPngBuffer(): Buffer {
  return Buffer.from(FALLBACK_PNG_BASE64, "base64");
}

function computeSha1(buffer: Buffer): string {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

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
    return new NextResponse("Profile not found", { status: 404 });
  }

  const { data: links } = await supabase
    .from("profile_links")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });

  const passJson = buildApplePassJson(profile, links ?? []);
  const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2), "utf-8");

  // Fetch avatar image if present, fallback to neutral dark PNG
  let iconBuffer = getFallbackPngBuffer();
  if (profile.avatar_url) {
    try {
      const res = await fetch(profile.avatar_url);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        iconBuffer = Buffer.from(arrayBuf);
      }
    } catch {
      // Best effort
    }
  }

  const zip = new JSZip();

  // Add pass files
  zip.file("pass.json", passJsonBuffer);
  zip.file("icon.png", iconBuffer);
  zip.file("icon@2x.png", iconBuffer);
  zip.file("logo.png", iconBuffer);
  zip.file("logo@2x.png", iconBuffer);

  // Generate manifest.json (SHA-1 hashes of all files in pass)
  const manifest: Record<string, string> = {
    "pass.json": computeSha1(passJsonBuffer),
    "icon.png": computeSha1(iconBuffer),
    "icon@2x.png": computeSha1(iconBuffer),
    "logo.png": computeSha1(iconBuffer),
    "logo@2x.png": computeSha1(iconBuffer),
  };

  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  zip.file("manifest.json", manifestBuffer);

  // Sign manifest if Apple Pass certificates are available in env
  const appleCert = process.env.APPLE_PASS_CERT;
  const appleKey = process.env.APPLE_PASS_KEY;
  const applePassphrase = process.env.APPLE_PASS_PASSPHRASE;

  if (appleCert && appleKey) {
    try {
      const sign = crypto.createSign("SHA256");
      sign.update(manifestBuffer);
      const signatureBuffer = sign.sign({
        key: appleKey,
        passphrase: applePassphrase,
      });
      zip.file("signature", signatureBuffer);
    } catch (err) {
      console.warn("Failed to sign Apple Pass with provided certificates:", err);
      // Include dummy signature for dev testing
      zip.file("signature", Buffer.from("DEV_SIGNATURE"));
    }
  } else {
    // Include dev signature when certificates are not configured
    zip.file("signature", Buffer.from("DEV_SIGNATURE"));
  }

  const pkpassBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(pkpassBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${profile.username}.pkpass"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
