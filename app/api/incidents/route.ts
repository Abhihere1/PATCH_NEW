import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Incident } from "@/lib/models/Incident";
import { nanoid } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const query: Record<string, string> = { user_id: session.userId };
  if (status && status !== "all") query.status = status;

  const incidents = await Incident.find(query).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const { category } = body as { category?: string };

  const incidentId = `INC-${nanoid(8).toUpperCase()}`;

  const incident = await Incident.create({
    incident_id: incidentId,
    user_id: session.userId,
    user_email: session.email,
    status: "Open",
    category: category ?? "",
    description: `IT support request${category ? ` - ${category}` : ""}`,
    history: [],
    timeline: [{ status: "Open", timestamp: new Date() }],
    lastupdatedby: "Patch",
  });

  return NextResponse.json({ incident }, { status: 201 });
}
