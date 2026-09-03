import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildGoogleWalletPayload } from "@tapit/core";
import { createPublicClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ username: string }>;
};

function base64UrlEncode(str: string | Buffer): string {
  const base64 = typeof str === "string" ? Buffer.from(str).toString("base64") : str.toString("base64");
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(dataToSign);
  const signature = signer.sign(privateKeyPem);
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
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

  const googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const googleClientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const googleIssuerId = process.env.GOOGLE_WALLET_ISSUER_ID;

  const payload = buildGoogleWalletPayload(profile, links ?? [], {
    issuerId: googleIssuerId,
  });

  if (googlePrivateKey && googleClientEmail) {
    try {
      const jwt = signJwt(payload, googlePrivateKey);
      const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;
      return NextResponse.redirect(saveUrl);
    } catch (err) {
      console.warn("Failed to sign Google Wallet JWT:", err);
    }
  }

  // Fallback: If Google Wallet service account keys are not configured,
  // redirect to Google Wallet web flow or the profile page with wallet query param
  const fallbackUrl = `https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiJ9?username=${encodeURIComponent(username)}`;
  return NextResponse.redirect(fallbackUrl);
}
