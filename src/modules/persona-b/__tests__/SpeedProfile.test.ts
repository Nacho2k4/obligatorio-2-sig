import { describe, expect, it } from "vitest";
import { OPCIONES_PERFIL_DEFAULT, SpeedProfile } from "../services/SpeedProfile";

const recorrer = (perfil: SpeedProfile, desdeKm: number, hastaKm: number, dtSeg = 60) => {
  const velocidades: number[] = [];
  for (let d = desdeKm; d < hastaKm; ) {
    const v = perfil.siguiente(d, dtSeg);
    velocidades.push(v);
    d += (v * dtSeg) / 3600;
  }
  return velocidades;
};

describe("SpeedProfile", () => {
  it("es reproducible con la misma semilla y cambia con otra", () => {
    const a = recorrer(new SpeedProfile([0, 300], { semilla: 7 }), 0, 300);
    const b = recorrer(new SpeedProfile([0, 300], { semilla: 7 }), 0, 300);
    const c = recorrer(new SpeedProfile([0, 300], { semilla: 8 }), 0, 300);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("reset vuelve a generar la misma secuencia", () => {
    const perfil = new SpeedProfile([0, 300], { semilla: 3 });
    const primera = recorrer(perfil, 0, 300);
    perfil.reset();
    expect(recorrer(perfil, 0, 300)).toEqual(primera);
  });

  it("lejos de las paradas se mantiene entre el mínimo y el máximo y varía", () => {
    const perfil = new SpeedProfile([0, 1000], { semilla: 11 });
    const vs = recorrer(perfil, 0, 1000).slice(20, -20);
    for (const v of vs) {
      expect(v).toBeGreaterThanOrEqual(OPCIONES_PERFIL_DEFAULT.minKmh);
      expect(v).toBeLessThanOrEqual(OPCIONES_PERFIL_DEFAULT.maxKmh);
    }
    expect(new Set(vs.map(Math.round)).size).toBeGreaterThan(5);
  });

  it("frena al acercarse a una parada", () => {
    const perfil = new SpeedProfile([100], { semilla: 5 });
    const { zonaFrenadoKm, velocidadEnParadaKmh } = OPCIONES_PERFIL_DEFAULT;
    expect(perfil.limiteEn(100)).toBe(velocidadEnParadaKmh);
    expect(perfil.limiteEn(100 - zonaFrenadoKm / 4)).toBeLessThan(perfil.limiteEn(100 - zonaFrenadoKm / 2));
    expect(perfil.limiteEn(100 - zonaFrenadoKm)).toBe(Infinity);
    expect(perfil.siguiente(100, 10)).toBeLessThanOrEqual(velocidadEnParadaKmh);
  });

  it("acelera de a poco al salir de una parada", () => {
    const perfil = new SpeedProfile([0], { semilla: 5 });
    const dt = 10;
    const vs = recorrer(perfil, 0, 20, dt);
    expect(vs[0]).toBeLessThan(40);
    for (let i = 1; i < vs.length; i++) {
      expect(vs[i] - vs[i - 1]).toBeLessThanOrEqual(OPCIONES_PERFIL_DEFAULT.aceleracionMaxKmhPorSeg * dt + 1e-9);
    }
    expect(vs[vs.length - 1]).toBeGreaterThan(60);
  });

  it("cada tramo entre paradas tiene su propia velocidad base dentro del rango", () => {
    const perfil = new SpeedProfile([0, 100, 200], { semilla: 9 });
    const bases = [50, 150, 250].map((d) => perfil.baseEn(d));
    for (const b of bases) {
      expect(b).toBeGreaterThanOrEqual(OPCIONES_PERFIL_DEFAULT.baseMinKmh);
      expect(b).toBeLessThanOrEqual(OPCIONES_PERFIL_DEFAULT.baseMaxKmh);
    }
    expect(new Set(bases).size).toBe(3);
  });
});
