import type MapView from "@arcgis/core/views/MapView.js";
import type SceneView from "@arcgis/core/views/SceneView.js";

export type Vista = MapView | SceneView;

let vistaActual: Vista | null = null;
const suscriptores = new Set<(vista: Vista | null) => void>();

export function registrarVista(vista: Vista | null): void {
  vistaActual = vista;
  suscriptores.forEach((cb) => cb(vista));
}

export function obtenerVista(): Vista | null {
  return vistaActual;
}

// llama al callback con la vista actual y cada vez que cambie; devuelve la función para desuscribirse
export function alCambiarVista(cb: (vista: Vista | null) => void): () => void {
  suscriptores.add(cb);
  cb(vistaActual);
  return () => suscriptores.delete(cb);
}
