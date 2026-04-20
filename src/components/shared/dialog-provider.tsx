"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info } from "lucide-react";

export type AlertVariant = "error" | "info" | "success";

export type AlertOptions = {
  title?: string;
  message: string;
  variant?: AlertVariant;
  okLabel?: string;
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = acción destructiva (rojo), primary = acento naranja */
  tone?: "danger" | "primary";
};

type DialogContextValue = {
  alert: (options: AlertOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogs(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialogs debe usarse dentro de DialogProvider");
  }
  return ctx;
}

type AlertState = AlertOptions & {
  kind: "alert";
  resolve: () => void;
};

type ConfirmState = ConfirmOptions & {
  kind: "confirm";
  resolve: (value: boolean) => void;
};

type OpenState = AlertState | ConfirmState | null;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<OpenState>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const alertFn = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setOpen({
        kind: "alert",
        title: options.title,
        message: options.message,
        variant: options.variant ?? "info",
        okLabel: options.okLabel ?? "Entendido",
        resolve: () => {
          resolve();
          setOpen(null);
        },
      });
    });
  }, []);

  const confirmFn = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOpen({
        kind: "confirm",
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Aceptar",
        cancelLabel: options.cancelLabel ?? "Cancelar",
        tone: options.tone ?? "primary",
        resolve: (value) => {
          resolve(value);
          setOpen(null);
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!open || open.kind !== "confirm") return;
    const dialog = open;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dialog.resolve(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const overlay =
    open ? (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && open.kind === "confirm") {
            open.resolve(false);
          }
        }}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={open.title ? titleId : undefined}
          aria-describedby={descId}
          className="max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {open.kind === "alert" ? (
            <AlertBody
              titleId={titleId}
              descId={descId}
              title={open.title}
              message={open.message}
              variant={open.variant ?? "info"}
              okLabel={open.okLabel ?? "Entendido"}
              onClose={() => open.resolve()}
            />
          ) : (
            <ConfirmBody
              titleId={titleId}
              descId={descId}
              title={open.title}
              message={open.message}
              confirmLabel={open.confirmLabel ?? "Aceptar"}
              cancelLabel={open.cancelLabel ?? "Cancelar"}
              tone={open.tone ?? "primary"}
              onConfirm={() => open.resolve(true)}
              onCancel={() => open.resolve(false)}
            />
          )}
        </div>
      </div>
    ) : null;

  return (
    <DialogContext.Provider value={{ alert: alertFn, confirm: confirmFn }}>
      {children}
      {typeof document !== "undefined" && overlay
        ? createPortal(overlay, document.body)
        : null}
    </DialogContext.Provider>
  );
}

function AlertBody({
  titleId,
  descId,
  title,
  message,
  variant,
  okLabel,
  onClose,
}: {
  titleId: string;
  descId: string;
  title?: string;
  message: string;
  variant: AlertVariant;
  okLabel: string;
  onClose: () => void;
}) {
  const isError = variant === "error";
  const Icon = isError ? AlertTriangle : Info;
  const iconClass = isError
    ? "text-red-500 dark:text-red-400"
    : variant === "success"
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-orange-500 dark:text-orange-400";

  return (
    <>
      <div className="flex gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted ${iconClass}`}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          {title ? (
            <h2
              id={titleId}
              className="text-lg font-semibold leading-snug text-text-primary"
            >
              {title}
            </h2>
          ) : (
            <h2 id={titleId} className="sr-only">
              Aviso
            </h2>
          )}
          <p
            id={descId}
            className={`text-sm leading-relaxed text-text-secondary ${title ? "mt-2" : ""}`}
          >
            {message}
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:focus-visible:ring-offset-surface"
        >
          {okLabel}
        </button>
      </div>
    </>
  );
}

function ConfirmBody({
  titleId,
  descId,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone,
  onConfirm,
  onCancel,
}: {
  titleId: string;
  descId: string;
  title?: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const danger = tone === "danger";
  const confirmClass = danger
    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white"
    : "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-400 text-white";

  return (
    <>
      <div className="flex gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted ${
            danger
              ? "text-red-500 dark:text-red-400"
              : "text-orange-500 dark:text-orange-400"
          }`}
        >
          {danger ? (
            <AlertTriangle className="h-6 w-6" aria-hidden />
          ) : (
            <Info className="h-6 w-6" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          {title ? (
            <h2
              id={titleId}
              className="text-lg font-semibold leading-snug text-text-primary"
            >
              {title}
            </h2>
          ) : (
            <h2 id={titleId} className="sr-only">
              Confirmar acción
            </h2>
          )}
          <p
            id={descId}
            className={`text-sm leading-relaxed text-text-secondary ${title ? "mt-2" : ""}`}
          >
            {message}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          autoFocus
          className="inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-xl border border-border-strong bg-surface-alt px-5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-xl px-5 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </>
  );
}
