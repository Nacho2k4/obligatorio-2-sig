import type { EventoParada } from "../../../contracts/contracts";

export type Coordenada = [lon: number, lat: number];

export interface Recorrido {
  puntos: Coordenada[];
  // distancia acumulada en km desde el inicio hasta cada punto
  acumuladoKm: number[];
  totalKm: number;
}

const RADIO_TIERRA_KM = 6371.0088;
const rad = (g: number) => (g * Math.PI) / 180;

// haversine: entre vértices densificados cada ~500 m el error frente a la geodésica es despreciable
export function distanciaKm([lon1, lat1]: Coordenada, [lon2, lat2]: Coordenada): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function crearRecorrido(puntos: Coordenada[]): Recorrido {
  if (puntos.length < 2) throw new Error("El recorrido necesita al menos dos puntos.");

  const acumuladoKm = [0];
  for (let i = 1; i < puntos.length; i++) {
    acumuladoKm.push(acumuladoKm[i - 1] + distanciaKm(puntos[i - 1], puntos[i]));
  }
  return { puntos, acumuladoKm, totalKm: acumuladoKm[acumuladoKm.length - 1] };
}

export function posicionEn(recorrido: Recorrido, km: number): Coordenada {
  const { puntos, acumuladoKm, totalKm } = recorrido;
  const d = Math.min(Math.max(km, 0), totalKm);

  // búsqueda binaria del último vértice con acumulado <= d
  let lo = 0;
  let hi = acumuladoKm.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (acumuladoKm[mid] <= d) lo = mid;
    else hi = mid;
  }

  const largo = acumuladoKm[hi] - acumuladoKm[lo];
  const t = largo > 0 ? (d - acumuladoKm[lo]) / largo : 0;
  const [x1, y1] = puntos[lo];
  const [x2, y2] = puntos[hi];
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

// cada parada se ubica sobre el recorrido en el vértice más cercano; devuelve km ordenados
export function ubicarParadas(recorrido: Recorrido, paradas: EventoParada[]): number[] {
  return paradas
    .map(({ punto }) => {
      let mejor = 0;
      let mejorDist = Infinity;
      recorrido.puntos.forEach((p, i) => {
        const d = distanciaKm(p, [punto.x, punto.y]);
        if (d < mejorDist) {
          mejorDist = d;
          mejor = i;
        }
      });
      return recorrido.acumuladoKm[mejor];
    })
    .sort((a, b) => a - b);
}

// porción del recorrido entre dos distancias, con los extremos interpolados
export function subRecorrido(recorrido: Recorrido, desdeKm: number, hastaKm: number): Coordenada[] {
  const a = Math.max(0, Math.min(desdeKm, hastaKm));
  const b = Math.min(recorrido.totalKm, Math.max(desdeKm, hastaKm));
  const puntos: Coordenada[] = [posicionEn(recorrido, a)];
  recorrido.acumuladoKm.forEach((km, i) => {
    if (km > a && km < b) puntos.push(recorrido.puntos[i]);
  });
  puntos.push(posicionEn(recorrido, b));
  return puntos;
}

// rumbo inicial de a hacia b, en grados desde el norte en sentido horario (0..360)
export function rumboGrados([lon1, lat1]: Coordenada, [lon2, lat2]: Coordenada): number {
  const dLon = rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// punto al que se llega saliendo de origen con ese rumbo y esa distancia, sobre la esfera
export function desplazar([lon, lat]: Coordenada, distancia: number, rumbo: number): Coordenada {
  const d = distancia / RADIO_TIERRA_KM;
  const r = rad(rumbo);
  const lat1 = rad(lat);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(r));
  const lon2 = rad(lon) + Math.atan2(Math.sin(r) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

// rumbo del recorrido en un km, mirando un tramo hacia atrás para que no tiemble entre vértices
export function rumboEn(recorrido: Recorrido, km: number, ventanaKm = 1): number {
  const desde = Math.max(0, Math.min(km - ventanaKm, recorrido.totalKm - ventanaKm));
  return rumboGrados(posicionEn(recorrido, desde), posicionEn(recorrido, Math.max(km, desde + ventanaKm)));
}
