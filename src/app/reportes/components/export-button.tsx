"use client";

import { Download } from "lucide-react";

export function ExportButton() {
  return (
    <a
      href="/api/export/reportes"
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover-surface hover:text-text-primary"
    >
      <Download className="h-3.5 w-3.5" />
      Exportar Excel
    </a>
  );
}
