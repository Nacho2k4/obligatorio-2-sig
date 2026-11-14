import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import { SERVICIOS } from "../../../shared/config";
import { capas, obtenerMapa } from "../../../shared/map/capas";
import { obtenerVista, type Vista } from "../../../shared/map/vista";

// un color por tipo de evento (dominio event_type); los eventos sin tipo de otros usuarios van en gris
export const COLORES_TIPO_EVENTO: Record<number, string> = {
  0: "#7570b3",
  1: "#1b9e77",
  2: "#d95f02",
  3: "#e6ab02",
  4: "#66a61e",
  5: "#666666",
};

const simbolo = (color: string) => ({
  type: "simple-marker" as const,
  style: "circle" as const,
  color,
  size: 9,
  outline: { color: "white", width: 1.5 },
});

// la misma capa sirve para mostrar los eventos y para editarlos: applyEdits la refresca sola
export const capaEventosServidor = new FeatureLayer({
  url: SERVICIOS.eventos,
  id: "eventos-servidor",
  title: "Eventos (servidor)",
  visible: false,
  outFields: ["objectid", "description", "event_type", "eventdate"],
  renderer: {
    type: "unique-value",
    field: "event_type",
    defaultSymbol: simbolo("#9e9e9e"),
    uniqueValueInfos: Object.entries(COLORES_TIPO_EVENTO).map(([valor, color]) => ({ value: Number(valor), symbol: simbolo(color) })),
  },
  popupTemplate: {
    title: "{description}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          { fieldName: "event_type", label: "Tipo de evento" },
          { fieldName: "eventdate", label: "Fecha", format: { dateFormat: "short-date" } },
        ],
      },
    ],
  },
});

let agregada = false;
let resaltado: { remove(): void } | null = null;

// se agrega al mapa recién la primera vez que se muestra, debajo de las paradas del planificador
export function mostrarEventosServidor(visible: boolean): void {
  if (visible && !agregada) {
    const mapa = obtenerMapa();
    mapa.add(capaEventosServidor, mapa.layers.indexOf(capas.eventos));
    agregada = true;
  }
  capaEventosServidor.visible = visible;
  if (!visible) resaltarEventoServidor(null);
}

export async function resaltarEventoServidor(objectId: number | null): Promise<void> {
  resaltado?.remove();
  resaltado = null;
  const vista = obtenerVista();
  if (objectId === null || !vista || !agregada) return;
  const layerView = (await vista.whenLayerView(capaEventosServidor)) as FeatureLayerView;
  resaltado = layerView.highlight(objectId);
}

export function centrarEnEvento(punto: { x: number; y: number }): void {
  obtenerVista()?.goTo({ target: [punto.x, punto.y], zoom: 12 }).catch(() => {});
}

// click sobre un evento del servidor en el mapa
export function escucharClicksEventosServidor(vista: Vista, alElegir: (objectId: number) => void): { remove(): void } {
  return vista.on("click", async (evento) => {
    if (!capaEventosServidor.visible) return;
    const respuesta = await vista.hitTest(evento, { include: [capaEventosServidor] });
    const hit = respuesta.results.find((r) => r.type === "graphic");
    const id = hit?.type === "graphic" ? hit.graphic.attributes?.objectid : undefined;
    if (typeof id === "number") alElegir(id);
  });
}
