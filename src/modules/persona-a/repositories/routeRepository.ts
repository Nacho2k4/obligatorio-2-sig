import Graphic from "@arcgis/core/Graphic.js";
import type { FeatureEditResult } from "@arcgis/core/editing/types.js";
import type { EventoParada, RutaGuardada } from "../../../contracts/contracts";
import type { CapaEditable, EventRepository } from "./eventRepository";

// trails no tiene campos para el nombre ni las paradas: se guardan en notes (255 caracteres) como
// {"sig":1,"n":"<nombre>","e":[objectids de los eventos en orden]}. la marca "sig" separa nuestras
// rutas de los senderos que ya tiene el servicio
export const LARGO_MAXIMO_NOTAS = 255;
const MARCA = '{"sig":1,';

export interface ResumenRuta {
  objectId: number;
  nombre: string;
  cantidadParadas: number;
  creada: string;
}

export interface RutaCargada {
  ruta: RutaGuardada;
  // paradas que la ruta referencia pero que ya no existen en el servicio de eventos
  faltantes: number;
}

export function codificarNotas(nombre: string, objectIds: number[]): string {
  const notas = JSON.stringify({ sig: 1, n: nombre.trim(), e: objectIds });
  if (notas.length > LARGO_MAXIMO_NOTAS) {
    throw new Error("La ruta tiene demasiadas paradas o un nombre muy largo para guardarse en el servidor.");
  }
  return notas;
}

export function decodificarNotas(notas: unknown): { nombre: string; objectIds: number[] } | null {
  if (typeof notas !== "string" || !notas.startsWith(MARCA)) return null;
  try {
    const datos = JSON.parse(notas);
    if (typeof datos.n !== "string" || !Array.isArray(datos.e) || !datos.e.every(Number.isInteger)) return null;
    return { nombre: datos.n, objectIds: datos.e };
  } catch {
    return null;
  }
}

export const idRuta = (objectId: number) => `trails-${objectId}`;

export function objectIdDeRuta(id: string): number | null {
  const m = /^trails-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

const fechaIso = (ms: unknown) => (typeof ms === "number" ? new Date(ms).toISOString() : new Date(0).toISOString());

function verificar(resultados: FeatureEditResult[], accion: string): number {
  const r = resultados[0];
  if (!r || r.error || typeof r.objectId !== "number") {
    throw new Error(`No se pudo ${accion} la ruta${r?.error?.message ? `: ${r.error.message}` : "."}`);
  }
  return r.objectId;
}

// rutas guardadas en el featureserver de trails; las paradas son eventos del featureserver de events
export class RouteRepository {
  private readonly capa: CapaEditable;
  private readonly eventos: EventRepository;

  constructor(capa: CapaEditable, eventos: EventRepository) {
    this.capa = capa;
    this.eventos = eventos;
  }

  async obtenerRutas(): Promise<ResumenRuta[]> {
    await this.capa.load();
    const resultado = await this.capa.queryFeatures({
      where: `notes LIKE '${MARCA}%'`,
      outFields: ["objectid", "notes", "recordedon"],
      returnGeometry: false,
      orderByFields: ["objectid DESC"],
    });
    return resultado.features.flatMap((f) => {
      const datos = decodificarNotas(f.attributes?.notes);
      if (!datos || typeof f.attributes.objectid !== "number") return [];
      return [
        {
          objectId: f.attributes.objectid,
          nombre: datos.nombre,
          cantidadParadas: datos.objectIds.length,
          creada: fechaIso(f.attributes.recordedon),
        },
      ];
    });
  }

  async cargarRuta(objectId: number): Promise<RutaCargada> {
    await this.capa.load();
    const resultado = await this.capa.queryFeatures({
      objectIds: [objectId],
      outFields: ["objectid", "notes", "recordedon"],
      returnGeometry: true,
      outSpatialReference: { wkid: 4326 },
    });
    const feature = resultado.features[0];
    const datos = decodificarNotas(feature?.attributes?.notes);
    if (!feature || !datos || feature.geometry?.type !== "polyline") {
      throw new Error("La ruta ya no existe en el servidor.");
    }

    const paradas = await this.eventos.obtenerEventos(datos.objectIds);
    return {
      ruta: {
        id: idRuta(objectId),
        nombre: datos.nombre,
        paradas,
        geometria: feature.geometry,
        creada: fechaIso(feature.attributes.recordedon),
      },
      faltantes: datos.objectIds.length - paradas.length,
    };
  }

  // las paradas sin evento en el servidor (por ejemplo, las de una ruta importada desde archivo, o eventos que
  // otro usuario borró) se crean antes de guardar la ruta. devuelve la ruta con los objectId ya asignados
  async guardarRuta(ruta: RutaGuardada): Promise<RutaGuardada> {
    // se valida el largo antes de crear eventos, con un id de 7 dígitos para las paradas que todavía no tienen
    codificarNotas(ruta.nombre, ruta.paradas.map((p) => p.objectId ?? 9_999_999));

    const conId = ruta.paradas.flatMap((p) => (typeof p.objectId === "number" ? [p.objectId] : []));
    const existentes = new Set((await this.eventos.obtenerEventos(conId)).map((p) => p.objectId));

    const paradas: EventoParada[] = [];
    for (const parada of ruta.paradas) {
      if (typeof parada.objectId === "number" && existentes.has(parada.objectId)) {
        paradas.push(parada);
      } else {
        const creado = await this.eventos.crearEvento(parada);
        paradas.push({ ...parada, objectId: creado.objectId, nombre: creado.nombre });
      }
    }

    const notas = codificarNotas(ruta.nombre, paradas.map((p) => p.objectId as number));
    await this.capa.load();
    const resultado = await this.capa.applyEdits({
      addFeatures: [new Graphic({ geometry: ruta.geometria, attributes: { notes: notas, recordedon: Date.now() } })],
    });
    const objectId = verificar(resultado.addFeatureResults, "guardar");
    return { ...ruta, id: idRuta(objectId), paradas };
  }

  // borra solo la ruta: los eventos siguen existiendo y pueden ser parte de otras rutas
  async eliminarRuta(objectId: number): Promise<void> {
    await this.capa.load();
    const resultado = await this.capa.applyEdits({ deleteFeatures: [{ objectId }] });
    verificar(resultado.deleteFeatureResults, "eliminar");
  }
}
