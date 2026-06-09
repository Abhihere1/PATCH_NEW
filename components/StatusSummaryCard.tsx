"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface IncidentSummaryData {
  incident_id: string;
  status: string;
  category?: string;
  description?: string;
  user_email?: string;
  createdAt?: Date | string;
  escalation_details?: {
    reason?: string;
    group?: string;
    priority?: string;
    urgency?: string;
    impact?: string;
  };
}

interface Props {
  incident: IncidentSummaryData;
  type: "escalation" | "resolution";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Escalated: "bg-red-50 text-red-700 border-red-200",
    Resolved: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
    >
      {status}
    </span>
  );
}

export default function StatusSummaryCard({ incident, type }: Props) {
  const isEscalation = type === "escalation";

  return (
    <div
      data-testid="status-summary-card"
      className="rounded-xl border p-5 shadow-sm"
      style={{
        background: "#ffffff",
        borderColor: isEscalation ? "#fecaca" : "#bbf7d0",
        borderLeftWidth: "4px",
        borderLeftColor: isEscalation ? "#DC2626" : "#16a34a",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Incident Summary</span>
          <StatusBadge status={isEscalation ? "Escalated" : "Resolved"} />
        </div>
        <Link
          href={`/incidents/${incident.incident_id}`}
          data-testid="view-incident-link"
          className="text-xs font-semibold underline"
          style={{ color: "#DC2626" }}
        >
          View Incident
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Incident ID</dt>
          <dd data-testid="summary-incident-id" className="font-mono text-gray-900 font-semibold">
            {incident.incident_id}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Category</dt>
          <dd data-testid="summary-category" className="text-gray-900">{incident.category || "General"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Description</dt>
          <dd data-testid="summary-description" className="text-gray-900">{incident.description || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Created For</dt>
          <dd data-testid="summary-user" className="text-gray-900">{incident.user_email || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Date / Time</dt>
          <dd data-testid="summary-date" className="text-gray-900">
            {incident.createdAt ? formatDate(incident.createdAt) : "—"}
          </dd>
        </div>

        {isEscalation && incident.escalation_details && (
          <>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Reason</dt>
              <dd data-testid="summary-reason" className="text-gray-900">
                {incident.escalation_details.reason || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Support Group</dt>
              <dd data-testid="summary-group" className="text-gray-900">
                {incident.escalation_details.group || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Priority</dt>
              <dd data-testid="summary-priority" className="text-gray-900">
                {incident.escalation_details.priority || "Medium"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Urgency</dt>
              <dd data-testid="summary-urgency" className="text-gray-900">
                {incident.escalation_details.urgency || "Medium"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">Impact</dt>
              <dd data-testid="summary-impact" className="text-gray-900">
                {incident.escalation_details.impact || "Medium"}
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
