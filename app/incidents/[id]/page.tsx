"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import MarkdownMessage from "@/components/MarkdownMessage";
import DynamicControl from "@/components/DynamicControl";
import FeedbackCard from "@/components/FeedbackCard";
import { formatDate } from "@/lib/utils";
import { HistoryMessage, ControlMetadata } from "@/lib/models/Incident";

interface IncidentDetail {
  incident_id: string;
  status: string;
  category: string;
  description: string;
  user_email: string;
  createdAt: string;
  updatedAt: string;
  history: HistoryMessage[];
  timeline: { status: string; timestamp: string }[];
  escalation_details?: {
    reason?: string;
    group?: string;
    priority?: string;
    urgency?: string;
    impact?: string;
    timestamp?: string;
  };
  resolution_details?: {
    summary?: string;
    timestamp?: string;
  };
  feedback?: { rating?: number; comment?: string; submitted_at?: string };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Escalated: "bg-red-50 text-red-700 border-red-200",
    Resolved: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      data-testid="detail-status-badge"
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
    >
      {status}
    </span>
  );
}

function ProgressTimeline({ timeline }: { timeline: IncidentDetail["timeline"] }) {
  const steps = ["Open", "Escalated", "Resolved"];
  const reached = new Set(timeline.map((t) => t.status));

  return (
    <div data-testid="progress-timeline" className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isReached = reached.has(step);
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                data-testid={`timeline-step-${step.toLowerCase()}`}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  background: isReached ? "#DC2626" : "#ffffff",
                  borderColor: isReached ? "#DC2626" : "#d1d5db",
                  color: isReached ? "#ffffff" : "#9ca3af",
                }}
              >
                {isReached ? "✓" : idx + 1}
              </div>
              <span
                className="text-xs mt-1 font-medium"
                style={{ color: isReached ? "#DC2626" : "#9ca3af" }}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className="h-0.5 w-16 mx-1 mb-5"
                style={{ background: isReached ? "#DC2626" : "#e5e7eb" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [incidentId, setIncidentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<{ rating?: number; comment?: string } | undefined>();

  useEffect(() => {
    params.then(({ id }) => {
      setIncidentId(id);
      fetch(`/api/incidents/${id}`)
        .then((r) => {
          if (!r.ok) { router.push("/incidents"); return null; }
          return r.json();
        })
        .then((d) => {
          if (d) {
            setIncident(d.incident);
            setFeedbackData(d.incident.feedback);
          }
        })
        .catch(() => router.push("/incidents"))
        .finally(() => setLoading(false));
    });
  }, [params, router]);

  function handleResumeChat() {
    if (!incidentId) return;
    sessionStorage.setItem("resume_incident_id", incidentId);
    router.push("/");
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (loading) {
    return (
      <div data-testid="incident-detail-loading" className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-24 text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!incident) return null;

  const isOpen = incident.status === "Open";

  return (
    <div data-testid="incident-detail-page" className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto px-4 py-8" style={{ maxWidth: "1100px" }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Link
            href="/incidents"
            data-testid="back-link"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            ← Back
          </Link>
          <div className="flex-1 flex items-center gap-3 flex-wrap">
            <h1
              data-testid="incident-detail-title"
              className="text-xl font-bold text-gray-900"
            >
              {incident.incident_id}
            </h1>
            <StatusBadge status={incident.status} />
            <span className="text-sm text-gray-500">{incident.category || "General"}</span>
          </div>
          {isOpen && (
            <button
              data-testid="resume-chat-btn"
              onClick={handleResumeChat}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "#DC2626" }}
            >
              Resume Chat
            </button>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Conversation History */}
            <section
              data-testid="conversation-history-card"
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-5"
            >
              <h2 data-testid="conv-history-heading" className="text-sm font-bold text-gray-900 mb-4">
                Conversation History
              </h2>
              <div
                data-testid="conv-history-scroll"
                className="overflow-y-auto space-y-3 pr-1"
                style={{ maxHeight: "520px" }}
              >
                {incident.history.length === 0 ? (
                  <p className="text-sm text-gray-400">No messages yet.</p>
                ) : (
                  incident.history.map((msg) => (
                    <HistoryMessageRow
                      key={msg.id}
                      msg={msg}
                      incidentId={incident.incident_id}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Progress */}
            <section
              data-testid="progress-card"
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-5"
            >
              <h2 className="text-sm font-bold text-gray-900 mb-4">Progress</h2>
              <ProgressTimeline timeline={incident.timeline} />
            </section>

            {/* Status Details */}
            {(incident.escalation_details || incident.resolution_details) && (
              <section
                data-testid="status-details-card"
                className="rounded-xl border border-gray-200 bg-white shadow-sm p-5"
              >
                <h2 className="text-sm font-bold text-gray-900 mb-4">
                  {incident.status === "Escalated" ? "Escalation Details" : "Resolution Details"}
                </h2>

                {incident.status === "Escalated" && incident.escalation_details && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {[
                      { label: "Reason", value: incident.escalation_details.reason },
                      { label: "Support Group", value: incident.escalation_details.group },
                      { label: "Priority", value: incident.escalation_details.priority },
                      { label: "Urgency", value: incident.escalation_details.urgency },
                      { label: "Impact", value: incident.escalation_details.impact },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">{label}</dt>
                        <dd className="text-gray-900">{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {incident.status === "Resolved" && incident.resolution_details && (
                  <p className="text-sm text-gray-700">{incident.resolution_details.summary || "—"}</p>
                )}

                {/* Feedback section */}
                {(incident.status === "Escalated" || incident.status === "Resolved") && (
                  <>
                    <hr className="my-5 border-gray-100" />
                    <div data-testid="feedback-section">
                      <div className="flex items-center justify-between mb-3">
                        <h3
                          data-testid="feedback-heading"
                          className="text-sm font-bold text-gray-900"
                        >
                          Rate Your Experience
                        </h3>
                        <span className="text-xs text-gray-400">Optional</span>
                      </div>
                      <FeedbackCard
                        incidentId={incident.incident_id}
                        existingFeedback={feedbackData}
                        onSubmitted={(rating, comment) =>
                          setFeedbackData({ rating, comment })
                        }
                      />
                    </div>
                  </>
                )}
              </section>
            )}
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-4">
            {/* Case Details */}
            <section
              data-testid="case-details-card"
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-5"
            >
              <h2 className="text-sm font-bold text-gray-900 mb-4">Case Details</h2>
              <dl className="space-y-3 text-sm">
                {[
                  { label: "Priority", value: incident.escalation_details?.priority ?? "Medium" },
                  { label: "Type", value: incident.category || "General" },
                  { label: "Urgency", value: incident.escalation_details?.urgency ?? "Medium" },
                  { label: "Impact", value: incident.escalation_details?.impact ?? "Medium" },
                  { label: "Store", value: incident.user_email?.split("@")[1]?.split(".")[0]?.toUpperCase() ?? "—" },
                  { label: "Created", value: formatDate(incident.createdAt) },
                  { label: "Updated", value: formatDate(incident.updatedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-xs uppercase tracking-wide text-gray-400 font-medium">{label}</dt>
                    <dd className="text-gray-900 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Identifiers */}
            <section
              data-testid="identifiers-card"
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-5"
            >
              <h2 className="text-sm font-bold text-gray-900 mb-4">Identifiers</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1">Incident ID</p>
                  <div className="flex items-center gap-2">
                    <span data-testid="detail-incident-id" className="font-mono text-gray-900 text-xs">
                      {incident.incident_id}
                    </span>
                    <button
                      data-testid="copy-incident-id-btn"
                      onClick={() => handleCopy(incident.incident_id, "incident_id")}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {copied === "incident_id" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1">User</p>
                  <div className="flex items-center gap-2">
                    <span data-testid="detail-user-email" className="text-gray-700 text-xs">
                      {incident.user_email}
                    </span>
                    <button
                      data-testid="copy-user-email-btn"
                      onClick={() => handleCopy(incident.user_email, "user_email")}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {copied === "user_email" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function HistoryMessageRow({
  msg,
  incidentId,
}: {
  msg: HistoryMessage;
  incidentId: string;
}) {
  const isUser = msg.role === "user";
  const ctrl = msg.control_metadata as ControlMetadata | undefined;

  return (
    <div
      data-testid={`history-msg-${msg.role}`}
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
        style={{ background: isUser ? "#9ca3af" : "#DC2626" }}
      >
        {isUser ? "U" : "P"}
      </div>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[90%]`}>
        {isUser ? (
          <div
            className="rounded-xl px-3 py-2 text-xs text-white"
            style={{ background: "#DC2626" }}
          >
            {msg.content}
          </div>
        ) : (
          <div
            className="rounded-xl px-3 py-2 text-xs shadow-sm"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderLeftWidth: "2px",
              borderLeftColor: "#DC2626",
            }}
          >
            <MarkdownMessage content={msg.content} />
            {ctrl && (
              <DynamicControl
                control={ctrl}
                messageId={msg.id}
                incidentId={incidentId}
                disabled={true}
                onSend={() => {}}
                isHistoryView={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
