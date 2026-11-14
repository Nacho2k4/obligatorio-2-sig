import Polygon from "@arcgis/core/geometry/Polygon.js";
import { describe, expect, it, vi } from "vitest";
import type { Condado } from "../services/CountyQueryService";
import { PopulationCalculator, ponderarPoblacion, type AreasCondado } from "../services/PopulationCalculator";
import { crearPopulationCalculator } from "../services/poblacionGeometryServer";

const condado = (nombre: string, poblacion: number, areaCondadoKm2: number, areaInterseccionKm2: number): AreasCondado => ({
  objectId: nombre.length,
  nombre,
  estado: "Texas",
  poblacion,
  areaCondadoKm2,
  areaInterseccionKm2,
});

const cuadrado = (x: number, y: number, lado: number) =>
  new Polygon({
    rings: [[[x, y], [x, y + lado], [x + lado, y + lado], [x + lado, y], [x, y]]],
    spatialReference: { wkid: 4326 },
  });

describe("ponderarPoblacion", () => {
  it("un condado entero dentro del buffer aporta toda su población", () => {
    const r = ponderarPoblacion([condado("Love", 10_000, 500, 500)]);
    expect(r.condados[0].porcentaje).toBe(1);
    expect(r.total).toBe(10_000);
  });

  it("con la mitad del área cubierta aporta la mitad", () => {
    const r = ponderarPoblacion([condado("Cooke", 40_000, 2000, 1000)]);
    expect(r.condados[0].porcentaje).toBeCloseTo(0.5);
    expect(r.total).toBeCloseTo(20_000);
  });

  it("sin intersección no aporta nada", () => {
    const r = ponderarPoblacion([condado("Carter", 48_000, 2200, 0)]);
    expect(r.condados[0].poblacionPonderada).toBe(0);
    expect(r.total).toBe(0);
  });

  it("suma varios condados y los ordena por población ponderada", () => {
    const r = ponderarPoblacion([
      condado("A", 10_000, 100, 10), // 1000
      condado("B", 50_000, 1000, 500), // 25000
      condado("C", 8_000, 400, 400), // 8000
    ]);
    expect(r.total).toBeCloseTo(34_000);
    expect(r.condados.map((c) => c.nombre)).toEqual(["B", "C", "A"]);
  });

  it("acota el porcentaje a [0, 1] y tolera áreas o poblaciones inválidas", () => {
    const r = ponderarPoblacion([
      condado("redondeo", 1000, 100, 100.0001),
      condado("sin area", 1000, 0, 0),
      condado("sin poblacion", Number.NaN, 100, 50),
    ]);
    const porNombre = Object.fromEntries(r.condados.map((c) => [c.nombre, c]));
    expect(porNombre["redondeo"].porcentaje).toBe(1);
    expect(porNombre["sin area"].porcentaje).toBe(0);
    expect(porNombre["sin poblacion"].poblacionPonderada).toBe(0);
    expect(r.total).toBe(1000);
  });

  it("sin condados el total es cero", () => {
    expect(ponderarPoblacion([])).toEqual({ condados: [], total: 0 });
  });
});

describe("PopulationCalculator", () => {
  const condadoGeo = (objectId: number, poblacion: number): Condado => ({
    objectId,
    nombre: `C${objectId}`,
    estado: "Oklahoma",
    poblacion,
    geometria: cuadrado(objectId, 0, 1),
  });

  it("intersecta en una sola llamada y mide las dos áreas con la misma función", async () => {
    const condados = [condadoGeo(1, 1000), condadoGeo(2, 3000)];
    const intersecciones = [cuadrado(1, 0, 0.5), null];
    const intersectar = vi.fn().mockResolvedValue(intersecciones);
    // área ficticia: 100 por cada geometría completa, 25 por la intersección
    const medir = vi.fn((g) => (g === intersecciones[0] ? 25 : g ? 100 : 0));
    const buffer = cuadrado(0, 0, 5);
    const signal = new AbortController().signal;

    const r = await new PopulationCalculator(intersectar, medir).calcular(buffer, condados, signal);

    expect(intersectar).toHaveBeenCalledTimes(1);
    expect(intersectar).toHaveBeenCalledWith([condados[0].geometria, condados[1].geometria], buffer, signal);
    expect(r.total).toBeCloseTo(250);
    expect(r.condados.find((c) => c.objectId === 2)?.porcentaje).toBe(0);
  });

  it("sin condados no llama al servidor", async () => {
    const intersectar = vi.fn();
    const r = await new PopulationCalculator(intersectar, () => 0).calcular(cuadrado(0, 0, 1), [], new AbortController().signal);
    expect(intersectar).not.toHaveBeenCalled();
    expect(r.total).toBe(0);
  });

  it("con el operador geodésico real, un cuarto del cuadrado da ~25 % de la población", async () => {
    const calculador = crearPopulationCalculator("http://no-se-usa");
    const condado = { ...condadoGeo(1, 10_000), geometria: cuadrado(-97, 35, 1) };
    // reemplazo solo el intersect para no ir a la red
    const intersectar = async () => [cuadrado(-97, 35, 0.5)];
    Object.assign(calculador, { intersectar });

    const r = await calculador.calcular(cuadrado(-98, 34, 3), [condado], new AbortController().signal);
    expect(r.condados[0].areaCondadoKm2).toBeGreaterThan(9000);
    expect(r.condados[0].porcentaje).toBeGreaterThan(0.24);
    expect(r.condados[0].porcentaje).toBeLessThan(0.26);
  });
});
