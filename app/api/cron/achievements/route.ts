import { NextRequest, NextResponse } from "next/server";
import { runAchievementsJob } from "@/lib/achievementsJob";

/**
 * Cron endpoint для job ачивок.
 * Вызов: GET или POST с заголовком Authorization: Bearer <CRON_SECRET>
 * Или при Vercel Cron: автоматически передаётся CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runAchievementsJob();

    console.log(
      `[achievementsJob] rowsRead=${result.rowsRead} rowsFiltered=${result.rowsFiltered} achievementsUpdated=${result.achievementsUpdated}`
    );
    if (result.errors.length > 0) {
      console.error("[achievementsJob] errors:", result.errors);
    }

    return NextResponse.json({
      ok: result.errors.length === 0,
      rowsRead: result.rowsRead,
      rowsFiltered: result.rowsFiltered,
      achievementsUpdated: result.achievementsUpdated,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[achievementsJob] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
