import { NextRequest, NextResponse } from "next/server";
import { findAllTags, getPopularTags, searchTags } from "@/lib/db/queries/tags";

// ─── GET /api/tags ────────────────────────────────────────────────────────────
// ?q=<search>          → prefix search (returns TagWithCount[])
// ?popular=true        → top N by usage (returns TagWithCount[])
// (no params)          → all tags (returns Tag[])

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  const popular = sp.get("popular");
  const limit = parseInt(sp.get("limit") ?? "50", 10);

  if (q !== null) {
    const results = searchTags(q, Math.min(limit, 100));
    return NextResponse.json(results);
  }

  if (popular === "true") {
    const results = getPopularTags(Math.min(limit, 200));
    return NextResponse.json(results);
  }

  return NextResponse.json(findAllTags());
}
