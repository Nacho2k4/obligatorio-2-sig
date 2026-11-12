import type Polygon from "@arcgis/core/geometry/Polygon.js";
import { executeQueryJSON } from "@arcgis/core/rest/query.js";
import Query from "@arcgis/core/rest/support/Query.js";

export interface Condado {
  objectId: number;
  nombre: string;
  estado: string;
  poblacion: number;
  geometria: Polygon;
}

// en grados porque la salida es wgs84; 0.005° son unos 500 m y bajan la respuesta de ~280 kb a ~5 kb
export const GENERALIZACION_GRADOS = 0.005;

export class CountyQueryService {
  private readonly url: string;
  private readonly generalizacion: number;

  constructor(url: string, generalizacion = GENERALIZACION_GRADOS) {
    this.url = url;
    this.generalizacion = generalizacion;
  }

  async interceptados(area: Polygon, signal: AbortSignal): Promise<Condado[]> {
    const resultado = await executeQueryJSON(
      this.url,
      new Query({
        geometry: area,
        spatialRelationship: "intersects",
        outFields: ["OBJECTID", "NAME", "STATE_NAME", "POPULATION"],
        returnGeometry: true,
        outSpatialReference: { wkid: 4326 },
        maxAllowableOffset: this.generalizacion,
      }),
      { signal },
    );

    return resultado.features.flatMap((f) => {
      const geometria = f.geometry;
      if (geometria?.type !== "polygon") return [];
      const a = f.attributes;
      return [{ objectId: a.OBJECTID, nombre: a.NAME, estado: a.STATE_NAME, poblacion: Number(a.POPULATION) || 0, geometria }];
    });
  }
}
