import { NextRequest, NextResponse } from "next/server";
import { fetchAbout, writeAbout } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const about = await fetchAbout(userId);

    return NextResponse.json({
      about_text: about?.about_text ?? "",
      updated_at: about?.updated_at ?? null,
    });
  } catch (err) {
    console.error("About GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.user_id;
    const aboutText = body?.about_text ?? "";

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    await writeAbout(userId, String(aboutText));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("About POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
