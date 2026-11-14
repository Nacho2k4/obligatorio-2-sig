import Basemap from "@arcgis/core/Basemap.js";
import EsriMap from "@arcgis/core/Map.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import TileLayer from "@arcgis/core/layers/TileLayer.js";
import { SERVICIOS } from "../config";

// se crean una sola vez y se actualizan por referencia, nunca en un render de react.
// van sin minScale/maxScale porque la letra pide verlas a toda escala, y el orden importa: lo último se dibuja encima
export const capas = {
  condados: new GraphicsLayer({ id: "condados", title: "Condados interceptados" }),
  buffer: new GraphicsLayer({ id: "buffer", title: "Buffer" }),
  eventos: new GraphicsLayer({ id: "eventos", title: "Planificación (paradas y ruta)" }),
  ruta: new GraphicsLayer({ id: "ruta", title: "Ruta" }),
  estados: new GraphicsLayer({ id: "estados", title: "Recorrido por Estado" }),
  velocidad: new GraphicsLayer({ id: "velocidad", title: "Recorrido por velocidad" }),
  // en 3d un punto "sobre el terreno" se pega al suelo y con la cámara inclinada casi no se ve;
  // relativo al terreno se dibuja como ícono parado sobre el relieve. en 2d no cambia nada
  movil: new GraphicsLayer({ id: "movil", title: "Móvil", elevationInfo: { mode: "relative-to-ground", offset: 0 } }),
} as const;

export type NombreCapa = keyof typeof capas;

let mapaSingleton: EsriMap | null = null;

export function obtenerMapa(): EsriMap {
  if (!mapaSingleton) {
    mapaSingleton = new EsriMap({
      basemap: new Basemap({
        id: "world-street-tiled",
        title: "World Street Map (Tiled)",
        baseLayers: [new TileLayer({ url: SERVICIOS.basemapWorldStreet })],
      }),
      layers: Object.values(capas),
      // relieve público de esri; solo lo usa la vista 3d, la 2d lo ignora
      ground: "world-elevation",
    });
  }
  return mapaSingleton;
}
