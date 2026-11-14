import type Polygon from "@arcgis/core/geometry/Polygon.js";
import type { Condado } from "./CountyQueryService";
import type { ResumenPoblacion } from "./PopulationCalculator";
import type { Coordenada } from "./Recorrido";

// las tres etapas se inyectan (como interfaces en .net) para poder testear el pipeline sin red
export interface EtapasAnalisis {
  buffer(punto: Coordenada, radioKm: number, signal: AbortSignal): Promise<Polygon>;
  condados(buffer: Polygon, signal: AbortSignal): Promise<Condado[]>;
  poblacion(buffer: Polygon, condados: Condado[], signal: AbortSignal): Promise<ResumenPoblacion>;
}

export interface SolicitudAnalisis {
  punto: Coordenada;
  radioKm: number;
  km: number;
}

export interface TiemposAnalisis {
  bufferMs: number;
  condadosMs: number;
  poblacionMs: number;
  totalMs: number;
}

export interface ResultadoAnalisis {
  secuencia: number;
  solicitud: SolicitudAnalisis;
  buffer: Polygon;
  condados: Condado[];
  poblacion: ResumenPoblacion;
  tiempos: TiemposAnalisis;
}

export interface MetricasAnalisis {
  enCurso: boolean;
  completados: number;
  salteados: number;
  descartados: number;
  errores: number;
  // se vuelve a cero con el primer análisis que sale bien; sirve para distinguir un error aislado de un servidor caído
  erroresSeguidos: number;
  ultimosTiempos: TiemposAnalisis | null;
}

interface Oyentes {
  buffer?: (buffer: Polygon, solicitud: SolicitudAnalisis) => void;
  resultado?: (resultado: ResultadoAnalisis) => void;
  error?: (error: unknown) => void;
  metricas?: (metricas: MetricasAnalisis) => void;
}

const METRICAS_INICIALES: MetricasAnalisis = {
  enCurso: false,
  completados: 0,
  salteados: 0,
  descartados: 0,
  errores: 0,
  erroresSeguidos: 0,
  ultimosTiempos: null,
};

// buffer → condados → intersect → población, con nunca más de un análisis en vuelo.
// si llega una solicitud con uno en curso se saltea, pero se guarda la última para analizarla al terminar
export class AnalysisPipeline {
  private readonly etapas: EtapasAnalisis;
  private readonly oyentes: Oyentes;
  private readonly ahora: () => number;
  private controller = new AbortController();
  private secuencia = 0;
  // sube al invalidar; un análisis que termina con otra generación quedó viejo y se descarta
  private generacion = 0;
  private pendiente: SolicitudAnalisis | null = null;
  private metricas: MetricasAnalisis = { ...METRICAS_INICIALES };

  constructor(etapas: EtapasAnalisis, oyentes: Oyentes = {}, ahora: () => number = () => performance.now()) {
    this.etapas = etapas;
    this.oyentes = oyentes;
    this.ahora = ahora;
  }

  get estado(): Readonly<MetricasAnalisis> {
    return this.metricas;
  }

  solicitar(solicitud: SolicitudAnalisis): void {
    if (this.metricas.enCurso) {
      this.pendiente = solicitud;
      this.actualizarMetricas({ salteados: this.metricas.salteados + 1 });
      return;
    }
    void this.ejecutar(solicitud);
  }

  // corta el análisis en vuelo y descarta lo pendiente; se usa en reset, cambio de ruta o de radio
  invalidar(): void {
    this.controller.abort();
    this.controller = new AbortController();
    this.generacion++;
    this.pendiente = null;
    if (this.metricas.enCurso) {
      this.actualizarMetricas({ enCurso: false, descartados: this.metricas.descartados + 1 });
    }
  }

  reiniciarMetricas(): void {
    this.metricas = { ...METRICAS_INICIALES, enCurso: this.metricas.enCurso };
    this.oyentes.metricas?.(this.metricas);
  }

  private async ejecutar(solicitud: SolicitudAnalisis): Promise<void> {
    const secuencia = ++this.secuencia;
    const generacion = this.generacion;
    const signal = this.controller.signal;
    const vigente = () => generacion === this.generacion && !signal.aborted;
    this.actualizarMetricas({ enCurso: true });

    const inicio = this.ahora();
    try {
      const buffer = await this.etapas.buffer(solicitud.punto, solicitud.radioKm, signal);
      const finBuffer = this.ahora();
      if (!vigente()) return;
      this.oyentes.buffer?.(buffer, solicitud);

      const condados = await this.etapas.condados(buffer, signal);
      const finCondados = this.ahora();
      if (!vigente()) return;

      const poblacion = await this.etapas.poblacion(buffer, condados, signal);
      const fin = this.ahora();
      if (!vigente()) return;

      const tiempos = {
        bufferMs: finBuffer - inicio,
        condadosMs: finCondados - finBuffer,
        poblacionMs: fin - finCondados,
        totalMs: fin - inicio,
      };
      this.metricas = { ...this.metricas, completados: this.metricas.completados + 1, erroresSeguidos: 0, ultimosTiempos: tiempos };
      this.oyentes.resultado?.({ secuencia, solicitud, buffer, condados, poblacion, tiempos });
    } catch (error) {
      if (!vigente()) return;
      // un error de red no frena la simulación: se avisa y el próximo tick vuelve a intentar
      this.metricas = {
        ...this.metricas,
        errores: this.metricas.errores + 1,
        erroresSeguidos: this.metricas.erroresSeguidos + 1,
      };
      this.oyentes.error?.(error);
    } finally {
      if (generacion === this.generacion) {
        this.actualizarMetricas({ enCurso: false });
        const siguiente = this.pendiente;
        this.pendiente = null;
        if (siguiente) void this.ejecutar(siguiente);
      }
    }
  }

  private actualizarMetricas(cambios: Partial<MetricasAnalisis>): void {
    this.metricas = { ...this.metricas, ...cambios };
    this.oyentes.metricas?.(this.metricas);
  }
}
