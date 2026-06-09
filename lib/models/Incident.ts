import mongoose, { Schema, Document, Model } from "mongoose";

export type IncidentStatus = "Open" | "Escalated" | "Resolved";
export type ControlType = "probable_options" | "single_select" | "structured_form";

export interface ControlMetadata {
  control_type: ControlType;
  options?: string[];
  fields?: { name: string; label: string; required: boolean }[];
  total_cards?: number;
  card_values?: Record<number, Record<string, string>>;
  status: "awaiting" | "completed";
  chosen_value?: string;
}

export interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  control_metadata?: ControlMetadata;
}

export interface TimelineEvent {
  status: IncidentStatus;
  timestamp: Date;
}

export interface EscalationDetails {
  reason: string;
  group: string;
  priority: string;
  urgency: string;
  impact: string;
  timestamp: Date;
}

export interface ResolutionDetails {
  summary: string;
  timestamp: Date;
}

export interface FeedbackData {
  rating?: number;
  comment?: string;
  submitted_at?: Date;
}

export interface IIncident extends Document {
  incident_id: string;
  user_id: string;
  user_email: string;
  status: IncidentStatus;
  category: string;
  description: string;
  history: HistoryMessage[];
  timeline: TimelineEvent[];
  escalation_details?: EscalationDetails;
  resolution_details?: ResolutionDetails;
  feedback?: FeedbackData;
  lastupdatedby: string;
  createdAt: Date;
  updatedAt: Date;
}

const ControlMetadataSchema = new Schema<ControlMetadata>(
  {
    control_type: { type: String, required: true },
    options: [String],
    fields: [
      {
        name: String,
        label: String,
        required: Boolean,
      },
    ],
    total_cards: Number,
    card_values: { type: Schema.Types.Mixed },
    status: { type: String, default: "awaiting" },
    chosen_value: String,
  },
  { _id: false }
);

const HistoryMessageSchema = new Schema<HistoryMessage>(
  {
    id: { type: String, required: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    control_metadata: ControlMetadataSchema,
  },
  { _id: false }
);

const TimelineEventSchema = new Schema<TimelineEvent>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const IncidentSchema = new Schema<IIncident>(
  {
    incident_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    user_email: { type: String, required: true },
    status: { type: String, default: "Open" },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    history: [HistoryMessageSchema],
    timeline: [TimelineEventSchema],
    escalation_details: {
      reason: String,
      group: String,
      priority: String,
      urgency: String,
      impact: String,
      timestamp: Date,
    },
    resolution_details: {
      summary: String,
      timestamp: Date,
    },
    feedback: {
      rating: Number,
      comment: String,
      submitted_at: Date,
    },
    lastupdatedby: { type: String, default: "Patch" },
  },
  { timestamps: true }
);

export const Incident: Model<IIncident> =
  mongoose.models.Incident ??
  mongoose.model<IIncident>("Incident", IncidentSchema, "Patch Transactions");
