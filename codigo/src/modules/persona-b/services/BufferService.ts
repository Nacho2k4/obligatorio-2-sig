import Point from "@arcgis/core/geometry/Point.js";
import type Polygon from "@arcgis/core/geometry/Polygon.js";
import { buffer } from "@arcgis/core/rest/geometryService.js";
import BufferParameters from "@arcgis/core/rest/support/BufferParameters.js";
import type { Coordenada } from "./Recorrido";

export const RADIO_BUFFER_DEFAULT_KM = 25;

// el buffer lo calcula el geometryserver (lo exige la letra), geodésico y devuelto en wgs84
export class BufferService {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async generar([x, y]: Coordenada, radioKm: number, signal: AbortSignal): Promise<Polygon> {
    const parametros = new BufferParameters({
      geometries: [new Point({ x, y, spatialReference: { wkid: 4326 } })],
      distances: [radioKm],
      unit: "kilometers",
      geodesic: true,
      unionResults: false,
      outSpatialReference: { wkid: 4326 },
    });
    const [poligono] = await buffer(this.url, parametros, { signal });
    if (!poligono) throw new Error("El GeometryServer no devolvió el buffer.");
    return poligono;
  }
}
