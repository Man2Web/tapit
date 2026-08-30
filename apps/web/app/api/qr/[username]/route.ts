import { NextResponse } from "next/server";
import QRCode from "qrcode";

type Props = {
  params: Promise<{ username: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { username } = await params;
  const { origin } = new URL(request.url);

  const buffer = await QRCode.toBuffer(`${origin}/u/${username}`, {
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
