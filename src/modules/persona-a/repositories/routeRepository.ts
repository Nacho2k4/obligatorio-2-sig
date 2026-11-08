import type { RutaGuardada } from '../../../contracts/contracts';
import Polyline from "@arcgis/core/geometry/Polyline";

const STORAGE_KEY = 'sig_rutas_guardadas';

const persistirRutas = (rutas: RutaGuardada[]): void => {
  const rutasParaGuardar = rutas.map(ruta => ({
    ...ruta,
    geometria: ruta.geometria.toJSON()
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(rutasParaGuardar));
};

export const guardarRuta = (nuevaRuta: RutaGuardada): void => {
  try {
    const rutasExistentes = obtenerRutas();
    rutasExistentes.push(nuevaRuta);
    
    persistirRutas(rutasExistentes);
    console.log("Ruta guardada exitosamente en LocalStorage");
  } catch (error) {
    console.error("Error al guardar la ruta:", error);
  }
};

export const eliminarRuta = (id: string): void => {
  try {
    const restantes = obtenerRutas().filter((ruta) => ruta.id !== id);
    persistirRutas(restantes);
    console.log("Ruta eliminada de LocalStorage");
  } catch (error) {
    console.error("Error al eliminar la ruta:", error);
  }
};

export const obtenerRutas = (): RutaGuardada[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const rutasParseadas: (Omit<RutaGuardada, 'geometria'> & { geometria?: object })[] = JSON.parse(data);
    
    // las rutas sin geometría no se pueden simular, así que se descartan
    return rutasParseadas
      .filter((ruta) => ruta.geometria)
      .map((ruta) => ({
        ...ruta,
        geometria: Polyline.fromJSON(ruta.geometria)
      }));
  } catch (error) {
    console.error("Error al obtener las rutas:", error);
    return [];
  }
};
