import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import { describe, expect, it, vi } from "vitest";
import type { EventoParada, RutaGuardada } from "../../../contracts/contracts";
import type { CapaEditable, EventRepository } from "../repositories/eventRepository";
import {
  codificarNotas,
  decodificarNotas,
  idRuta,
  LARGO_MAXIMO_NOTAS,
  objectIdDeRuta,
  RouteRepository,
} from "../repositories/routeRepository";

const parada = (eventId: number, objectId?: number): EventoParada => ({
  eventId,
  objectId,
  nombre: `Parada ${eventId}`,
  tipo: 0,
  punto: { x: -97 - eventId, y: 35 },
});

const geometria = () => new Polyline({ paths: [[[-96.8, 32.78], [-97.5, 35.47]]], spatialReference: { wkid: 4326 } });

function armar() {
  const capa = { load: vi.fn(async () => {}), queryFeatures: vi.fn(), applyEdits: vi.fn() };
  const eventos = {
    obtenerEventos: vi.fn(async (ids: number[]) => ids.map((id) => parada(id, id))),
    crearEvento: vi.fn(async (p: EventoParada) => ({ ...p, objectId: 900 + p.eventId, eventId: 900 + p.eventId })),
  };
  const repo = new RouteRepository(capa as unknown as CapaEditable, eventos as unknown as EventRepository);
  return { capa, eventos, repo };
}

describe("notas de la ruta en trails", () => {
  it("codifica y decodifica nombre y eventos", () => {
    const notas = codificarNotas(" Gira de ferias ", [12, 40, 7]);
    expect(notas).toBe('{"sig":1,"n":"Gira de ferias","e":[12,40,7]}');
    expect(decodificarNotas(notas)).toEqual({ nombre: "Gira de ferias", objectIds: [12, 40, 7] });
  });

  it("rechaza rutas que no entran en los 255 caracteres de notes", () => {
    const ids = Array.from({ length: 40 }, (_, i) => 1_000_000 + i);
    expect(() => codificarNotas("Ruta", ids)).toThrow("demasiadas paradas");
    expect(codificarNotas("Ruta", ids.slice(0, 25)).length).toBeLessThanOrEqual(LARGO_MAXIMO_NOTAS);
  });

  it("ignora senderos ajenos y notas mal formadas", () => {
    expect(decodificarNotas("Sendero en buen estado")).toBeNull();
    expect(decodificarNotas('{"sig":1,"n":"x","e":["a"]}')).toBeNull();
    expect(decodificarNotas('{"sig":1,"n":"x"')).toBeNull();
    expect(decodificarNotas(null)).toBeNull();
  });

  it("traduce entre el id de la ruta y el objectid de trails", () => {
    expect(idRuta(1537669)).toBe("trails-1537669");
    expect(objectIdDeRuta("trails-1537669")).toBe(1537669);
    expect(objectIdDeRuta("ruta-123")).toBeNull();
  });
});

describe("RouteRepository", () => {
  it("lista solo nuestras rutas, con nombre, cantidad de paradas y fecha", async () => {
    const { capa, repo } = armar();
    capa.queryFeatures.mockResolvedValue({
      features: [
        new Graphic({ attributes: { objectid: 2, notes: codificarNotas("Mi ruta", [1, 2, 3]), recordedon: Date.parse("2026-11-12T10:00:00Z") } }),
        new Graphic({ attributes: { objectid: 3, notes: '{"sig":1,roto' } }),
      ],
    });

    const rutas = await repo.obtenerRutas();

    expect(capa.queryFeatures.mock.calls[0][0].where).toBe(`notes LIKE '{"sig":1,%'`);
    expect(capa.queryFeatures.mock.calls[0][0].returnGeometry).toBe(false);
    expect(rutas).toEqual([{ objectId: 2, nombre: "Mi ruta", cantidadParadas: 3, creada: "2026-11-12T10:00:00.000Z" }]);
  });

  it("carga la ruta con su geometría y sus paradas en orden, avisando las que ya no existen", async () => {
    const { capa, eventos, repo } = armar();
    capa.queryFeatures.mockResolvedValue({
      features: [new Graphic({ geometry: geometria(), attributes: { objectid: 2, notes: codificarNotas("Mi ruta", [30, 10, 20]), recordedon: 0 } })],
    });
    eventos.obtenerEventos.mockResolvedValueOnce([parada(30, 30), parada(20, 20)]);

    const { ruta, faltantes } = await repo.cargarRuta(2);

    expect(eventos.obtenerEventos).toHaveBeenCalledWith([30, 10, 20]);
    expect(ruta.id).toBe("trails-2");
    expect(ruta.nombre).toBe("Mi ruta");
    expect(ruta.paradas.map((p) => p.objectId)).toEqual([30, 20]);
    expect(ruta.geometria.type).toBe("polyline");
    expect(faltantes).toBe(1);
  });

  it("si la ruta ya no existe lanza un error legible", async () => {
    const { capa, repo } = armar();
    capa.queryFeatures.mockResolvedValue({ features: [] });
    await expect(repo.cargarRuta(99)).rejects.toThrow("La ruta ya no existe en el servidor.");
  });

  it("al guardar crea los eventos que faltan (sin objectId o borrados) y guarda notes con los ids en orden", async () => {
    const { capa, eventos, repo } = armar();
    // el evento 2 fue borrado por otro usuario: obtenerEventos solo devuelve el 1
    eventos.obtenerEventos.mockResolvedValueOnce([parada(1, 1)]);
    capa.applyEdits.mockResolvedValue({ addFeatureResults: [{ objectId: 77 }], updateFeatureResults: [], deleteFeatureResults: [] });
    const ruta: RutaGuardada = {
      id: "ruta-1",
      nombre: "Importada",
      paradas: [parada(1, 1), parada(2, 2), parada(3)],
      geometria: geometria(),
      creada: "2026-11-12",
    };

    const guardada = await repo.guardarRuta(ruta);

    expect(eventos.obtenerEventos).toHaveBeenCalledWith([1, 2]);
    expect(eventos.crearEvento).toHaveBeenCalledTimes(2);
    expect(guardada.paradas.map((p) => p.objectId)).toEqual([1, 902, 903]);
    expect(guardada.id).toBe("trails-77");
    const agregado = capa.applyEdits.mock.calls[0][0].addFeatures[0];
    expect(decodificarNotas(agregado.attributes.notes)).toEqual({ nombre: "Importada", objectIds: [1, 902, 903] });
    expect(agregado.geometry.type).toBe("polyline");
    expect(typeof agregado.attributes.recordedon).toBe("number");
  });

  it("no crea eventos si la ruta no va a entrar en notes", async () => {
    const { eventos, repo } = armar();
    const muchas = Array.from({ length: 40 }, (_, i) => parada(i));
    await expect(repo.guardarRuta({ id: "x", nombre: "Larga", paradas: muchas, geometria: geometria(), creada: "" })).rejects.toThrow();
    expect(eventos.crearEvento).not.toHaveBeenCalled();
  });

  it("eliminar borra solo la ruta de trails", async () => {
    const { capa, eventos, repo } = armar();
    capa.applyEdits.mockResolvedValue({ addFeatureResults: [], updateFeatureResults: [], deleteFeatureResults: [{ objectId: 2 }] });
    await repo.eliminarRuta(2);
    expect(capa.applyEdits).toHaveBeenCalledWith({ deleteFeatures: [{ objectId: 2 }] });
    expect(eventos.crearEvento).not.toHaveBeenCalled();
  });
});
