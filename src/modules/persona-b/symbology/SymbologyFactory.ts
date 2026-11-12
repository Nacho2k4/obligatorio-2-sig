import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import TextSymbol from "@arcgis/core/symbols/TextSymbol.js";

export interface ClaseVelocidad {
  hastaKmh: number;
  color: string;
  etiqueta: string;
}

// rampa verde → amarillo → rojo: más cálido = más rápido
export const CLASES_VELOCIDAD: ClaseVelocidad[] = [
  { hastaKmh: 40, color: "#1a9850", etiqueta: "< 40 km/h" },
  { hastaKmh: 70, color: "#91cf60", etiqueta: "40 – 70 km/h" },
  { hastaKmh: 90, color: "#f2c200", etiqueta: "70 – 90 km/h" },
  { hastaKmh: 110, color: "#fc8d59", etiqueta: "90 – 110 km/h" },
  { hastaKmh: Infinity, color: "#d73027", etiqueta: "> 110 km/h" },
];

// colores que se rotan al cambiar de estado; evitan verdes y rojos para no confundirse con la velocidad
export const PALETA_ESTADOS = ["#6a3d9a", "#1f78b4", "#8c510a"];

export const COLOR_RUTA = "#6e6e6e";

// el análisis usa cian y magenta para no chocar con la rampa de velocidad ni con la paleta de estados
export const COLOR_BUFFER = "#0097a7";
export const COLOR_CONDADO = "#d81b60";

export function claseVelocidad(kmh: number): number {
  return CLASES_VELOCIDAD.findIndex((c) => kmh < c.hastaKmh);
}

export function colorVelocidad(kmh: number): string {
  return CLASES_VELOCIDAD[claseVelocidad(kmh)].color;
}

export function colorEstado(indice: number): string {
  return PALETA_ESTADOS[indice % PALETA_ESTADOS.length];
}

export const simboloRuta = () => new SimpleLineSymbol({ color: COLOR_RUTA, width: 3 });

export const simboloParada = () =>
  new SimpleMarkerSymbol({ style: "circle", color: [40, 40, 40], size: 10, outline: { color: "white", width: 2 } });

export const simboloTramoVelocidad = (clase: number) =>
  new SimpleLineSymbol({ color: CLASES_VELOCIDAD[clase].color, width: 5, cap: "round", join: "round" });

export const simboloTramoEstado = (indice: number) =>
  new SimpleLineSymbol({ color: colorEstado(indice), width: 14, cap: "butt", join: "round" });

export const simboloMovil = (kmh: number) =>
  new SimpleMarkerSymbol({ style: "circle", color: colorVelocidad(kmh), size: 18, outline: { color: "white", width: 3 } });

export const simboloCruce = (indice: number) =>
  new SimpleMarkerSymbol({ style: "diamond", color: colorEstado(indice), size: 18, outline: { color: "white", width: 2 } });

export const simboloEtiquetaCruce = (texto: string) =>
  new TextSymbol({
    text: texto,
    color: "#1f1f1f",
    haloColor: "white",
    haloSize: 2,
    xoffset: 14,
    horizontalAlignment: "left",
    font: { size: 11, weight: "bold" },
  });

export const simboloBuffer = () =>
  new SimpleFillSymbol({
    color: [0, 151, 167, 0.18],
    outline: { color: COLOR_BUFFER, width: 2, style: "dash" },
  });

export const simboloCondado = (resaltado = false) =>
  new SimpleFillSymbol({
    color: [216, 27, 96, resaltado ? 0.35 : 0.1],
    outline: { color: COLOR_CONDADO, width: resaltado ? 3 : 1.5 },
  });
