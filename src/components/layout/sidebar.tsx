"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ChefHat,
  Truck,
  Droplets,
  Snowflake,
  Package,
  Lock,
  BarChart3,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/constants";
import type { Role } from "@prisma/client";

const ICONS: Record<string, React.ElementType> = {
  "/operaciones": ClipboardList,
  "/cocina": ChefHat,
  "/chofer": Truck,
  "/aguas": Droplets,
  "/hieleras": Snowflake,
  "/insumos": Package,
  "/cierre": Lock,
  "/reportes": BarChart3,
  "/bitacora": ScrollText,
  "/settings": Settings,
};

interface SidebarProps {
  role: Role;
  userName: string;
  onClose?: () => void;
}

export function Sidebar({ role, userName, onClose }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h1 className="text-sm font-bold uppercase tracking-wider text-text-primary">
          Los Tuxpeños
        </h1>
        <p className="text-xs text-text-muted">Por Tradición</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.href] ?? ClipboardList;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                  : "text-text-secondary hover:bg-hover-surface hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-border p-4">
        <p className="truncate text-sm font-medium text-text-primary">
          {userName}
        </p>
        <p className="text-xs text-text-muted">{role.replace("_", " ")}</p>
      </div>
    </aside>
  );
}
