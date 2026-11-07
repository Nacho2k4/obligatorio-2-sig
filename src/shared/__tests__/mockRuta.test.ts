import { describe, expect, it } from "vitest";
import { mockRuta, MOCK_VERTICES } from "../../mocks/mockRuta";

describe("mockRuta", () => {
  it("cumple el contrato RutaGuardada", () => {
    expect(mockRuta.paradas).toHaveLength(3);
    expect(mockRuta.geometria.spatialReference.wkid).toBe(4326);
    expect(mockRuta.geometria.paths[0]).toHaveLength(MOCK_VERTICES.length);
    expect(Number.isNaN(Date.parse(mockRuta.creada))).toBe(false);
  });

  it("las paradas coinciden con vértices de la ruta", () => {
    for (const p of mockRuta.paradas) {
      expect(MOCK_VERTICES).toContainEqual([p.punto.x, p.punto.y]);
    }
  });
});
