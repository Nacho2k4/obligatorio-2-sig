import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import { describe, expect, it, vi } from "vitest";
import {
  atributosDesdeEvento,
  epochDesdeFecha,
  EventRepository,
  fechaDesdeEpoch,
  paradaDesdeFeature,
  recortarNombre,
  type CapaEditable,
} from "../repositories/eventRepository";

const feature = (attributes: Record<string, unknown>, x = -97.5, y = 35.5) =>
  new Graphic({ attributes, geometry: new Point({ x, y, spatialReference: { wkid: 4326 } }) });

function capaFalsa() {
  const capa = {
    load: vi.fn(async () => {}),
    queryFeatures: vi.fn(),
    applyEdits: vi.fn(),
  };
  return { capa, repo: new EventRepository(capa as unknown as CapaEditable) };
}

const resultadoEdicion = (clave: "addFeatureResults" | "updateFeatureResults" | "deleteFeatureResults", r: object) => ({
  addFeatureResults: [],
  updateFeatureResults: [],
  deleteFeatureResults: [],
  [clave]: [r],
});

describe("conversiones de eventos", () => {
  it("recorta el nombre a los 50 caracteres del campo description", () => {
    expect(recortarNombre("  Oklahoma   City, OK ")).toBe("Oklahoma City, OK");
    const largo = recortarNombre("x".repeat(80));
    expect(largo).toHaveLength(50);
    expect(largo.endsWith("…")).toBe(true);
  });

  it("convierte la fecha sin correrse de día por la zona horaria", () => {
    const ms = epochDesdeFecha("2026-11-12");
    expect(ms).toBe(Date.parse("2026-11-12T12:00:00Z"));
    expect(fechaDesdeEpoch(ms)).toBe("2026-11-12");
    expect(epochDesdeFecha("12/11/2026")).toBeNull();
    expect(epochDesdeFecha(undefined)).toBeNull();
    expect(fechaDesdeEpoch(null)).toBeUndefined();
  });

  it("arma los atributos del servicio a partir de la parada", () => {
    expect(atributosDesdeEvento({ nombre: "Feria", tipo: 3, fecha: "2026-11-12", punto: { x: 0, y: 0 } })).toEqual({
      description: "Feria",
      event_type: 3,
      eventdate: Date.parse("2026-11-12T12:00:00Z"),
    });
  });

  it("convierte un feature del servicio en parada y tolera datos de otros usuarios", () => {
    expect(paradaDesdeFeature(feature({ objectid: 7, description: "Desfile", event_type: 4, eventdate: Date.parse("2026-01-02T12:00:00Z") }))).toEqual({
      eventId: 7,
      objectId: 7,
      nombre: "Desfile",
      tipo: 4,
      fecha: "2026-01-02",
      punto: { x: -97.5, y: 35.5 },
    });
    const sinDatos = paradaDesdeFeature(feature({ objectid: 8, description: null, event_type: null }));
    expect(sinDatos?.nombre).toBe("Evento 8");
    expect(sinDatos?.tipo).toBe(5);
    expect(paradaDesdeFeature(new Graphic({ attributes: { objectid: 9 } }))).toBeNull();
  });
});

describe("EventRepository", () => {
  it("busca por descripción sin distinguir mayúsculas y escapando comillas", async () => {
    const { capa, repo } = capaFalsa();
    capa.queryFeatures.mockResolvedValue({ features: [feature({ objectid: 1, description: "O'Hare Fair", event_type: 3 })] });

    const eventos = await repo.buscarEventos("o'hare");

    const consulta = capa.queryFeatures.mock.calls[0][0];
    expect(consulta.where).toBe("UPPER(description) LIKE '%O''HARE%'");
    expect(consulta.orderByFields).toEqual(["objectid DESC"]);
    expect(consulta.num).toBe(100);
    expect(eventos.map((e) => e.objectId)).toEqual([1]);
  });

  it("sin texto trae todos (los más recientes)", async () => {
    const { capa, repo } = capaFalsa();
    capa.queryFeatures.mockResolvedValue({ features: [] });
    await repo.buscarEventos("  ");
    expect(capa.queryFeatures.mock.calls[0][0].where).toBe("1=1");
  });

  it("obtiene eventos por id respetando el orden pedido y omitiendo los que no existen", async () => {
    const { capa, repo } = capaFalsa();
    capa.queryFeatures.mockResolvedValue({ features: [feature({ objectid: 3 }), feature({ objectid: 1 })] });

    const eventos = await repo.obtenerEventos([1, 2, 3]);

    expect(capa.queryFeatures.mock.calls[0][0].objectIds).toEqual([1, 2, 3]);
    expect(eventos.map((e) => e.objectId)).toEqual([1, 3]);
    expect(await repo.obtenerEventos([])).toEqual([]);
    expect(capa.queryFeatures).toHaveBeenCalledTimes(1);
  });

  it("crea el evento con geometría wgs84 y devuelve la parada con su objectId", async () => {
    const { capa, repo } = capaFalsa();
    capa.applyEdits.mockResolvedValue(resultadoEdicion("addFeatureResults", { objectId: 512988 }));

    const creado = await repo.crearEvento({ nombre: "Oklahoma City, OK", tipo: 1, fecha: "2026-11-12", punto: { x: -97.5164, y: 35.4676 } });

    const agregado = capa.applyEdits.mock.calls[0][0].addFeatures[0];
    expect(agregado.geometry.toJSON()).toMatchObject({ x: -97.5164, y: 35.4676, spatialReference: { wkid: 4326 } });
    expect(agregado.attributes).toMatchObject({ description: "Oklahoma City, OK", event_type: 1 });
    expect(creado).toMatchObject({ objectId: 512988, eventId: 512988, nombre: "Oklahoma City, OK" });
  });

  it("actualiza solo atributos y elimina por objectId", async () => {
    const { capa, repo } = capaFalsa();
    capa.applyEdits
      .mockResolvedValueOnce(resultadoEdicion("updateFeatureResults", { objectId: 5 }))
      .mockResolvedValueOnce(resultadoEdicion("deleteFeatureResults", { objectId: 5 }));

    await repo.actualizarEvento(5, { nombre: "Nuevo nombre", tipo: 2, fecha: undefined });
    await repo.eliminarEvento(5);

    const actualizado = capa.applyEdits.mock.calls[0][0].updateFeatures[0];
    expect(actualizado.attributes).toEqual({ objectid: 5, description: "Nuevo nombre", event_type: 2, eventdate: null });
    expect(actualizado.geometry).toBeFalsy();
    expect(capa.applyEdits.mock.calls[1][0]).toEqual({ deleteFeatures: [{ objectId: 5 }] });
  });

  it("si el servicio rechaza la edición lanza un error legible", async () => {
    const { capa, repo } = capaFalsa();
    capa.applyEdits.mockResolvedValue(resultadoEdicion("deleteFeatureResults", { objectId: 5, error: { message: "Feature not found" } }));
    await expect(repo.eliminarEvento(5)).rejects.toThrow("No se pudo eliminar el evento: Feature not found");
  });
});
