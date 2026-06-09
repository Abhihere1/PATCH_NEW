import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Incident } from "@/lib/models/Incident";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const count = await Incident.countDocuments({ user_id: session.userId });
  return NextResponse.json({ count });
}
