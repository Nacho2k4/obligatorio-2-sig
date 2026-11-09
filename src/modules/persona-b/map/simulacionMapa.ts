import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import type { RutaGuardada } from "../../../contracts/contracts";
import { capas } from "../../../shared/map/capas";
import { obtenerVista } from "../../../shared/map/vista";
import { subRecorrido, type Coordenada, type Recorrido } from "../services/Recorrido";
import type { LecturaGps } from "../services/SimulationEngine";
import type { CambioEstado, TramoEstado } from "../services/StateTracker";
import {
  claseVelocidad,
  simboloCruce,
  simboloEtiquetaCruce,
  simboloMovil,
  simboloParada,
  simboloRuta,
  simboloTramoEstado,
  simboloTramoVelocidad,
} from "../symbology/SymbologyFactory";

const WGS84 = { wkid: 4326 };
const punto = ([x, y]: Coordenada) => new Point({ x, y, spatialReference: WGS84 });
const linea = (puntos: Coordenada[]) => new Polyline({ paths: [puntos], spatialReference: WGS84 });

// los gráficos vivos se guardan por referencia y solo se les cambia la geometría
const movil = new Graphic();
let claseMovil = -1;
let tramoVelocidad: { grafico: Graphic; clase: number; puntos: Coordenada[] } | null = null;
const graficosEstado: Graphic[] = [];

export function mostrarRuta(ruta: RutaGuardada): void {
  capas.ruta.removeAll();
  capas.ruta.add(new Graphic({ geometry: ruta.geometria, symbol: simboloRuta() }));
  capas.ruta.addMany(
    ruta.paradas.map(
      (p) => new Graphic({ geometry: punto([p.punto.x, p.punto.y]), symbol: simboloParada(), attributes: { nombre: p.nombre } }),
    ),
  );

  const extent = ruta.geometria.extent;
  if (extent) obtenerVista()?.goTo(extent.clone().expand(1.3)).catch(() => {});
}

export function moverMovil({ posicion, velocidadKmh }: LecturaGps): void {
  movil.geometry = punto([posicion.x, posicion.y]);
  const clase = claseVelocidad(velocidadKmh);
  if (clase !== claseMovil) {
    movil.symbol = simboloMovil(velocidadKmh);
    claseMovil = clase;
  }
  if (!capas.movil.graphics.includes(movil)) capas.movil.add(movil);
}

// mientras la velocidad no cambia de rango se estira el mismo segmento en vez de agregar uno nuevo
export function dibujarAvance(puntos: Coordenada[], velocidadKmh: number): void {
  const clase = claseVelocidad(velocidadKmh);
  if (tramoVelocidad && tramoVelocidad.clase === clase) {
    tramoVelocidad.puntos.push(...puntos.slice(1));
    tramoVelocidad.grafico.geometry = linea(tramoVelocidad.puntos);
    return;
  }
  const grafico = new Graphic({ geometry: linea(puntos), symbol: simboloTramoVelocidad(clase) });
  tramoVelocidad = { grafico, clase, puntos: [...puntos] };
  capas.velocidad.add(grafico);
}

export function dibujarTramosEstado(tramos: TramoEstado[], recorrido: Recorrido): void {
  tramos.forEach((tramo, i) => {
    let grafico = graficosEstado[i];
    if (!grafico) {
      grafico = new Graphic({ symbol: simboloTramoEstado(tramo.indiceColor), attributes: { estado: tramo.estado.nombre } });
      graficosEstado[i] = grafico;
      capas.estados.graphics.add(grafico, 0);
    }
    grafico.geometry = linea(subRecorrido(recorrido, tramo.desdeKm, tramo.hastaKm));
  });
}

export function marcarCruce(cambio: CambioEstado): void {
  const geometry = punto(cambio.posicion);
  const attributes = { de: cambio.de.nombre, a: cambio.a.nombre, km: cambio.km };
  capas.estados.addMany([
    new Graphic({ geometry, symbol: simboloCruce(cambio.indiceColor), attributes }),
    new Graphic({ geometry, symbol: simboloEtiquetaCruce(`${cambio.de.abreviatura} → ${cambio.a.abreviatura}`), attributes }),
  ]);
}

export function limpiarRecorrido(): void {
  capas.velocidad.removeAll();
  capas.estados.removeAll();
  tramoVelocidad = null;
  graficosEstado.length = 0;
}

export function limpiarSimulacion(): void {
  capas.ruta.removeAll();
  capas.movil.removeAll();
  limpiarRecorrido();
}
