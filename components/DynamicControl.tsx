"use client";

import { useState } from "react";
import { ControlMetadata } from "@/lib/models/Incident";

interface Props {
  control: ControlMetadata;
  messageId: string;
  incidentId: string;
  disabled?: boolean;
  onSend: (value: string, messageId: string) => void;
  isHistoryView?: boolean;
}

export default function DynamicControl({
  control,
  messageId,
  incidentId,
  disabled = false,
  onSend,
  isHistoryView = false,
}: Props) {
  const [selected, setSelected] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<number, Record<string, string>>>({});
  const [formErrors, setFormErrors] = useState<Record<number, Record<string, string>>>({});
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const isCompleted = control.status === "completed";
  const isInteractive = !disabled && !isCompleted && !isHistoryView;

  function handleOptionClick(option: string) {
    if (!isInteractive) return;
    setHidden(true);
    onSend(option, messageId);
  }

  function handleSelectConfirm() {
    if (!isInteractive || !selected) return;
    setHidden(true);
    onSend(selected, messageId);
  }

  function handleFormChange(cardIdx: number, fieldName: string, value: string) {
    setFormValues((prev) => ({
      ...prev,
      [cardIdx]: { ...prev[cardIdx], [fieldName]: value },
    }));
    setFormErrors((prev) => ({
      ...prev,
      [cardIdx]: { ...prev[cardIdx], [fieldName]: "" },
    }));
  }

  function handleFormSubmit() {
    if (!isInteractive) return;
    const totalCards = control.total_cards ?? 1;
    const fields = control.fields ?? [];
    const newErrors: Record<number, Record<string, string>> = {};
    let hasError = false;

    for (let i = 0; i < totalCards; i++) {
      for (const field of fields) {
        if (field.required && !formValues[i]?.[field.name]?.trim()) {
          if (!newErrors[i]) newErrors[i] = {};
          newErrors[i][field.name] = "This field is required.";
          hasError = true;
        }
      }
    }

    if (hasError) {
      setFormErrors(newErrors);
      return;
    }

    // Format form values into a message
    const lines: string[] = [];
    for (let i = 0; i < totalCards; i++) {
      if (totalCards > 1) lines.push(`Device ${i + 1}:`);
      for (const field of fields) {
        lines.push(`  ${field.label}: ${formValues[i]?.[field.name] ?? ""}`);
      }
    }

    setHidden(true);
    onSend(lines.join("\n"), messageId);

    // Persist partial card values
    fetch(`/api/incidents/${incidentId}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId, chosen_value: lines.join("\n") }),
    }).catch(console.error);
  }

  if (control.control_type === "probable_options" && control.options) {
    return (
      <div data-testid="probable-options" className="mt-3 flex flex-wrap gap-2">
        {control.options.map((option) => (
          <button
            key={option}
            data-testid={`option-btn-${option}`}
            onClick={() => handleOptionClick(option)}
            disabled={!isInteractive}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: isCompleted && option === control.chosen_value ? "#991B1B" : "#DC2626",
              borderRadius: "8px",
            }}
          >
            {option}
            {isHistoryView && option === control.chosen_value && " ✓"}
          </button>
        ))}
        {isCompleted && control.chosen_value && !isHistoryView && (
          <span className="text-xs text-gray-400 self-center ml-2">
            Answered: {control.chosen_value}
          </span>
        )}
      </div>
    );
  }

  if (control.control_type === "single_select" && control.options) {
    return (
      <div data-testid="single-select" className="mt-3 space-y-2">
        <select
          data-testid="single-select-dropdown"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={!isInteractive}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
        >
          <option value="">Select an option…</option>
          {control.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {isInteractive && (
          <button
            data-testid="single-select-confirm-btn"
            onClick={handleSelectConfirm}
            disabled={!selected}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#DC2626" }}
          >
            Confirm
          </button>
        )}
      </div>
    );
  }

  if (control.control_type === "structured_form" && control.fields) {
    const totalCards = control.total_cards ?? 1;
    const savedValues = (control.card_values as Record<number, Record<string, string>>) ?? {};

    return (
      <div data-testid="structured-form" className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Quick Entry — {totalCards} device{totalCards !== 1 ? "s" : ""}
        </p>
        <div className={`grid gap-3 ${totalCards <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
          {Array.from({ length: totalCards }).map((_, cardIdx) => {
            const cardSaved = savedValues[cardIdx] ?? {};
            const cardVals = formValues[cardIdx] ?? cardSaved;
            const cardErrs = formErrors[cardIdx] ?? {};
            const isCardComplete =
              isCompleted ||
              (control.fields ?? []).every(
                (f) => !f.required || (cardVals[f.name] ?? "").trim()
              );

            return (
              <div
                key={cardIdx}
                data-testid={`form-card-${cardIdx}`}
                className="rounded-xl border p-4 space-y-3 transition-colors"
                style={{
                  borderColor: isCardComplete ? "#86efac" : "#e5e7eb",
                  background: isCardComplete ? "#f0fdf4" : "#ffffff",
                }}
              >
                <p
                  data-testid={`form-card-title-${cardIdx}`}
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: isCardComplete ? "#16a34a" : "#6b7280" }}
                >
                  Device {cardIdx + 1}
                </p>
                {(control.fields ?? []).map((field) => (
                  <div key={field.name}>
                    <label
                      data-testid={`form-label-${cardIdx}-${field.name}`}
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      data-testid={`form-input-${cardIdx}-${field.name}`}
                      type="text"
                      value={cardVals[field.name] ?? ""}
                      onChange={(e) => handleFormChange(cardIdx, field.name, e.target.value)}
                      disabled={!isInteractive}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:border-red-600 focus:outline-none disabled:bg-gray-50"
                      style={{ borderColor: cardErrs[field.name] ? "#ef4444" : "#e5e7eb" }}
                    />
                    {cardErrs[field.name] && (
                      <p
                        data-testid={`form-error-${cardIdx}-${field.name}`}
                        className="mt-1 text-xs text-red-500"
                      >
                        {cardErrs[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {isInteractive && (
          <div className="flex justify-end">
            <button
              data-testid="form-submit-btn"
              onClick={handleFormSubmit}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
              style={{ background: "#DC2626" }}
            >
              Submit
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
