// todos los números del panel con el mismo formato: coma decimal y punto de miles
const LOCALE = "es-UY";

const enteros = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const unDecimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dosDecimales = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const coordenada = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const porcentaje = new Intl.NumberFormat(LOCALE, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatoEntero = (n: number) => enteros.format(n);

export const formatoKm = (km: number) => `${unDecimal.format(km)} km`;

export const formatoKmh = (kmh: number) => `${enteros.format(kmh)} km/h`;

export const formatoSegundos = (ms: number) => `${dosDecimales.format(ms / 1000)} s`;

// con coma decimal "33,7, -97,1" se confunde, así que se usan hemisferios en vez de signo
export const formatoLatLon = (lat: number, lon: number) =>
  `${coordenada.format(Math.abs(lat))}° ${lat >= 0 ? "N" : "S"}, ${coordenada.format(Math.abs(lon))}° ${lon >= 0 ? "E" : "O"}`;

// por debajo de 0,1 % se muestra "< 0,1 %" en vez de un 0 que confunde con "no intercepta"
export function formatoPorcentaje(fraccion: number): string {
  if (fraccion > 0 && fraccion < 0.001) return `< ${porcentaje.format(0.001)}`;
  return porcentaje.format(fraccion);
}

export function formatoDuracion(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}
