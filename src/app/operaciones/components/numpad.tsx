"use client";

import { usePosStore } from "../store/pos-store";

interface NumpadProps {
  value: string;
  onNext: () => void;
}

export function Numpad({ value, onNext }: NumpadProps) {
  const { appendDigit, backspace } = usePosStore();

  function handleClear() {
    const { activeField, draft } = usePosStore.getState();
    usePosStore.setState({ draft: { ...draft, [activeField]: "0" } });
  }

  function handleKey(key: string) {
    if (key === "⌫") {
      backspace();
    } else {
      appendDigit(key);
    }
  }

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="rounded-2xl bg-black/40 px-5 py-4 text-right">
        <span className="text-5xl font-black tabular-nums text-white">
          {value || "0"}
        </span>
      </div>

      {/* Keys 1-9 */}
      <div className="grid grid-cols-3 gap-1.5">
        {(["1","2","3","4","5","6","7","8","9"] as const).map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className="flex h-13 items-center justify-center rounded-xl text-lg font-bold bg-zinc-800 text-white active:bg-zinc-700 transition-all active:scale-[0.93] select-none"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Bottom row: C 0 . ⌫ */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={handleClear}
          className="flex h-13 items-center justify-center rounded-xl text-lg font-bold bg-orange-500/20 text-orange-400 active:bg-orange-500/30 transition-all active:scale-[0.93] select-none"
        >
          C
        </button>
        <button
          onClick={() => handleKey("0")}
          className="flex h-13 items-center justify-center rounded-xl text-lg font-bold bg-zinc-800 text-white active:bg-zinc-700 transition-all active:scale-[0.93] select-none"
        >
          0
        </button>
        <button
          onClick={() => handleKey(".")}
          className="flex h-13 items-center justify-center rounded-xl text-xl font-black bg-zinc-800 text-white active:bg-zinc-700 transition-all active:scale-[0.93] select-none"
        >
          .
        </button>
        <button
          onClick={() => backspace()}
          className="flex h-13 items-center justify-center rounded-xl bg-red-500/20 text-red-400 active:bg-red-500/30 transition-all active:scale-[0.93] select-none"
        >
          <svg width="20" height="16" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1H21V17H7L1 9L7 1Z" />
            <path d="M11 6L17 12" />
            <path d="M17 6L11 12" />
          </svg>
        </button>
      </div>

      {/* Next field button */}
      <button
        onClick={onNext}
        className="w-full rounded-xl bg-orange-500 py-3 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98]"
      >
        Siguiente campo →
      </button>
    </div>
  );
}
