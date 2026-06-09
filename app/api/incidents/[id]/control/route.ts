import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Incident } from "@/lib/models/Incident";

type Params = Promise<{ id: string }>;

// Mark a control step as completed with the chosen value
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const { message_id, chosen_value } = body as { message_id: string; chosen_value: string };

  const incident = await Incident.findOne({ incident_id: id, user_id: session.userId });
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msg = incident.history.find((m) => m.id === message_id);
  if (msg?.control_metadata) {
    msg.control_metadata.status = "completed";
    msg.control_metadata.chosen_value = chosen_value;
  }

  incident.markModified("history");
  await incident.save();

  return NextResponse.json({ ok: true });
}
