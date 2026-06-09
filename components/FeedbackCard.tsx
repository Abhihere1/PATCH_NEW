"use client";

import { useState } from "react";

interface Props {
  incidentId: string;
  existingFeedback?: { rating?: number; comment?: string };
  onSubmitted?: (rating: number, comment: string) => void;
}

export default function FeedbackCard({ incidentId, existingFeedback, onSubmitted }: Props) {
  const [rating, setRating] = useState(existingFeedback?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingFeedback?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!existingFeedback?.rating);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!rating) { setError("Please select a rating."); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/incidents/${incidentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit feedback.");
      } else {
        setSubmitted(true);
        onSubmitted?.(rating, comment);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="feedback-card" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p data-testid="feedback-prompt" className="text-sm font-semibold text-gray-800 mb-3">
        How was your experience with Patch?
      </p>

      <div data-testid="star-rating" className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            data-testid={`star-${star}`}
            onClick={() => !submitted && setRating(star)}
            onMouseEnter={() => !submitted && setHovered(star)}
            onMouseLeave={() => !submitted && setHovered(0)}
            disabled={submitted}
            className="text-2xl transition-transform disabled:cursor-default"
            style={{
              color: star <= (hovered || rating) ? "#DC2626" : "#d1d5db",
              transform: !submitted && star <= hovered ? "scale(1.2)" : "scale(1)",
            }}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>

      {submitted ? (
        <div data-testid="feedback-submitted" className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Thank you for your feedback!
          {existingFeedback?.comment && (
            <p className="mt-1 text-gray-600 text-xs">&ldquo;{existingFeedback.comment}&rdquo;</p>
          )}
        </div>
      ) : (
        <>
          <textarea
            data-testid="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comments…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
          />
          {error && <p data-testid="feedback-error" className="mt-1 text-xs text-red-500">{error}</p>}
          <div className="flex justify-end mt-3">
            <button
              data-testid="feedback-submit-btn"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#DC2626" }}
            >
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
