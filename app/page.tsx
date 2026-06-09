"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import MarkdownMessage from "@/components/MarkdownMessage";
import DynamicControl from "@/components/DynamicControl";
import FeedbackCard from "@/components/FeedbackCard";
import StatusSummaryCard from "@/components/StatusSummaryCard";
import { HistoryMessage, ControlMetadata, IIncident } from "@/lib/models/Incident";
import { nanoid } from "@/lib/utils";

type UIState = "PRE_CHAT" | "ACTIVE_CHAT";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  control_metadata?: ControlMetadata;
  isTyping?: boolean;
}

interface IncidentData {
  incident_id: string;
  status: string;
  category: string;
  description?: string;
  user_email?: string;
  createdAt?: string;
  escalation_details?: {
    reason?: string;
    group?: string;
    priority?: string;
    urgency?: string;
    impact?: string;
  };
}

export default function MainPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ userId: string; email: string; username: string } | null>(null);
  const [uiState, setUIState] = useState<UIState>("PRE_CHAT");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeIncident, setActiveIncident] = useState<IncidentData | null>(null);
  const [vdiKBAvailable, setVdiKBAvailable] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) { router.push("/login"); return null; }
        return r.json();
      })
      .then((d) => d && setUser(d.user))
      .catch(() => router.push("/login"));
  }, [router]);

  // Check KB status
  useEffect(() => {
    fetch("/api/kb/status?category=vdi")
      .then((r) => r.json())
      .then((d) => setVdiKBAvailable(d.available))
      .catch(() => setVdiKBAvailable(false));
  }, []);

  async function fetchAndResumeIncident(incidentId: string) {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      if (!res.ok) return;
      const { incident } = await res.json() as { incident: IIncident & IncidentData };

      const msgs: ChatMessage[] = (incident.history ?? []).map((m: HistoryMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        control_metadata: m.control_metadata,
      }));

      setActiveIncident({
        incident_id: incident.incident_id,
        status: incident.status,
        category: incident.category,
        description: incident.description,
        user_email: incident.user_email,
        createdAt: incident.createdAt ? String(incident.createdAt) : undefined,
        escalation_details: incident.escalation_details,
      });
      setMessages(msgs);
      setUIState("ACTIVE_CHAT");
    } catch (err) {
      console.error("[resume]", err);
    }
  }

  // Resume incident from sessionStorage
  useEffect(() => {
    const resumeId = sessionStorage.getItem("resume_incident_id");
    if (!resumeId) return;
    sessionStorage.removeItem("resume_incident_id");
    // setState calls inside fetchAndResumeIncident are async (after awaits), not synchronous
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAndResumeIncident(resumeId);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createIncident = useCallback(async (category: string): Promise<IncidentData | null> => {
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    if (!res.ok) return null;
    const { incident } = await res.json();
    return incident;
  }, []);

  const sendMessage = useCallback(
    async (text: string, controlMessageId?: string) => {
      if (!text.trim() || isSending || isTyping) return;
      if (activeIncident && activeIncident.status !== "Open") return;

      setIsSending(true);
      setIsTyping(true);

      // Mark control as completed if applicable
      if (controlMessageId && activeIncident) {
        try {
          await fetch(`/api/incidents/${activeIncident.incident_id}/control`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message_id: controlMessageId, chosen_value: text }),
          });
        } catch { /* non-critical */ }
      }

      let currentIncident = activeIncident;

      // Create incident on first message
      if (!currentIncident) {
        const newIncident = await createIncident("");
        if (!newIncident) {
          setIsTyping(false);
          setIsSending(false);
          return;
        }
        currentIncident = {
          incident_id: newIncident.incident_id,
          status: "Open",
          category: "",
          user_email: user?.email,
          createdAt: newIncident.createdAt,
        };
        setActiveIncident(currentIncident);
        setUIState("ACTIVE_CHAT");
      }

      // Optimistically add user message
      const userMsgId = nanoid();
      const userMsg: ChatMessage = { id: userMsgId, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incident_id: currentIncident.incident_id,
            message: text,
            category: currentIncident.category,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            { id: nanoid(), role: "assistant", content: `Error: ${data.error}` },
          ]);
          return;
        }

        const assistantMsg: ChatMessage = {
          id: data.assistant_message.id,
          role: "assistant",
          content: data.assistant_message.content,
          control_metadata: data.assistant_message.control_metadata,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Update incident status
        if (data.incident_status && data.incident_status !== currentIncident.status) {
          setActiveIncident((prev) =>
            prev ? { ...prev, status: data.incident_status } : prev
          );
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "assistant", content: "Network error. Please try again." },
        ]);
      } finally {
        setIsTyping(false);
        setIsSending(false);
      }
    },
    [activeIncident, createIncident, isSending, isTyping, user]
  );

  function handleNewChat() {
    setUIState("PRE_CHAT");
    setMessages([]);
    setActiveIncident(null);
    setInput("");
    setIsTyping(false);
    setIsSending(false);
  }

  function handleTileClick() {
    sendMessage("I have a problem with my VDI");
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isInputDisabled =
    isTyping || isSending || (activeIncident?.status != null && activeIncident.status !== "Open");

  const displayName = user?.username || user?.email?.split("@")[0] || "Associate";

  const lastMsg = messages[messages.length - 1];
  const isEnded = activeIncident && activeIncident.status !== "Open";

  return (
    <div data-testid="main-page" className="flex flex-col h-screen bg-gray-50">
      <Header onNewChat={handleNewChat} />

      {uiState === "PRE_CHAT" && (
        <main
          data-testid="pre-chat-landing"
          className="flex flex-col flex-1 items-center justify-between py-16 px-4"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, #fee2e2 0%, #f9fafb 60%)",
          }}
        >
          <div className="flex flex-col items-center gap-8 w-full" style={{ maxWidth: "760px" }}>
            {/* Patch mark */}
            <div data-testid="hero-patch-mark" className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow"
                style={{ background: "#DC2626" }}
              >
                P
              </div>
            </div>

            {/* Welcome */}
            <div data-testid="hero-welcome" className="text-center">
              <h1 data-testid="hero-heading" className="text-2xl font-semibold text-gray-900">
                Welcome to the Discount Tire Information Center,{" "}
                <span data-testid="hero-username" className="text-red-600">{displayName}</span>.
              </h1>
              <p data-testid="hero-subtitle" className="text-sm text-gray-500 mt-1">
                Select a category below or type your question to get started.
              </p>
            </div>

            {/* VDI Tile */}
            <button
              data-testid="vdi-tile"
              onClick={handleTileClick}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-10 py-8 shadow-sm transition-all duration-150 hover:shadow-md hover:border-red-300"
              style={{ minWidth: "200px" }}
            >
              <div
                data-testid="vdi-tile-icon"
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: "#FEF2F2" }}
              >
                🖥
              </div>
              <span data-testid="vdi-tile-label" className="font-semibold text-gray-900 text-sm">
                VDI
              </span>
              <span
                data-testid="vdi-kb-badge"
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: vdiKBAvailable ? "#f0fdf4" : "#f9fafb",
                  color: vdiKBAvailable ? "#16a34a" : "#6b7280",
                  border: `1px solid ${vdiKBAvailable ? "#86efac" : "#e5e7eb"}`,
                }}
              >
                {vdiKBAvailable === null ? "Checking…" : vdiKBAvailable ? "KB Available" : "KB Missing"}
              </span>
            </button>
          </div>

          {/* Composer at bottom */}
          <div className="w-full" style={{ maxWidth: "760px" }}>
            <ComposerBar
              value={input}
              onChange={setInput}
              onSend={() => sendMessage(input)}
              onKeyDown={handleInputKeyDown}
              disabled={false}
              textareaRef={textareaRef}
            />
          </div>
        </main>
      )}

      {uiState === "ACTIVE_CHAT" && (
        <div data-testid="active-chat" className="flex flex-col flex-1 overflow-hidden">
          {/* Incident header */}
          {activeIncident && (
            <div
              data-testid="incident-header"
              className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-3 text-sm"
            >
              <span data-testid="incident-id" className="font-mono font-semibold text-gray-700">
                {activeIncident.incident_id}
              </span>
              <span className="text-gray-300">·</span>
              <span data-testid="incident-category" className="text-gray-600">
                {activeIncident.category || "General"}
              </span>
              <span className="text-gray-300">·</span>
              <IncidentStatusBadge status={activeIncident.status} />
            </div>
          )}

          {/* Message list */}
          <div
            data-testid="message-list"
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            <div className="mx-auto space-y-4" style={{ maxWidth: "720px" }}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  incidentId={activeIncident?.incident_id ?? ""}
                  isTyping={false}
                  disabled={isInputDisabled}
                  onSend={sendMessage}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div data-testid="typing-indicator" className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "#DC2626" }}
                  >
                    P
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 shadow-sm"
                    style={{
                      background: "#ffffff",
                      borderLeft: "2px solid #DC2626",
                      border: "1px solid #e5e7eb",
                      borderLeftWidth: "2px",
                      borderLeftColor: "#DC2626",
                    }}
                  >
                    <div className="flex gap-1 items-center h-4">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              {/* Final state cards */}
              {isEnded && lastMsg?.role === "assistant" && !isTyping && activeIncident && (
                <div data-testid="final-state-block" className="space-y-3">
                  <StatusSummaryCard
                    incident={{
                      incident_id: activeIncident.incident_id,
                      status: activeIncident.status,
                      category: activeIncident.category,
                      description: activeIncident.description,
                      user_email: activeIncident.user_email,
                      createdAt: activeIncident.createdAt,
                      escalation_details: activeIncident.escalation_details,
                    }}
                    type={activeIncident.status === "Escalated" ? "escalation" : "resolution"}
                  />
                  <FeedbackCard incidentId={activeIncident.incident_id} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-gray-100 bg-white px-4 py-3">
            <div className="mx-auto" style={{ maxWidth: "720px" }}>
              {isEnded ? (
                <p
                  data-testid="chat-ended-notice"
                  className="text-center text-sm text-gray-400 py-2"
                >
                  This conversation has ended.
                </p>
              ) : (
                <ComposerBar
                  value={input}
                  onChange={setInput}
                  onSend={() => sendMessage(input)}
                  onKeyDown={handleInputKeyDown}
                  disabled={isInputDisabled}
                  textareaRef={textareaRef}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  incidentId,
  disabled,
  onSend,
}: {
  msg: ChatMessage;
  incidentId: string;
  isTyping: boolean;
  disabled: boolean;
  onSend: (value: string, messageId?: string) => void;
}) {
  const isUser = msg.role === "user";
  const ctrl = msg.control_metadata;
  const hasActiveControl = ctrl && ctrl.status === "awaiting";

  return (
    <div
      data-testid={`message-${msg.role}`}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
          style={{ background: "#DC2626" }}
        >
          P
        </div>
      )}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        {isUser ? (
          <div
            data-testid="user-bubble"
            className="rounded-2xl px-4 py-2.5 text-sm text-white"
            style={{ background: "#DC2626" }}
          >
            {msg.content}
          </div>
        ) : (
          <div
            data-testid="assistant-card"
            className="rounded-xl px-4 py-3 text-sm shadow-sm"
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
                disabled={disabled || !hasActiveControl}
                onSend={onSend}
                isHistoryView={!hasActiveControl}
              />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5"
          style={{ background: "#f3f4f6" }}
        >
          U
        </div>
      )}
    </div>
  );
}

function ComposerBar({
  value,
  onChange,
  onSend,
  onKeyDown,
  disabled,
  textareaRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div
      data-testid="chat-composer"
      className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 transition-all"
    >
      <textarea
        ref={textareaRef}
        data-testid="chat-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Type your message… (Enter to send)"
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        style={{ maxHeight: "120px" }}
      />
      <button
        data-testid="chat-send-btn"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-40"
        style={{ background: "#DC2626" }}
      >
        Send
      </button>
    </div>
  );
}

function IncidentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    Open: { bg: "#fffbeb", color: "#92400e", border: "#fcd34d" },
    Escalated: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
    Resolved: { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  };
  const s = styles[status] ?? styles.Open;
  return (
    <span
      data-testid="incident-status-badge"
      className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {status}
    </span>
  );
}
