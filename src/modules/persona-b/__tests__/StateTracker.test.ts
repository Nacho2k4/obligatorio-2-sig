import { describe, expect, it } from "vitest";
import type { Coordenada } from "../services/Recorrido";
import { StateTracker, type CambioEstado, type ConsultarEstado, type EstadoUS, type TramoEstado } from "../services/StateTracker";

const TX: EstadoUS = { nombre: "Texas", abreviatura: "TX" };
const OK: EstadoUS = { nombre: "Oklahoma", abreviatura: "OK" };
const KS: EstadoUS = { nombre: "Kansas", abreviatura: "KS" };

// recorrido ficticio hacia el norte: 1 km = 0.01° de latitud, fronteras en el km 100 y en el km 300
const posicionEn = (km: number): Coordenada => [0, km / 100];
const estadoPorLatitud = ([, lat]: Coordenada) => (lat < 1 ? TX : lat < 3 ? OK : KS);

function crear(consultar: ConsultarEstado = async (p) => estadoPorLatitud(p)) {
  const cambios: CambioEstado[] = [];
  let tramos: TramoEstado[] = [];
  const tracker = new StateTracker(posicionEn, consultar, {
    cambio: (c) => cambios.push(c),
    tramos: (t) => (tramos = t),
  });
  return { tracker, cambios, tramos: () => tramos };
}

describe("StateTracker", () => {
  it("arranca con el estado del primer punto y extiende el tramo mientras no cambia", async () => {
    const { tracker, cambios, tramos } = crear();
    await tracker.actualizar(0);
    await tracker.actualizar(40);
    await tracker.actualizar(80);

    expect(tracker.estadoActual).toEqual(TX);
    expect(tramos()).toEqual([{ estado: TX, indiceColor: 0, desdeKm: 0, hastaKm: 80 }]);
    expect(cambios).toHaveLength(0);
  });

  it("detecta el cambio de estado y ubica el cruce por bisección", async () => {
    const { tracker, cambios, tramos } = crear();
    await tracker.actualizar(0);
    await tracker.actualizar(90);
    await tracker.actualizar(130);

    expect(cambios).toHaveLength(1);
    expect(cambios[0].de).toEqual(TX);
    expect(cambios[0].a).toEqual(OK);
    expect(cambios[0].km).toBeCloseTo(100, 0);
    expect(Math.abs(cambios[0].km - 100)).toBeLessThan(0.25);
    expect(cambios[0].posicion[1]).toBeCloseTo(1, 2);

    const [tx, ok] = tramos();
    expect(tx.hastaKm).toBe(ok.desdeKm);
    expect(ok).toMatchObject({ estado: OK, indiceColor: 1, hastaKm: 130 });
  });

  it("rota los colores de la paleta en cada cambio", async () => {
    const { tracker, cambios, tramos } = crear();
    for (const km of [0, 95, 110, 290, 305]) await tracker.actualizar(km);

    expect(cambios.map((c) => c.a.abreviatura)).toEqual(["OK", "KS"]);
    expect(tramos().map((t) => t.indiceColor)).toEqual([0, 1, 2]);
    expect(Math.abs(cambios[0].km - 100)).toBeLessThan(0.25);
    expect(Math.abs(cambios[1].km - 300)).toBeLessThan(0.25);
  });

  it("nunca tiene más de una consulta en vuelo y al terminar procesa solo la última salteada", async () => {
    let liberar!: () => void;
    const consultados: number[] = [];
    const lenta: ConsultarEstado = (p) => {
      consultados.push(p[1] * 100);
      return new Promise((r) => (liberar = () => r(estadoPorLatitud(p))));
    };
    const { tracker, tramos } = crear(lenta);

    const primera = tracker.actualizar(0);
    expect(tracker.enCurso).toBe(true);
    await tracker.actualizar(10);
    await tracker.actualizar(20);
    expect(tracker.consultasSalteadas).toBe(2);
    expect(consultados).toEqual([0]);

    liberar();
    await primera;
    expect(consultados).toEqual([0, 20]);
    expect(tracker.enCurso).toBe(true);

    liberar();
    await new Promise((r) => setTimeout(r, 0));
    expect(tracker.enCurso).toBe(false);
    expect(tramos()[0].hastaKm).toBe(20);
  });

  it("ignora puntos sin estado (por ejemplo sobre el agua)", async () => {
    const { tracker, tramos } = crear(async (p) => (p[1] > 0.5 && p[1] < 0.6 ? null : estadoPorLatitud(p)));
    await tracker.actualizar(0);
    await tracker.actualizar(55);
    expect(tramos()[0].hastaKm).toBe(0);
  });

  it("reset aborta la consulta en curso y descarta su resultado", async () => {
    let liberar!: () => void;
    let señal: AbortSignal | null = null;
    const lenta: ConsultarEstado = (p, signal) => {
      señal = signal;
      return new Promise((r) => (liberar = () => r(estadoPorLatitud(p))));
    };
    const { tracker, tramos } = crear(lenta);

    const pendiente = tracker.actualizar(0);
    tracker.reset();
    expect(señal!.aborted).toBe(true);
    expect(tracker.enCurso).toBe(false);

    liberar();
    await pendiente;
    expect(tracker.estadoActual).toBeNull();
    expect(tramos()).toEqual([]);
  });

  it("informa los errores de red sin quedar trabado", async () => {
    const errores: unknown[] = [];
    let falla = true;
    const tracker = new StateTracker(
      posicionEn,
      async (p) => {
        if (falla) throw new Error("timeout");
        return estadoPorLatitud(p);
      },
      { error: (e) => errores.push(e) },
    );

    await tracker.actualizar(0);
    expect(errores).toHaveLength(1);
    expect(tracker.enCurso).toBe(false);

    falla = false;
    await tracker.actualizar(10);
    expect(tracker.estadoActual).toEqual(TX);
  });
});
