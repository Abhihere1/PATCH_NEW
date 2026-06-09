import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Incident } from "@/lib/models/Incident";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const { rating, comment } = body as { rating?: number; comment?: string };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const incident = await Incident.findOne({ incident_id: id, user_id: session.userId });
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  incident.feedback = { rating, comment: comment ?? "", submitted_at: new Date() };
  await incident.save();

  return NextResponse.json({ feedback: incident.feedback });
}
