import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Incident, HistoryMessage } from "@/lib/models/Incident";
import { callLLM } from "@/lib/llm";
import { loadKBForCategory, loadAllKB } from "@/lib/kb";
import { nanoid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { incident_id, message, category } = body as {
      incident_id?: string;
      message: string;
      category?: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    await connectDB();

    const incident = incident_id
      ? await Incident.findOne({ incident_id, user_id: session.userId })
      : null;

    if (!incident) {
      return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    }

    if (incident.status !== "Open") {
      return NextResponse.json({ error: "This conversation has ended." }, { status: 400 });
    }

    // Add user message to history
    const userMsg: HistoryMessage = {
      id: nanoid(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    incident.history.push(userMsg);

    // Fetch KB context
    const activeCategory = category ?? incident.category;
    const kbContext = activeCategory ? loadKBForCategory(activeCategory) : loadAllKB();

    // Build conversation history for LLM (exclude current user message already added)
    const llmHistory = incident.history.slice(0, -1).map((m: HistoryMessage) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call LLM
    const llmResponse = await callLLM(kbContext, llmHistory, message);

    // Build assistant message
    const assistantMsg: HistoryMessage = {
      id: nanoid(),
      role: "assistant",
      content: llmResponse.response,
      timestamp: new Date(),
    };

    // Attach dynamic control metadata if present
    if (llmResponse.user_probable_options.length > 0) {
      assistantMsg.control_metadata = {
        control_type: llmResponse.user_probable_options.length >= 5 ? "single_select" : "probable_options",
        options: llmResponse.user_probable_options,
        status: "awaiting",
      };
    } else if (llmResponse.input_card_variables.length > 0) {
      assistantMsg.control_metadata = {
        control_type: "structured_form",
        fields: llmResponse.input_card_variables,
        total_cards: llmResponse.total_cards || 1,
        card_values: {},
        status: "awaiting",
      };
    }

    incident.history.push(assistantMsg);

    // Handle escalation
    if (llmResponse.should_escalate) {
      incident.status = "Escalated";
      incident.lastupdatedby = "Escalation Team";
      incident.escalation_details = {
        reason: llmResponse.escalation_data.reason,
        group: llmResponse.escalation_data.group,
        priority: llmResponse.escalation_data.priority,
        urgency: llmResponse.escalation_data.urgency,
        impact: llmResponse.escalation_data.impact,
        timestamp: new Date(),
      };
      incident.timeline.push({ status: "Escalated", timestamp: new Date() });
    } else if (llmResponse.should_resolve) {
      incident.status = "Resolved";
      incident.lastupdatedby = "Patch";
      incident.resolution_details = {
        summary: llmResponse.response,
        timestamp: new Date(),
      };
      incident.timeline.push({ status: "Resolved", timestamp: new Date() });
    }

    // Update category if detected
    if (!incident.category && activeCategory) {
      incident.category = activeCategory;
    }

    await incident.save();

    return NextResponse.json({
      assistant_message: assistantMsg,
      llm_response: llmResponse,
      incident_status: incident.status,
      incident_id: incident.incident_id,
    });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
