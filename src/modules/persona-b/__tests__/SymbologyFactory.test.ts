import { describe, expect, it } from "vitest";
import {
  CLASES_VELOCIDAD,
  claseVelocidad,
  colorEstado,
  PALETA_ESTADOS,
  simboloCondado,
  simboloMovil,
  simboloTramoVelocidad,
} from "../symbology/SymbologyFactory";

describe("SymbologyFactory", () => {
  it("clasifica la velocidad en los rangos de la rampa", () => {
    expect(claseVelocidad(0)).toBe(0);
    expect(claseVelocidad(39.9)).toBe(0);
    expect(claseVelocidad(40)).toBe(1);
    expect(claseVelocidad(89.9)).toBe(2);
    expect(claseVelocidad(100)).toBe(3);
    expect(claseVelocidad(130)).toBe(CLASES_VELOCIDAD.length - 1);
  });

  it("rota la paleta de estados", () => {
    expect(colorEstado(0)).toBe(PALETA_ESTADOS[0]);
    expect(colorEstado(PALETA_ESTADOS.length)).toBe(PALETA_ESTADOS[0]);
    expect(new Set(PALETA_ESTADOS).size).toBe(PALETA_ESTADOS.length);
  });

  it("reutiliza la misma instancia de símbolo por rango, para que en 3d no parpadee al cambiarlo", () => {
    expect(simboloMovil(95)).toBe(simboloMovil(105));
    expect(simboloMovil(95)).not.toBe(simboloMovil(115));
    expect(simboloMovil(115).color.toHex()).toBe("#d73027");
    expect(simboloTramoVelocidad(2)).toBe(simboloTramoVelocidad(2));
    expect(simboloCondado(true)).toBe(simboloCondado(true));
    expect(simboloCondado()).not.toBe(simboloCondado(true));
  });
});
