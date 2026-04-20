"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SessionWatchdog } from "../kiosk/session-watchdog";
import type { Role } from "@prisma/client";

const STORAGE_KEY = "pcs-sidebar-collapsed";

interface AppShellProps {
  role: Role;
  userName: string;
  title: string;
  children: React.ReactNode;
}

export function AppShell({ role, userName, title, children }: AppShellProps) {
  // Mobile overlay open
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop collapsed (persisted)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function handleToggle() {
    // On mobile: open/close overlay
    // On desktop: collapse/expand
    if (window.innerWidth < 1024) {
      setMobileOpen((prev) => !prev);
    } else {
      toggleCollapsed();
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-alt">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-in-out lg:static ${
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          // Desktop: show/hide based on collapsed
          collapsed ? "lg:hidden" : "lg:translate-x-0"
        }`}
      >
        <Sidebar role={role} userName={userName} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          onToggleSidebar={handleToggle}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      <SessionWatchdog />
    </div>
  );
}
