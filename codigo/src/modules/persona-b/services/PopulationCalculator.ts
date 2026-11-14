import type Polygon from "@arcgis/core/geometry/Polygon.js";
import type { GeometryUnion } from "@arcgis/core/geometry/types.js";
import type { Condado } from "./CountyQueryService";

export interface AreasCondado {
  objectId: number;
  nombre: string;
  estado: string;
  poblacion: number;
  areaCondadoKm2: number;
  areaInterseccionKm2: number;
}

export interface PoblacionCondado extends AreasCondado {
  // fracción del condado que cae dentro del buffer, entre 0 y 1
  porcentaje: number;
  poblacionPonderada: number;
}

export interface ResumenPoblacion {
  condados: PoblacionCondado[];
  total: number;
}

// supone población uniforme dentro de cada condado: la población en el buffer es proporcional al área cubierta
export function ponderarPoblacion(entradas: AreasCondado[]): ResumenPoblacion {
  const condados = entradas
    .map((c) => {
      const porcentaje = c.areaCondadoKm2 > 0 ? Math.min(Math.max(c.areaInterseccionKm2 / c.areaCondadoKm2, 0), 1) : 0;
      const poblacion = Number.isFinite(c.poblacion) ? Math.max(c.poblacion, 0) : 0;
      return { ...c, poblacion, porcentaje, poblacionPonderada: poblacion * porcentaje };
    })
    .sort((a, b) => b.poblacionPonderada - a.poblacionPonderada);

  return { condados, total: condados.reduce((suma, c) => suma + c.poblacionPonderada, 0) };
}

export type Intersectar = (geometrias: Polygon[], buffer: Polygon, signal: AbortSignal) => Promise<(GeometryUnion | null | undefined)[]>;
export type MedirAreaKm2 = (geometria: GeometryUnion | null | undefined) => number;

// las dos áreas se miden con la misma función sobre la misma geometría (la generalizada que vino de la query),
// así el error de la generalización se cancela en el cociente
export class PopulationCalculator {
  private readonly intersectar: Intersectar;
  private readonly medirArea: MedirAreaKm2;
  private readonly prepararArea: () => Promise<void>;

  constructor(intersectar: Intersectar, medirArea: MedirAreaKm2, prepararArea: () => Promise<void> = async () => {}) {
    this.intersectar = intersectar;
    this.medirArea = medirArea;
    this.prepararArea = prepararArea;
  }

  async calcular(buffer: Polygon, condados: Condado[], signal: AbortSignal): Promise<ResumenPoblacion> {
    if (condados.length === 0) return { condados: [], total: 0 };

    const [intersecciones] = await Promise.all([
      this.intersectar(
        condados.map((c) => c.geometria),
        buffer,
        signal,
      ),
      this.prepararArea(),
    ]);

    return ponderarPoblacion(
      condados.map((c, i) => ({
        objectId: c.objectId,
        nombre: c.nombre,
        estado: c.estado,
        poblacion: c.poblacion,
        areaCondadoKm2: this.medirArea(c.geometria),
        areaInterseccionKm2: this.medirArea(intersecciones[i]),
      })),
    );
  }
}
