import { NextResponse } from "next/server";
import { getPromptStats } from "@/lib/db/queries/prompts";
import { getImageStorageStats } from "@/lib/db/queries/images";

// ─── GET /api/stats ───────────────────────────────────────────────────────────

export async function GET() {
  const prompts = getPromptStats();
  const images = getImageStorageStats();

  return NextResponse.json({ prompts, images });
}
