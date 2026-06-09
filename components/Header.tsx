"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface Props {
  onNewChat?: () => void;
}

export default function Header({ onNewChat }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [incidentCount, setIncidentCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/incidents/count")
      .then((r) => r.json())
      .then((d) => setIncidentCount(d.count ?? null))
      .catch(() => null);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleNewChat() {
    if (onNewChat) {
      onNewChat();
    }
    if (pathname !== "/") {
      router.push("/");
    }
  }

  const isIncidentsActive = pathname?.startsWith("/incidents");
  const isHomeActive = pathname === "/";

  return (
    <header
      data-testid="main-header"
      className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-6"
      style={{ height: "60px" }}
    >
      {/* Logo */}
      <Link
        href="/"
        data-testid="header-logo"
        className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity"
        onClick={() => handleNewChat()}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "#DC2626" }}
        >
          P
        </div>
        <span className="font-bold text-gray-900 text-base">Patch</span>
      </Link>

      {/* Nav */}
      <nav data-testid="main-nav" className="flex items-center gap-1">
        <Link
          href="/incidents"
          data-testid="nav-incidents-link"
          className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors no-underline"
          style={{
            color: isIncidentsActive ? "#DC2626" : "#374151",
            borderBottom: isIncidentsActive ? "2px solid #DC2626" : "2px solid transparent",
          }}
        >
          Incidents
          {incidentCount !== null && incidentCount > 0 && (
            <span
              data-testid="incidents-badge"
              className="rounded-full px-1.5 py-0.5 text-xs font-bold text-white"
              style={{ background: "#DC2626", fontSize: "11px" }}
            >
              {incidentCount}
            </span>
          )}
        </Link>

        <button
          data-testid="nav-new-chat-btn"
          onClick={handleNewChat}
          className="flex items-center px-4 py-3 text-sm font-medium transition-colors"
          style={{
            color: isHomeActive ? "#DC2626" : "#374151",
            borderBottom: isHomeActive ? "2px solid #DC2626" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            borderBottomStyle: "solid",
            borderBottomWidth: "2px",
            borderBottomColor: isHomeActive ? "#DC2626" : "transparent",
          }}
        >
          New Chat
        </button>

        <button
          data-testid="nav-logout-btn"
          onClick={handleLogout}
          className="flex items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
