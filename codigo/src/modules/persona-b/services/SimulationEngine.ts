import { posicionEn, type Recorrido } from "./Recorrido";
import type { PerfilVelocidad } from "./SpeedProfile";

export type EstadoMotor = "detenido" | "reproduciendo" | "pausado" | "finalizado";

export interface LecturaGps {
  posicion: { x: number; y: number };
  velocidadKmh: number;
  distanciaKm: number;
  distanciaTotalKm: number;
  progreso: number; // 0..1
  tiempoSimuladoSeg: number;
  tick: number;
  estado: EstadoMotor;
}

export interface OpcionesMotor {
  intervaloMs: number;
  // segundos simulados por segundo real
  escalaTiempo: number;
}

export interface Temporizador {
  setInterval(cb: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
}

const temporizadorReal: Temporizador = {
  setInterval: (cb, ms) => globalThis.setInterval(cb, ms),
  clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>),
};

type Oyente = (lectura: LecturaGps) => void;

// lógica pura: no conoce el mapa ni react, solo emite lecturas a quien se suscriba
export class SimulationEngine {
  private readonly oyentes = new Set<Oyente>();
  private readonly recorrido: Recorrido;
  private readonly perfil: PerfilVelocidad;
  private readonly temporizador: Temporizador;
  private opciones: OpcionesMotor;
  private timer: unknown = null;
  private estado: EstadoMotor = "detenido";
  private distanciaKm = 0;
  private velocidadKmh = 0;
  private tiempoSimuladoSeg = 0;
  private ticks = 0;

  constructor(
    recorrido: Recorrido,
    perfil: PerfilVelocidad,
    opciones: Partial<OpcionesMotor> = {},
    temporizador: Temporizador = temporizadorReal,
  ) {
    this.recorrido = recorrido;
    this.perfil = perfil;
    this.temporizador = temporizador;
    this.opciones = { intervaloMs: 1000, escalaTiempo: 60, ...opciones };
  }

  get lectura(): LecturaGps {
    const [x, y] = posicionEn(this.recorrido, this.distanciaKm);
    const total = this.recorrido.totalKm;
    return {
      posicion: { x, y },
      velocidadKmh: this.velocidadKmh,
      distanciaKm: this.distanciaKm,
      distanciaTotalKm: total,
      progreso: total > 0 ? this.distanciaKm / total : 1,
      tiempoSimuladoSeg: this.tiempoSimuladoSeg,
      tick: this.ticks,
      estado: this.estado,
    };
  }

  suscribir(oyente: Oyente): () => void {
    this.oyentes.add(oyente);
    oyente(this.lectura);
    return () => this.oyentes.delete(oyente);
  }

  play(): void {
    if (this.estado === "reproduciendo" || this.estado === "finalizado") return;
    this.estado = "reproduciendo";
    this.arrancarTimer();
    this.emitir();
  }

  pausa(): void {
    if (this.estado !== "reproduciendo") return;
    this.estado = "pausado";
    this.pararTimer();
    this.emitir();
  }

  reset(): void {
    this.pararTimer();
    this.perfil.reset();
    this.estado = "detenido";
    this.distanciaKm = 0;
    this.velocidadKmh = 0;
    this.tiempoSimuladoSeg = 0;
    this.ticks = 0;
    this.emitir();
  }

  setEscalaTiempo(escala: number): void {
    this.opciones.escalaTiempo = escala;
  }

  setIntervaloMs(ms: number): void {
    this.opciones.intervaloMs = ms;
    if (this.estado === "reproduciendo") this.arrancarTimer();
  }

  tick(): void {
    if (this.estado === "finalizado") return;
    const dtSeg = (this.opciones.intervaloMs / 1000) * this.opciones.escalaTiempo;

    this.velocidadKmh = this.perfil.siguiente(this.distanciaKm, dtSeg);
    this.distanciaKm = Math.min(this.recorrido.totalKm, this.distanciaKm + (this.velocidadKmh * dtSeg) / 3600);
    this.tiempoSimuladoSeg += dtSeg;
    this.ticks++;

    if (this.distanciaKm >= this.recorrido.totalKm) {
      this.estado = "finalizado";
      this.velocidadKmh = 0;
      this.pararTimer();
    }
    this.emitir();
  }

  destruir(): void {
    this.pararTimer();
    this.oyentes.clear();
  }

  private arrancarTimer(): void {
    this.pararTimer();
    this.timer = this.temporizador.setInterval(() => this.tick(), this.opciones.intervaloMs);
  }

  private pararTimer(): void {
    if (this.timer !== null) this.temporizador.clearInterval(this.timer);
    this.timer = null;
  }

  private emitir(): void {
    const lectura = this.lectura;
    this.oyentes.forEach((o) => o(lectura));
  }
}
