import { describe, expect, it } from "vitest";
import {
  crearRecorrido,
  desplazar,
  distanciaKm,
  posicionEn,
  rumboEn,
  rumboGrados,
  subRecorrido,
  ubicarParadas,
  type Coordenada,
} from "../services/Recorrido";
import type { EventoParada } from "../../../contracts/contracts";

// sobre el ecuador un grado de longitud mide ~111.2 km
const ECUADOR: Coordenada[] = [[0, 0], [1, 0], [2, 0]];

const parada = (x: number, y: number): EventoParada => ({ eventId: 1, nombre: "p", tipo: 5, punto: { x, y } });

describe("Recorrido", () => {
  it("calcula distancias geodésicas aproximadas", () => {
    expect(distanciaKm([0, 0], [1, 0])).toBeCloseTo(111.2, 0);
    // dallas → wichita en línea recta ronda los 550 km
    expect(distanciaKm([-96.797, 32.7767], [-97.3375, 37.6872])).toBeGreaterThan(540);
    expect(distanciaKm([-96.797, 32.7767], [-97.3375, 37.6872])).toBeLessThan(560);
  });

  it("acumula la distancia por vértice", () => {
    const r = crearRecorrido(ECUADOR);
    expect(r.acumuladoKm[0]).toBe(0);
    expect(r.acumuladoKm[1]).toBeCloseTo(r.totalKm / 2, 6);
    expect(r.totalKm).toBeCloseTo(222.4, 0);
  });

  it("interpola la posición por distancia y la acota a los extremos", () => {
    const r = crearRecorrido(ECUADOR);
    expect(posicionEn(r, 0)).toEqual([0, 0]);
    expect(posicionEn(r, r.totalKm / 4)[0]).toBeCloseTo(0.5, 6);
    expect(posicionEn(r, (r.totalKm * 3) / 4)[0]).toBeCloseTo(1.5, 6);
    expect(posicionEn(r, -10)).toEqual([0, 0]);
    expect(posicionEn(r, r.totalKm + 10)).toEqual([2, 0]);
  });

  it("rechaza recorridos de menos de dos puntos", () => {
    expect(() => crearRecorrido([[0, 0]])).toThrow();
  });

  it("ubica las paradas en el vértice más cercano y las ordena", () => {
    const r = crearRecorrido(ECUADOR);
    expect(ubicarParadas(r, [parada(2, 0.01), parada(0, 0), parada(1.1, 0)])).toEqual([0, r.acumuladoKm[1], r.totalKm]);
  });

  it("recorta la porción entre dos distancias con extremos interpolados", () => {
    const r = crearRecorrido(ECUADOR);
    const mitad = r.totalKm / 2;
    const tramo = subRecorrido(r, mitad / 2, mitad + mitad / 2);
    expect(tramo).toHaveLength(3);
    expect(tramo[0][0]).toBeCloseTo(0.5, 6);
    expect(tramo[1]).toEqual([1, 0]);
    expect(tramo[2][0]).toBeCloseTo(1.5, 6);
    expect(subRecorrido(r, 10, 20)).toHaveLength(2);
  });

  it("calcula el rumbo en grados desde el norte", () => {
    expect(rumboGrados([0, 0], [0, 1])).toBeCloseTo(0);
    expect(rumboGrados([0, 0], [1, 0])).toBeCloseTo(90);
    expect(rumboGrados([0, 1], [0, 0])).toBeCloseTo(180);
    expect(rumboGrados([0, 0], [-1, 0])).toBeCloseTo(270);
  });

  it("desplazar es consistente con la distancia y el rumbo", () => {
    const origen: Coordenada = [-97.5, 35.5];
    const destino = desplazar(origen, 7, 225);
    expect(distanciaKm(origen, destino)).toBeCloseTo(7, 6);
    expect(rumboGrados(origen, destino)).toBeCloseTo(225, 1);
  });

  it("el rumbo del recorrido sigue la dirección de avance, también al principio y al final", () => {
    const r = crearRecorrido(ECUADOR);
    expect(rumboEn(r, 0)).toBeCloseTo(90);
    expect(rumboEn(r, 150)).toBeCloseTo(90);
    expect(rumboEn(r, r.totalKm)).toBeCloseTo(90);
  });
});
