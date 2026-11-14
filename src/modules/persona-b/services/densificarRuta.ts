import type Polyline from "@arcgis/core/geometry/Polyline.js";
import * as geodeticDensifyOperator from "@arcgis/core/geometry/operators/geodeticDensifyOperator.js";
import type { Coordenada } from "./Recorrido";

export const PASO_DENSIFICACION_M = 500;

// une todos los paths de la polilínea en una sola secuencia de vértices lon/lat
export async function densificarRuta(geometria: Polyline): Promise<Coordenada[]> {
  if (!geodeticDensifyOperator.isLoaded()) await geodeticDensifyOperator.load();

  const densa = geodeticDensifyOperator.execute(geometria, PASO_DENSIFICACION_M, { unit: "meters" });
  const paths = densa?.type === "polyline" ? densa.paths : geometria.paths;

  const puntos: Coordenada[] = [];
  for (const path of paths) {
    for (const [x, y] of path) {
      const ultimo = puntos[puntos.length - 1];
      if (!ultimo || ultimo[0] !== x || ultimo[1] !== y) puntos.push([x, y]);
    }
  }
  return puntos;
}
