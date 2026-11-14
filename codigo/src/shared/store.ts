import { create } from "zustand";
import type { RutaGuardada } from "../contracts/contracts";

// persona a llama a setRutaActiva desde su panel y la simulación reacciona a rutaActiva
interface AppState {
  rutaActiva: RutaGuardada | null;
  setRutaActiva: (ruta: RutaGuardada | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  rutaActiva: null,
  setRutaActiva: (ruta) => set({ rutaActiva: ruta }),
}));
