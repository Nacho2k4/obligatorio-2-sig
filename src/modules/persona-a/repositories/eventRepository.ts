import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import type { EditsResult, FeatureEditResult } from "@arcgis/core/editing/types.js";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import type { EventoParada } from "../../../contracts/contracts";

// en el servicio el nombre del evento es description, con un máximo de 50 caracteres
export const LARGO_MAXIMO_NOMBRE = 50;
export const TIPO_POR_DEFECTO = 5; // other
const CAMPOS = ["objectid", "description", "event_type", "eventdate"];

// lo mínimo de FeatureLayer que usa el repositorio; en los tests se reemplaza por un doble
export type CapaEditable = Pick<FeatureLayer, "load" | "queryFeatures" | "applyEdits">;

export type DatosEvento = Pick<EventoParada, "nombre" | "tipo" | "fecha" | "punto">;

export function recortarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  return limpio.length <= LARGO_MAXIMO_NOMBRE ? limpio : `${limpio.slice(0, LARGO_MAXIMO_NOMBRE - 1).trimEnd()}…`;
}

export const fechaDesdeEpoch = (ms: unknown): string | undefined =>
  typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : undefined;

// la fecha se guarda al mediodía utc para que no cambie de día por la zona horaria
export const epochDesdeFecha = (fecha: string | undefined): number | null =>
  fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? Date.parse(`${fecha}T12:00:00Z`) : null;

export function atributosDesdeEvento(evento: DatosEvento): Record<string, unknown> {
  return {
    description: recortarNombre(evento.nombre),
    event_type: evento.tipo,
    eventdate: epochDesdeFecha(evento.fecha),
  };
}

// los eventos de otros usuarios pueden venir sin tipo o sin descripción
export function paradaDesdeFeature(feature: Pick<Graphic, "attributes" | "geometry">): EventoParada | null {
  const a = feature.attributes ?? {};
  const g = feature.geometry;
  if (typeof a.objectid !== "number" || g?.type !== "point") return null;
  return {
    eventId: a.objectid,
    objectId: a.objectid,
    nombre: typeof a.description === "string" && a.description.trim() ? a.description.trim() : `Evento ${a.objectid}`,
    tipo: typeof a.event_type === "number" ? a.event_type : TIPO_POR_DEFECTO,
    fecha: fechaDesdeEpoch(a.eventdate),
    punto: { x: g.x, y: g.y },
  };
}

const escaparSql = (texto: string) => texto.replace(/'/g, "''");

function verificar(resultados: FeatureEditResult[], accion: string): number {
  const r = resultados[0];
  if (!r || r.error || typeof r.objectId !== "number") {
    throw new Error(`No se pudo ${accion} el evento${r?.error?.message ? `: ${r.error.message}` : "."}`);
  }
  return r.objectId;
}

// alta, baja, modificación y consulta de eventos en el featureserver de events
export class EventRepository {
  private readonly capa: CapaEditable;

  constructor(capa: CapaEditable) {
    this.capa = capa;
  }

  async buscarEventos(texto = "", maximo = 100): Promise<EventoParada[]> {
    await this.capa.load();
    const filtro = texto.trim();
    const resultado = await this.capa.queryFeatures({
      where: filtro ? `UPPER(description) LIKE '%${escaparSql(filtro.toUpperCase())}%'` : "1=1",
      outFields: CAMPOS,
      returnGeometry: true,
      orderByFields: ["objectid DESC"],
      num: maximo,
    });
    return resultado.features.flatMap((f) => paradaDesdeFeature(f) ?? []);
  }

  // devuelve los eventos en el orden pedido; los que ya no existen en el servicio quedan afuera
  async obtenerEventos(objectIds: number[]): Promise<EventoParada[]> {
    if (objectIds.length === 0) return [];
    await this.capa.load();
    const resultado = await this.capa.queryFeatures({ objectIds, outFields: CAMPOS, returnGeometry: true });
    const porId = new Map(resultado.features.flatMap((f) => paradaDesdeFeature(f) ?? []).map((p) => [p.objectId, p]));
    return objectIds.flatMap((id) => porId.get(id) ?? []);
  }

  async crearEvento(evento: DatosEvento): Promise<EventoParada> {
    await this.capa.load();
    const atributos = atributosDesdeEvento(evento);
    const resultado: EditsResult = await this.capa.applyEdits({
      addFeatures: [
        new Graphic({
          geometry: new Point({ x: evento.punto.x, y: evento.punto.y, spatialReference: { wkid: 4326 } }),
          attributes: atributos,
        }),
      ],
    });
    const objectId = verificar(resultado.addFeatureResults, "crear");
    return { ...evento, nombre: atributos.description as string, eventId: objectId, objectId };
  }

  async actualizarEvento(objectId: number, cambios: Pick<EventoParada, "nombre" | "tipo" | "fecha">): Promise<void> {
    await this.capa.load();
    const atributos = { objectid: objectId, ...atributosDesdeEvento({ ...cambios, punto: { x: 0, y: 0 } }) };
    const resultado = await this.capa.applyEdits({ updateFeatures: [new Graphic({ attributes: atributos })] });
    verificar(resultado.updateFeatureResults, "actualizar");
  }

  async eliminarEvento(objectId: number): Promise<void> {
    await this.capa.load();
    const resultado = await this.capa.applyEdits({ deleteFeatures: [{ objectId }] });
    verificar(resultado.deleteFeatureResults, "eliminar");
  }
}
