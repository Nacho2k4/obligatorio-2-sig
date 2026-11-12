import type Polygon from "@arcgis/core/geometry/Polygon.js";
import { describe, expect, it, vi } from "vitest";
import { AnalysisPipeline, type EtapasAnalisis, type ResultadoAnalisis } from "../services/AnalysisPipeline";
import type { Condado } from "../services/CountyQueryService";

// promesas que el test resuelve a mano, para simular un servidor lento
function diferida<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

const vaciar = () => new Promise((r) => setTimeout(r, 0));

const bufferFalso = (km: number) => ({ km }) as unknown as Polygon;

function armar() {
  const pedidos: { km: number; signal: AbortSignal; d: ReturnType<typeof diferida<Polygon>> }[] = [];
  const etapas: EtapasAnalisis = {
    buffer: vi.fn((punto, _radio, signal) => {
      const d = diferida<Polygon>();
      pedidos.push({ km: punto[0], signal, d });
      return d.promesa;
    }),
    condados: vi.fn(async () => [] as Condado[]),
    poblacion: vi.fn(async () => ({ condados: [], total: 42 })),
  };
  const resultados: ResultadoAnalisis[] = [];
  const errores: unknown[] = [];
  let t = 0;
  const pipeline = new AnalysisPipeline(
    etapas,
    { resultado: (r) => resultados.push(r), error: (e) => errores.push(e) },
    () => (t += 100),
  );
  const solicitar = (km: number) => pipeline.solicitar({ punto: [km, 0], radioKm: 25, km });
  return { pipeline, etapas, pedidos, resultados, errores, solicitar };
}

describe("AnalysisPipeline", () => {
  it("encadena buffer → condados → población y mide cada etapa", async () => {
    const { pedidos, resultados, etapas, solicitar } = armar();
    solicitar(1);
    pedidos[0].d.resolver(bufferFalso(1));
    await vaciar();

    expect(etapas.condados).toHaveBeenCalledWith(bufferFalso(1), expect.any(AbortSignal));
    expect(resultados).toHaveLength(1);
    expect(resultados[0].poblacion.total).toBe(42);
    expect(resultados[0].tiempos).toEqual({ bufferMs: 100, condadosMs: 100, poblacionMs: 100, totalMs: 300 });
  });

  it("nunca tiene más de un análisis en vuelo: saltea y al terminar analiza solo la última posición", async () => {
    const { pipeline, pedidos, resultados, solicitar } = armar();
    solicitar(1);
    solicitar(2);
    solicitar(3);
    solicitar(4);

    expect(pedidos).toHaveLength(1);
    expect(pipeline.estado.salteados).toBe(3);

    pedidos[0].d.resolver(bufferFalso(1));
    await vaciar();
    expect(pedidos.map((p) => p.km)).toEqual([1, 4]);

    pedidos[1].d.resolver(bufferFalso(4));
    await vaciar();
    expect(resultados.map((r) => r.solicitud.km)).toEqual([1, 4]);
    expect(resultados.map((r) => r.secuencia)).toEqual([1, 2]);
    expect(pipeline.estado.enCurso).toBe(false);
  });

  it("al invalidar aborta el análisis en vuelo y descarta su resultado", async () => {
    const { pipeline, pedidos, resultados, solicitar } = armar();
    solicitar(1);
    solicitar(2);
    pipeline.invalidar();

    expect(pedidos[0].signal.aborted).toBe(true);
    expect(pipeline.estado.descartados).toBe(1);

    solicitar(10);
    pedidos[0].d.resolver(bufferFalso(1));
    pedidos[1].d.resolver(bufferFalso(10));
    await vaciar();

    // el viejo terminó tarde pero no se publica, y la solicitud pendiente (km 2) se descartó
    expect(resultados.map((r) => r.solicitud.km)).toEqual([10]);
    expect(pedidos.map((p) => p.km)).toEqual([1, 10]);
  });

  it("un error de red se informa y el pipeline sigue funcionando", async () => {
    const { pipeline, pedidos, resultados, errores, solicitar } = armar();
    solicitar(1);
    pedidos[0].d.rechazar(new Error("timeout"));
    await vaciar();

    expect(errores).toHaveLength(1);
    expect(pipeline.estado.errores).toBe(1);
    expect(pipeline.estado.enCurso).toBe(false);

    solicitar(2);
    pedidos[1].d.rechazar(new Error("502"));
    await vaciar();
    expect(pipeline.estado.erroresSeguidos).toBe(2);

    solicitar(3);
    pedidos[2].d.resolver(bufferFalso(3));
    await vaciar();
    expect(resultados).toHaveLength(1);
    expect(pipeline.estado.errores).toBe(2);
    expect(pipeline.estado.erroresSeguidos).toBe(0);
  });

  it("un error de un análisis invalidado no se informa", async () => {
    const { pipeline, pedidos, errores, solicitar } = armar();
    solicitar(1);
    pipeline.invalidar();
    pedidos[0].d.rechazar(new DOMException("Aborted", "AbortError"));
    await vaciar();
    expect(errores).toHaveLength(0);
    expect(pipeline.estado.errores).toBe(0);
  });

  it("avisa el buffer apenas está, antes de terminar el análisis", async () => {
    const etapaLenta = diferida<Condado[]>();
    const vistos: number[] = [];
    const pipeline = new AnalysisPipeline(
      {
        buffer: async (p) => bufferFalso(p[0]),
        condados: () => etapaLenta.promesa,
        poblacion: async () => ({ condados: [], total: 0 }),
      },
      { buffer: (_b, s) => vistos.push(s.km) },
    );
    pipeline.solicitar({ punto: [7, 0], radioKm: 25, km: 7 });
    await vaciar();
    expect(vistos).toEqual([7]);
    expect(pipeline.estado.enCurso).toBe(true);
  });
});
