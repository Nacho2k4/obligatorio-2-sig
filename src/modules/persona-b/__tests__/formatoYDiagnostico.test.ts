import { describe, expect, it } from "vitest";
import {
  formatoDuracion,
  formatoEntero,
  formatoKm,
  formatoLatLon,
  formatoPorcentaje,
  formatoSegundos,
} from "../components/formato";
import type { MetricasAnalisis } from "../services/AnalysisPipeline";
import { diagnosticarAnalisis } from "../services/diagnosticoAnalisis";

describe("formato", () => {
  it("usa coma decimal y punto de miles", () => {
    expect(formatoEntero(2188878)).toBe("2.188.878");
    expect(formatoKm(117.14)).toBe("117,1 km");
    expect(formatoSegundos(1830)).toBe("1,83 s");
    expect(formatoLatLon(33.74721, -97.13519)).toBe("33,7472° N, 97,1352° O");
  });

  it("no muestra 0 % para una intersección mínima", () => {
    expect(formatoPorcentaje(0.808)).toBe("80,8%");
    expect(formatoPorcentaje(0.0002)).toBe("< 0,1%");
    expect(formatoPorcentaje(0)).toBe("0,0%");
  });

  it("formatea la duración simulada en horas y minutos", () => {
    expect(formatoDuracion(0)).toBe("0 h 00 min");
    expect(formatoDuracion(3 * 3600 + 20 * 60 + 59)).toBe("3 h 20 min");
  });
});

const metricas = (cambios: Partial<MetricasAnalisis>): MetricasAnalisis => ({
  enCurso: false,
  completados: 10,
  salteados: 0,
  descartados: 0,
  errores: 0,
  erroresSeguidos: 0,
  ultimosTiempos: { bufferMs: 300, condadosMs: 200, poblacionMs: 300, totalMs: 800 },
  ...cambios,
});

describe("diagnosticarAnalisis", () => {
  it("no dice nada si el análisis entra en un tick", () => {
    expect(diagnosticarAnalisis(metricas({}), 1000)).toBeNull();
    expect(diagnosticarAnalisis(null, 1000)).toBeNull();
  });

  it("sugiere subir el intervalo cuando el análisis tarda más que el tick", () => {
    const d = diagnosticarAnalisis(metricas({}), 200);
    expect(d?.nivel).toBe("warning");
    expect(d?.mensaje).toContain("1 de cada 4 posiciones");
  });

  it("con la simulación pausada o terminada no sugiere cambiar el intervalo", () => {
    expect(diagnosticarAnalisis(metricas({}), 200, false)).toBeNull();
    expect(diagnosticarAnalisis(metricas({ erroresSeguidos: 4 }), 200, false)?.nivel).toBe("danger");
  });

  it("avisa que el servidor no responde tras varios errores seguidos, aunque haya errores viejos aislados", () => {
    expect(diagnosticarAnalisis(metricas({ errores: 5, erroresSeguidos: 1 }), 1000)).toBeNull();
    expect(diagnosticarAnalisis(metricas({ errores: 5, erroresSeguidos: 3 }), 1000)?.nivel).toBe("danger");
  });
});
