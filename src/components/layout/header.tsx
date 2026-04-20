"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, PanelLeftOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface HeaderProps {
  title: string;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ title, onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2.5 text-text-muted hover:bg-hover-surface-strong transition-colors"
            title={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        )}
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-hover-surface-strong"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
