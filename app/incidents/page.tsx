"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { formatDate, formatRelativeTime } from "@/lib/utils";

type IncidentStatus = "Open" | "Escalated" | "Resolved";
type FilterTab = "all" | IncidentStatus;

interface IncidentRow {
  incident_id: string;
  status: IncidentStatus;
  category: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const styles: Record<IncidentStatus, string> = {
    Open: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Escalated: "bg-red-50 text-red-700 border-red-200",
    Resolved: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      data-testid={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "Open" },
  { label: "Escalated", value: "Escalated" },
  { label: "Resolved", value: "Resolved" },
];

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) router.push("/login"); })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const url = filter === "all" ? "/api/incidents" : `/api/incidents?status=${filter}`;
    Promise.resolve()
      .then(() => { if (!cancelled) setLoading(true); })
      .then(() => fetch(url))
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setIncidents(d.incidents ?? []); })
      .catch(() => { if (!cancelled) setIncidents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div data-testid="incidents-page" className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto px-4 py-8" style={{ maxWidth: "900px" }}>
        <div className="mb-6">
          <h1 data-testid="incidents-heading" className="text-2xl font-bold text-gray-900">
            My Incidents
          </h1>
          <p className="text-sm text-gray-500 mt-1">All your IT support requests</p>
        </div>

        {/* Filter Tabs */}
        <div data-testid="filter-tabs" className="flex gap-1 border-b border-gray-200 mb-6">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              data-testid={`filter-tab-${tab.value}`}
              onClick={() => setFilter(tab.value)}
              className="px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: filter === tab.value ? "#DC2626" : "#6b7280",
                borderBottom: filter === tab.value ? "2px solid #DC2626" : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: "2px",
                borderBottomColor: filter === tab.value ? "#DC2626" : "transparent",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm">Loading…</div>
        ) : incidents.length === 0 ? (
          <div data-testid="empty-state" className="text-center text-gray-400 py-16">
            <p className="text-base font-medium">No incidents yet.</p>
            <p className="text-sm mt-1">Start a new chat to create your first incident.</p>
          </div>
        ) : (
          <div data-testid="incidents-table" className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Age
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incidents.map((inc) => (
                  <tr key={inc.incident_id} data-testid={`incident-row-${inc.incident_id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                      {inc.incident_id}
                    </td>
                    <td data-testid="incident-category" className="px-4 py-3 text-gray-700">
                      {inc.category || "General"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td data-testid="incident-created" className="px-4 py-3 text-gray-500">
                      {formatDate(inc.createdAt)}
                    </td>
                    <td data-testid="incident-age" className="px-4 py-3 text-gray-400">
                      {formatRelativeTime(inc.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/incidents/${inc.incident_id}`}
                        data-testid={`view-incident-${inc.incident_id}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                        style={{ background: "#DC2626" }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
