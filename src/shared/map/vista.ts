import type MapView from "@arcgis/core/views/MapView.js";
import type SceneView from "@arcgis/core/views/SceneView.js";
import type { GoToTarget3D } from "@arcgis/core/views/types.js";
import { create } from "zustand";

export type Vista = MapView | SceneView;
export type ModoVista = "2d" | "3d";

// las dos vistas comparten el mismo map y nunca se destruyen: destruir una vista destruye también su map.
// cambiar de modo solo cambia cuál está visible y cuál devuelve obtenerVista()
const vistas: { "2d": MapView | null; "3d": SceneView | null } = { "2d": null, "3d": null };
const suscriptores = new Set<(vista: Vista | null) => void>();

export const useModoVista = create<{ modo: ModoVista }>()(() => ({ modo: "2d" }));

const notificar = () => {
  const vista = obtenerVista();
  suscriptores.forEach((cb) => cb(vista));
};

// la primera vez que se entra a 3d la cámara arranca inclinada para que se note el relieve
const INCLINACION_INICIAL_3D = 50;
let escenaPosicionada = false;

function sincronizar(desde: Vista | null, hacia: Vista | null): void {
  if (!desde || !hacia) return;
  if (hacia.type === "3d") {
    const primeraVez = !escenaPosicionada;
    escenaPosicionada = true;
    if (!primeraVez) {
      hacia.viewpoint = desde.viewpoint.clone();
      return;
    }
    // inclinar la cámara ya ubicada la gira sobre sí misma y deja de mirar el centro; con goTo se inclina
    // alrededor del objetivo. la doc del sdk acepta tilt en goTo aunque los tipos de la 5.1 no lo declaren
    const objetivo = { target: desde.viewpoint.targetGeometry, scale: desde.scale, tilt: INCLINACION_INICIAL_3D };
    hacia.goTo(objetivo as GoToTarget3D, { animate: false }).catch(() => {});
  } else {
    hacia.viewpoint = desde.viewpoint.clone();
    hacia.rotation = 0;
  }
}

export function registrarVista(modo: "2d", vista: MapView | null): void;
export function registrarVista(modo: "3d", vista: SceneView | null): void;
export function registrarVista(modo: ModoVista, vista: Vista | null): void {
  if (modo === "2d") vistas["2d"] = vista as MapView | null;
  else vistas["3d"] = vista as SceneView | null;

  // la escena se crea recién al pedir 3d: cuando queda lista toma la ubicación de la vista 2d
  if (modo === "3d" && vista && useModoVista.getState().modo === "3d") sincronizar(vistas["2d"], vista);
  if (modo === useModoVista.getState().modo) notificar();
}

export function setModoVista(modo: ModoVista): void {
  const anterior = useModoVista.getState().modo;
  if (modo === anterior) return;
  sincronizar(vistas[anterior], vistas[modo]);
  useModoVista.setState({ modo });
  notificar();
}

export function obtenerVista(): Vista | null {
  return vistas[useModoVista.getState().modo];
}

// la impresión necesita una vista 2d; sigue viva detrás aunque se esté mostrando la 3d
export function obtenerVista2D(): MapView | null {
  return vistas["2d"];
}

// llama al callback con la vista activa y cada vez que cambie; devuelve la función para desuscribirse
export function alCambiarVista(cb: (vista: Vista | null) => void): () => void {
  suscriptores.add(cb);
  cb(obtenerVista());
  return () => suscriptores.delete(cb);
}
