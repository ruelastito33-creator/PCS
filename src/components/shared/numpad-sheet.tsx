"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
} from "react";

type NumpadMode = "integer" | "decimal";

interface OpenOptions {
  label: string;
  currentValue: string;
  mode: NumpadMode;
  maxLength?: number;
  maxDecimalPlaces?: number;
  onSave: (val: string) => Promise<void>;
}

interface NumpadState {
  isOpen: boolean;
  label: string;
  value: string;
  mode: NumpadMode;
  maxLength: number;
  maxDecimalPlaces: number;
  onSave: ((val: string) => Promise<void>) | null;
}

interface NumpadContextValue {
  state: NumpadState;
  open: (opts: OpenOptions) => void;
  close: () => void;
}

const NumpadContext = createContext<NumpadContextValue | null>(null);

const INITIAL_STATE: NumpadState = {
  isOpen: false,
  label: "",
  value: "0",
  mode: "integer",
  maxLength: 7,
  maxDecimalPlaces: 1,
  onSave: null,
};

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function useNumpad() {
  const ctx = useContext(NumpadContext);
  if (!ctx) {
    throw new Error("useNumpad must be used inside <NumpadProvider>");
  }
  return ctx;
}

export function NumpadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NumpadState>(INITIAL_STATE);

  const open = useCallback((opts: OpenOptions) => {
    setState({
      isOpen: true,
      label: opts.label,
      value: opts.currentValue || "0",
      mode: opts.mode,
      maxLength: opts.maxLength ?? (opts.mode === "decimal" ? 10 : 7),
      maxDecimalPlaces: opts.maxDecimalPlaces ?? 1,
      onSave: opts.onSave,
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, onSave: null }));
  }, []);

  return (
    <NumpadContext.Provider value={{ state, open, close }}>
      {children}
      {state.isOpen ? (
        <NumpadDialog
          key={`${state.label}:${state.value}:${state.mode}`}
          state={state}
          close={close}
        />
      ) : null}
    </NumpadContext.Provider>
  );
}

function NumpadDialog({
  state,
  close,
}: {
  state: NumpadState;
  close: () => void;
}) {
  const [value, setValue] = useState(state.value);
  const [isPending, startTransition] = useTransition();

  function handleKey(key: string) {
    setValue((current) => {
      if (key === "C") return "0";
      if (key === "BACKSPACE") {
        return current.length <= 1 ? "0" : current.slice(0, -1);
      }
      if (key === ".") {
        if (state.mode !== "decimal") return current;
        if (current.includes(".")) return current;
        return `${current}.`;
      }

      const next = current === "0" ? key : current + key;
      if (next.length > state.maxLength) return current;

      if (state.mode === "decimal") {
        const parts = next.split(".");
        if (parts.length === 2 && parts[1].length > state.maxDecimalPlaces) {
          return current;
        }
      }

      return next;
    });
  }

  function handleSave() {
    const onSave = state.onSave;
    if (!onSave) return;
    startTransition(async () => {
      await onSave(value);
      close();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity duration-200 opacity-100"
        onClick={close}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 scale-100 opacity-100"
      >
        <div
          className="w-full max-w-xs rounded-3xl bg-zinc-900 p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-300">{state.label}</h3>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 active:bg-zinc-700"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <div className="mb-5 overflow-hidden rounded-2xl bg-black/50 px-5 py-5 text-right">
            <span className="text-6xl font-black tabular-nums tracking-tight text-white">
              {value}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {NUMPAD_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800 text-xl font-bold text-white transition-all duration-100 active:scale-[0.92] active:bg-zinc-700 select-none"
              >
                {key}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleKey("C")}
              className="flex h-14 items-center justify-center rounded-2xl bg-orange-500/20 text-xl font-bold text-orange-400 transition-all duration-100 active:scale-[0.92] active:bg-orange-500/30 select-none"
            >
              C
            </button>
            <button
              onClick={() => handleKey("0")}
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800 text-xl font-bold text-white transition-all duration-100 active:scale-[0.92] active:bg-zinc-700 select-none"
            >
              0
            </button>
            <button
              onClick={() => handleKey(".")}
              disabled={state.mode !== "decimal"}
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800 text-2xl font-black text-white transition-all duration-100 active:scale-[0.92] active:bg-zinc-700 disabled:opacity-35 select-none"
            >
              .
            </button>
            <button
              onClick={() => handleKey("BACKSPACE")}
              className="flex h-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 transition-all duration-100 active:scale-[0.92] active:bg-red-500/30 select-none"
            >
              <svg
                width="22"
                height="18"
                viewBox="0 0 22 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 1H21V17H7L1 9L7 1Z" />
                <path d="M11 6L17 12" />
                <path d="M17 6L11 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="mt-4 w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            {isPending ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </>
  );
}
