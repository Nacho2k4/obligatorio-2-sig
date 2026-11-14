import type { MetricasAnalisis } from "./AnalysisPipeline";

export interface Diagnostico {
  nivel: "danger" | "warning";
  titulo: string;
  mensaje: string;
}

export const ERRORES_SEGUIDOS_CRITICOS = 3;

// traduce las métricas del pipeline a un consejo para el usuario; la letra sugiere mover el móvil
// más lento o en pasos más grandes cuando el servidor no da abasto
// la lentitud solo importa mientras el móvil avanza; un servidor caído se avisa siempre
export function diagnosticarAnalisis(
  metricas: MetricasAnalisis | null,
  intervaloMs: number,
  reproduciendo = true,
): Diagnostico | null {
  if (!metricas) return null;

  if (metricas.erroresSeguidos >= ERRORES_SEGUIDOS_CRITICOS) {
    return {
      nivel: "danger",
      titulo: "El servidor no responde",
      mensaje: `Fallaron los últimos ${metricas.erroresSeguidos} análisis. La simulación sigue y se reintenta en cada tick; revisá la conexión.`,
    };
  }

  const tiempos = metricas.ultimosTiempos;
  if (reproduciendo && tiempos && tiempos.totalMs > intervaloMs) {
    const posicionesPorAnalisis = Math.ceil(tiempos.totalMs / intervaloMs);
    return {
      nivel: "warning",
      titulo: "El análisis tarda más que un tick",
      mensaje:
        `Tarda ${(tiempos.totalMs / 1000).toFixed(1).replace(".", ",")} s y el tick es de ${(intervaloMs / 1000).toFixed(1).replace(".", ",")} s, ` +
        `así que se analiza 1 de cada ${posicionesPorAnalisis} posiciones. Para que el buffer siga más de cerca al móvil, ` +
        `subí el intervalo de tick o bajá la velocidad de reproducción.`,
    };
  }

  return null;
}
