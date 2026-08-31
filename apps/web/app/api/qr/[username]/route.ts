import { NextResponse } from "next/server";
import QRCode from "qrcode";

type Props = {
  params: Promise<{ username: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { username } = await params;
  const { origin } = new URL(request.url);

  // ?source=qr lets the profile page's view-tracker attribute this visit correctly —
  // scanning this image is the only way a viewer reaches the page through this exact URL.
  const buffer = await QRCode.toBuffer(`${origin}/u/${username}?source=qr`, {
    width: 512,
    margin: 1,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
