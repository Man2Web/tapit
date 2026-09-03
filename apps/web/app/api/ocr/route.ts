import { NextResponse } from "next/server";
import { parseBusinessCardText } from "@tapit/core";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY;

    let extractedLines: string[] = [];

    // 1. Try Gemini Vision AI if API key is provided
    if (apiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Extract contact information from this business card. Return JSON format only:
{
  "name": "Full Name",
  "designation": "Job Title / Role",
  "company": "Company Name",
  "phone": "Phone Number",
  "email": "Email Address",
  "website": "Website URL"
}`,
                    },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textOutput) {
            const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsedJson = JSON.parse(jsonMatch[0]);
                return NextResponse.json({
                  success: true,
                  parsed: {
                    name: parsedJson.name || "",
                    designation: parsedJson.designation || "",
                    company: parsedJson.company || "",
                    phone: parsedJson.phone || "",
                    email: parsedJson.email || "",
                    website: parsedJson.website || "",
                    notes: `Scanned card on ${new Date().toLocaleDateString()}`,
                    rawText: textOutput,
                  },
                });
              } catch {
                // Ignore JSON parse error, fallback to line parser
              }
            }
            extractedLines = textOutput.split("\n").map((l: string) => l.trim()).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn("Gemini Vision API error:", err);
      }
    }

    // 2. Free OCR Engine (OCR.Space API)
    if (extractedLines.length === 0) {
      try {
        const formData = new URLSearchParams();
        formData.append("apikey", "helloworld");
        formData.append("base64Image", `data:image/jpeg;base64,${cleanBase64}`);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");

        const ocrSpaceRes = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        if (ocrSpaceRes.ok) {
          const ocrData = await ocrSpaceRes.json();
          const parsedText = ocrData.ParsedResults?.[0]?.ParsedText;
          if (parsedText) {
            extractedLines = parsedText.split("\n").map((l: string) => l.trim()).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn("OCR.Space engine error:", err);
      }
    }

    const parsed = parseBusinessCardText(extractedLines);

    return NextResponse.json({
      success: true,
      parsed,
      rawLines: extractedLines,
    });
  } catch (error) {
    console.error("OCR API Route error:", error);
    return NextResponse.json({ error: "Failed to process card image" }, { status: 500 });
  }
}
