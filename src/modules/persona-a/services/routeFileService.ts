import Polyline from "@arcgis/core/geometry/Polyline";
import type { RutaGuardada } from '../../../contracts/contracts';

const FORMATO = 'sig-ruta';
const VERSION = 1;

const nombreSeguro = (nombre: string): string =>
  nombre.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'ruta';

const esParadaValida = (p: any): boolean =>
  typeof p?.eventId === 'number' &&
  typeof p?.nombre === 'string' &&
  typeof p?.tipo === 'number' &&
  typeof p?.punto?.x === 'number' &&
  typeof p?.punto?.y === 'number';

/** Descarga la ruta como archivo .json (paradas + geometría calculada). */
export const exportarRutaArchivo = (ruta: RutaGuardada): void => {
  const contenido = {
    formato: FORMATO,
    version: VERSION,
    ruta: {
      ...ruta,
      geometria: ruta.geometria.toJSON()
    }
  };

  const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombreSeguro(ruta.nombre)}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
};

/** Lee y valida un archivo exportado con exportarRutaArchivo. Lanza Error con un mensaje legible. */
export const leerRutaDesdeArchivo = async (archivo: File): Promise<RutaGuardada> => {
  let datos: any;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  if (datos?.formato !== FORMATO || !datos.ruta) {
    throw new Error('El archivo no es una ruta exportada por esta aplicación.');
  }

  const r = datos.ruta;
  if (!Array.isArray(r.paradas) || r.paradas.length === 0 || !r.paradas.every(esParadaValida)) {
    throw new Error('El archivo no contiene paradas válidas.');
  }

  if (!r.geometria) {
    throw new Error('El archivo no contiene la geometría de la ruta.');
  }
  const geometria = Polyline.fromJSON(r.geometria);

  return {
    id: `ruta-${Date.now()}`,
    nombre: typeof r.nombre === 'string' && r.nombre.trim() ? r.nombre.trim() : 'Ruta importada',
    paradas: r.paradas.map((p: any) => ({
      eventId: p.eventId,
      objectId: p.objectId,
      nombre: p.nombre,
      tipo: p.tipo,
      punto: { x: p.punto.x, y: p.punto.y }
    })),
    geometria,
    creada: typeof r.creada === 'string' ? r.creada : new Date().toISOString()
  };
};
