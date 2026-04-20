import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PosMode = "tabla" | "pos";
export type PosField = "tacos" | "bolsas" | "aguas" | "vendedora" | "chofer" | "hora";

export const POS_FIELDS: PosField[] = ["tacos", "bolsas", "aguas", "vendedora", "chofer", "hora"];
export const POS_FIELD_LABELS: Record<PosField, string> = {
  tacos: "Tacos",
  bolsas: "Tomate (bolsas)",
  aguas: "Aguas",
  vendedora: "Vendedora",
  chofer: "Chofer",
  hora: "Hora",
};
export const POS_NUMERIC_FIELDS = new Set<PosField>(["tacos", "bolsas", "aguas"]);

interface PosStore {
  mode: PosMode;
  activeProduccionId: string | null;
  activePuestoNombre: string;
  activeField: PosField;
  draft: Record<string, string>; // campo → string value while editing

  setMode: (m: PosMode) => void;
  openCard: (produccionId: string, puestoNombre: string, initialDraft: Record<string, string>) => void;
  closeCard: () => void;
  setField: (f: PosField) => void;
  nextField: () => void;
  appendDigit: (d: string) => void;
  backspace: () => void;
  setTextValue: (v: string) => void;
}

export const usePosStore = create<PosStore>()(
  persist(
    (set, get) => ({
      mode: "tabla",
      activeProduccionId: null,
      activePuestoNombre: "",
      activeField: "tacos",
      draft: {},

      setMode: (m) => set({ mode: m }),

      openCard: (produccionId, puestoNombre, initialDraft) =>
        set({
          activeProduccionId: produccionId,
          activePuestoNombre: puestoNombre,
          activeField: "tacos",
          draft: initialDraft,
        }),

      closeCard: () =>
        set({ activeProduccionId: null, activePuestoNombre: "", draft: {} }),

      setField: (f) => set({ activeField: f }),

      nextField: () => {
        const { activeField } = get();
        const idx = POS_FIELDS.indexOf(activeField);
        if (idx < POS_FIELDS.length - 1) {
          set({ activeField: POS_FIELDS[idx + 1] });
        }
      },

      appendDigit: (d) => {
        const { activeField, draft } = get();
        const current = draft[activeField] ?? "";
        let next: string;
        if (d === ".") {
          if (current.includes(".")) return;
          next = current + ".";
        } else {
          next = current === "0" ? d : current + d;
        }
        if (activeField === "bolsas") {
          const parts = next.split(".");
          if (parts.length === 2 && parts[1].length > 1) return;
        }
        const maxLen = activeField === "bolsas" ? 10 : 7;
        if (next.length > maxLen) return;
        set({ draft: { ...draft, [activeField]: next } });
      },

      backspace: () => {
        const { activeField, draft } = get();
        const current = draft[activeField] ?? "";
        const next = current.length <= 1 ? "0" : current.slice(0, -1);
        set({ draft: { ...draft, [activeField]: next } });
      },

      setTextValue: (v) => {
        const { activeField, draft } = get();
        set({ draft: { ...draft, [activeField]: v } });
      },
    }),
    {
      name: "pcs-pos-mode",
      partialize: (state) => ({ mode: state.mode }), // only persist mode preference
    }
  )
);
