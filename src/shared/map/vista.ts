import type MapView from "@arcgis/core/views/MapView.js";
import type SceneView from "@arcgis/core/views/SceneView.js";

export type Vista = MapView | SceneView;

let vistaActual: Vista | null = null;

export function registrarVista(vista: Vista | null): void {
  vistaActual = vista;
}

export function obtenerVista(): Vista | null {
  return vistaActual;
}
