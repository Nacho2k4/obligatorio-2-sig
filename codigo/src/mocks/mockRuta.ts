import Polyline from "@arcgis/core/geometry/Polyline.js";
import type { EventoParada, RutaGuardada } from "../contracts/contracts";
import datos from "./mockRuta.json";

// solo para desarrollo: sigue más o menos la i-35 de dallas a wichita (tx → ok → ks).
// dallas, oklahoma city y wichita usan las mismas coordenadas que las paradas del json
export const MOCK_VERTICES: [number, number][] = [
  [-96.797, 32.7767], // dallas
  [-97.133, 33.215], // denton
  [-97.133, 33.626], // gainesville
  [-97.143, 34.174], // ardmore
  [-97.439, 35.222], // norman
  [-97.5164, 35.4676], // oklahoma city
  [-97.288, 36.289], // perry
  [-97.297, 36.805], // blackwell
  [-97.398, 37.265], // wellington
  [-97.3375, 37.6872], // wichita
];

export function crearMockRuta(): RutaGuardada {
  return {
    id: datos.id,
    nombre: `[DEV] ${datos.nombre}`,
    paradas: datos.paradas as EventoParada[],
    geometria: new Polyline({
      paths: [MOCK_VERTICES],
      spatialReference: { wkid: 4326 },
    }),
    creada: datos.creada,
  };
}

export const mockRuta: RutaGuardada = crearMockRuta();
