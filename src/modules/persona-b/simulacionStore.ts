import { create } from "zustand";
import { OPCIONES_PERFIL_DEFAULT } from "./services/SpeedProfile";
import type { LecturaGps } from "./services/SimulationEngine";
import type { CambioEstado, EstadoUS, TramoEstado } from "./services/StateTracker";

interface SimulacionState {
  lectura: LecturaGps | null;
  preparando: boolean;
  error: string | null;
  escalaTiempo: number;
  intervaloMs: number;
  semilla: number;
  estadoActual: EstadoUS | null;
  tramosEstado: TramoEstado[];
  // el id cambia en cada cruce para que el aviso se vuelva a mostrar
  ultimoCambio: (CambioEstado & { id: number }) | null;
  avisoEstado: string | null;
}

export const ESTADO_RECORRIDO_INICIAL = {
  estadoActual: null,
  tramosEstado: [],
  ultimoCambio: null,
  avisoEstado: null,
} satisfies Partial<SimulacionState>;

export const useSimulacionStore = create<SimulacionState>()(() => ({
  lectura: null,
  preparando: false,
  error: null,
  escalaTiempo: 60,
  intervaloMs: 1000,
  semilla: OPCIONES_PERFIL_DEFAULT.semilla,
  ...ESTADO_RECORRIDO_INICIAL,
}));
