export interface PerfilVelocidad {
  siguiente(distanciaKm: number, dtSeg: number): number;
  reset(): void;
}

export interface OpcionesPerfil {
  semilla: number;
  minKmh: number;
  maxKmh: number;
  // rango de la velocidad base que se sortea para cada tramo entre paradas
  baseMinKmh: number;
  baseMaxKmh: number;
  // desvío del random walk por raíz de minuto simulado
  ruidoKmh: number;
  // fracción por minuto con la que la velocidad vuelve hacia la base del tramo
  reversionPorMin: number;
  aceleracionMaxKmhPorSeg: number;
  zonaFrenadoKm: number;
  velocidadEnParadaKmh: number;
}

export const OPCIONES_PERFIL_DEFAULT: OpcionesPerfil = {
  semilla: 2026,
  minKmh: 40,
  maxKmh: 130,
  baseMinKmh: 80,
  baseMaxKmh: 115,
  ruidoKmh: 8,
  reversionPorMin: 0.3,
  aceleracionMaxKmhPorSeg: 1.5,
  zonaFrenadoKm: 5,
  velocidadEnParadaKmh: 10,
};

// mulberry32: generador chico y reproducible a partir de una semilla
export function crearRng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SpeedProfile implements PerfilVelocidad {
  private readonly opciones: OpcionesPerfil;
  private readonly paradasKm: number[];
  private rng!: () => number;
  private bases!: number[];
  private velocidad!: number;

  constructor(paradasKm: number[], opciones: Partial<OpcionesPerfil> = {}) {
    this.opciones = { ...OPCIONES_PERFIL_DEFAULT, ...opciones };
    this.paradasKm = [...paradasKm].sort((a, b) => a - b);
    this.reset();
  }

  reset(): void {
    const { semilla, baseMinKmh, baseMaxKmh, velocidadEnParadaKmh } = this.opciones;
    this.rng = crearRng(semilla);
    const tramos = Math.max(1, this.paradasKm.length + 1);
    this.bases = Array.from({ length: tramos }, () => baseMinKmh + (baseMaxKmh - baseMinKmh) * this.rng());
    this.velocidad = velocidadEnParadaKmh;
  }

  baseEn(distanciaKm: number): number {
    const tramo = this.paradasKm.filter((p) => p <= distanciaKm).length;
    return this.bases[Math.min(tramo, this.bases.length - 1)];
  }

  // tope por cercanía a una parada: curva de frenado con desaceleración constante (v ∝ √d)
  limiteEn(distanciaKm: number): number {
    const { zonaFrenadoKm, velocidadEnParadaKmh, maxKmh } = this.opciones;
    let limite = Infinity;
    for (const p of this.paradasKm) {
      const d = Math.abs(distanciaKm - p);
      if (d < zonaFrenadoKm) {
        limite = Math.min(limite, velocidadEnParadaKmh + (maxKmh - velocidadEnParadaKmh) * Math.sqrt(d / zonaFrenadoKm));
      }
    }
    return limite;
  }

  siguiente(distanciaKm: number, dtSeg: number): number {
    const o = this.opciones;
    const dtMin = dtSeg / 60;
    const anterior = this.velocidad;

    let v = anterior + o.reversionPorMin * (this.baseEn(distanciaKm) - anterior) * Math.min(dtMin, 1);
    v += o.ruidoKmh * this.gauss() * Math.sqrt(dtMin);
    v = Math.min(Math.max(v, o.minKmh), o.maxKmh);
    v = Math.min(v, anterior + o.aceleracionMaxKmhPorSeg * dtSeg);
    v = Math.min(v, this.limiteEn(distanciaKm));

    this.velocidad = v;
    return v;
  }

  private gauss(): number {
    const u = 1 - this.rng();
    const w = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  }
}
