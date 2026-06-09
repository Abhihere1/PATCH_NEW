import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Incident } from "@/lib/models/Incident";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const incident = await Incident.findOne({ incident_id: id, user_id: session.userId }).lean();
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ incident });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const incident = await Incident.findOne({ incident_id: id, user_id: session.userId });
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowedFields = [
    "status", "category", "description", "history", "timeline",
    "escalation_details", "resolution_details", "feedback", "lastupdatedby",
  ];

  for (const key of allowedFields) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (incident as any)[key] = body[key];
    }
  }

  await incident.save();
  return NextResponse.json({ incident });
}
