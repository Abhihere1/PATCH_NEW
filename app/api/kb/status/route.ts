import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { kbFileExists } from "@/lib/kb";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "vdi";
  const exists = kbFileExists(category);

  return NextResponse.json({ category, available: exists });
}
