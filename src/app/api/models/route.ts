import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAllModels, createModel } from "@/lib/db/queries/models";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  return NextResponse.json(findAllModels());
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }
  try {
    const model = createModel(parsed.data.name);
    return NextResponse.json(model, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Model name already exists" }, { status: 409 });
    }
    throw err;
  }
}
