import { create } from "zustand";
import type { MetricasAnalisis, TiemposAnalisis } from "./services/AnalysisPipeline";
import { RADIO_BUFFER_DEFAULT_KM } from "./services/BufferService";
import type { ResumenPoblacion } from "./services/PopulationCalculator";
import { OPCIONES_PERFIL_DEFAULT } from "./services/SpeedProfile";
import type { LecturaGps } from "./services/SimulationEngine";
import type { CambioEstado, EstadoUS, TramoEstado } from "./services/StateTracker";

export interface AnalisisVigente {
  km: number;
  radioKm: number;
  poblacion: ResumenPoblacion;
  tiempos: TiemposAnalisis;
}

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
  radioBufferKm: number;
  analisis: AnalisisVigente | null;
  metricasAnalisis: MetricasAnalisis | null;
  avisoAnalisis: string | null;
}

export const ESTADO_RECORRIDO_INICIAL = {
  estadoActual: null,
  tramosEstado: [],
  ultimoCambio: null,
  avisoEstado: null,
  analisis: null,
  metricasAnalisis: null,
  avisoAnalisis: null,
} satisfies Partial<SimulacionState>;

export const useSimulacionStore = create<SimulacionState>()(() => ({
  lectura: null,
  preparando: false,
  error: null,
  escalaTiempo: 60,
  intervaloMs: 1000,
  semilla: OPCIONES_PERFIL_DEFAULT.semilla,
  radioBufferKm: RADIO_BUFFER_DEFAULT_KM,
  ...ESTADO_RECORRIDO_INICIAL,
}));
