import { describe, expect, it } from "vitest";
import { mockRuta } from "../../../mocks/mockRuta";
import { densificarRuta, PASO_DENSIFICACION_M } from "../services/densificarRuta";
import { crearRecorrido, distanciaKm } from "../services/Recorrido";

describe("densificarRuta", () => {
  it("densifica la ruta mock con vértices cada ~500 m", async () => {
    const puntos = await densificarRuta(mockRuta.geometria);
    const recorrido = crearRecorrido(puntos);

    expect(puntos[0]).toEqual([-96.797, 32.7767]);
    expect(puntos[puntos.length - 1]).toEqual([-97.3375, 37.6872]);
    expect(recorrido.totalKm).toBeGreaterThan(550);
    expect(recorrido.totalKm).toBeLessThan(580);
    for (let i = 1; i < puntos.length; i++) {
      expect(distanciaKm(puntos[i - 1], puntos[i])).toBeLessThanOrEqual(PASO_DENSIFICACION_M / 1000 + 0.01);
    }
  });
});
