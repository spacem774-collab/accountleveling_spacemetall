import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { updateAvatar } from "@/lib/sheets";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get("user_id");
    const file = formData.get("file") as File | null;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type (jpeg, png, webp, gif only)" },
        { status: 400 }
      );
    }

    let avatarUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`avatars/${userId}-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`, file, {
        access: "public",
      });
      avatarUrl = blob.url;
    } else {
      // Mock / dev: store as base64 data URL
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      avatarUrl = `data:${file.type};base64,${base64}`;
    }

    await updateAvatar(userId, avatarUrl);

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
