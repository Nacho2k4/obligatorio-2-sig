import type { Coordenada } from "./Recorrido";

export interface EstadoUS {
  nombre: string;
  abreviatura: string;
}

export type ConsultarEstado = (punto: Coordenada, signal: AbortSignal) => Promise<EstadoUS | null>;

export interface TramoEstado {
  estado: EstadoUS;
  indiceColor: number;
  desdeKm: number;
  hastaKm: number;
}

export interface CambioEstado {
  de: EstadoUS;
  a: EstadoUS;
  km: number;
  posicion: Coordenada;
  indiceColor: number;
}

export interface OpcionesTracker {
  // la bisección para ubicar el cruce corta cuando el intervalo baja de esta distancia
  precisionKm: number;
  maxIteraciones: number;
  colores: number;
}

interface Oyentes {
  tramos?: (tramos: TramoEstado[]) => void;
  cambio?: (cambio: CambioEstado) => void;
  error?: (error: unknown) => void;
}

const mismoEstado = (a: EstadoUS, b: EstadoUS) => a.abreviatura === b.abreviatura;

// sabe en qué estado está el móvil consultando un punto; nunca hay más de una consulta en curso
export class StateTracker {
  private readonly posicionEn: (km: number) => Coordenada;
  private readonly consultar: ConsultarEstado;
  private readonly opciones: OpcionesTracker;
  private readonly oyentes: Oyentes;
  private tramos: TramoEstado[] = [];
  private controller = new AbortController();
  private ocupado = false;
  private saltados = 0;
  private pendienteKm: number | null = null;

  constructor(
    posicionEn: (km: number) => Coordenada,
    consultar: ConsultarEstado,
    oyentes: Oyentes = {},
    opciones: Partial<OpcionesTracker> = {},
  ) {
    this.posicionEn = posicionEn;
    this.consultar = consultar;
    this.oyentes = oyentes;
    this.opciones = { precisionKm: 0.25, maxIteraciones: 8, colores: 3, ...opciones };
  }

  get estadoActual(): EstadoUS | null {
    return this.tramos[this.tramos.length - 1]?.estado ?? null;
  }

  get consultasSalteadas(): number {
    return this.saltados;
  }

  get enCurso(): boolean {
    return this.ocupado;
  }

  // con una consulta en vuelo la posición se saltea, pero se guarda la última para procesarla al terminar
  actualizar(km: number): Promise<void> {
    if (this.ocupado) {
      this.saltados++;
      this.pendienteKm = km;
      return Promise.resolve();
    }
    this.ocupado = true;
    const signal = this.controller.signal;
    return this.procesar(km, signal)
      .catch((error) => {
        if (!signal.aborted) this.oyentes.error?.(error);
      })
      .finally(() => {
        if (signal.aborted) return;
        this.ocupado = false;
        if (this.pendienteKm !== null) {
          const siguiente = this.pendienteKm;
          this.pendienteKm = null;
          void this.actualizar(siguiente);
        }
      });
  }

  reset(): void {
    this.controller.abort();
    this.controller = new AbortController();
    this.tramos = [];
    this.ocupado = false;
    this.saltados = 0;
    this.pendienteKm = null;
  }

  private async procesar(km: number, signal: AbortSignal): Promise<void> {
    const estado = await this.consultar(this.posicionEn(km), signal);
    if (signal.aborted || !estado) return;

    const ultimo = this.tramos[this.tramos.length - 1];
    if (!ultimo) {
      this.tramos.push({ estado, indiceColor: 0, desdeKm: 0, hastaKm: km });
    } else if (mismoEstado(ultimo.estado, estado)) {
      ultimo.hastaKm = Math.max(ultimo.hastaKm, km);
    } else {
      const cruceKm = await this.ubicarCruce(ultimo.estado, ultimo.hastaKm, km, signal);
      if (signal.aborted) return;

      const indiceColor = (ultimo.indiceColor + 1) % this.opciones.colores;
      ultimo.hastaKm = cruceKm;
      this.tramos.push({ estado, indiceColor, desdeKm: cruceKm, hastaKm: km });
      this.oyentes.cambio?.({ de: ultimo.estado, a: estado, km: cruceKm, posicion: this.posicionEn(cruceKm), indiceColor });
    }
    this.oyentes.tramos?.(this.tramos.map((t) => ({ ...t })));
  }

  // bisección entre el último punto conocido del estado anterior y el primero del nuevo
  private async ubicarCruce(anterior: EstadoUS, desdeKm: number, hastaKm: number, signal: AbortSignal): Promise<number> {
    let lo = desdeKm;
    let hi = hastaKm;
    for (let i = 0; i < this.opciones.maxIteraciones && hi - lo > this.opciones.precisionKm; i++) {
      const medio = (lo + hi) / 2;
      const estado = await this.consultar(this.posicionEn(medio), signal);
      if (signal.aborted) break;
      if (estado && mismoEstado(estado, anterior)) lo = medio;
      else hi = medio;
    }
    return (lo + hi) / 2;
  }
}
