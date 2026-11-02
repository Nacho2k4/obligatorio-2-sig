import type { RutaGuardada } from '../../../contracts/contracts';
import Polyline from "@arcgis/core/geometry/Polyline";

const STORAGE_KEY = 'sig_rutas_guardadas';

export const guardarRuta = (nuevaRuta: RutaGuardada): void => {
  try {
    const rutasExistentes = obtenerRutas();
    rutasExistentes.push(nuevaRuta);
    
    const rutasParaGuardar = rutasExistentes.map(ruta => ({
      ...ruta,
      geometria: ruta.geometria ? ruta.geometria.toJSON() : undefined
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(rutasParaGuardar));
    console.log("Ruta guardada exitosamente en LocalStorage");
  } catch (error) {
    console.error("Error al guardar la ruta:", error);
  }
};

export const obtenerRutas = (): RutaGuardada[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const rutasParseadas = JSON.parse(data);
    
    return rutasParseadas.map((ruta: any) => ({
      ...ruta,
      geometria: ruta.geometria ? Polyline.fromJSON(ruta.geometria) : undefined
    }));
  } catch (error) {
    console.error("Error al obtener las rutas:", error);
    return [];
  }
};