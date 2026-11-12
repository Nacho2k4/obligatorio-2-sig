import "@esri/calcite-components/components/calcite-notice";
import { diagnosticarAnalisis } from "../services/diagnosticoAnalisis";
import { useSimulacionStore } from "../simulacionStore";
import { formatoEntero, formatoKm, formatoSegundos } from "./formato";
import { TablaCondados } from "./TablaCondados";

// a partir de esta distancia vale la pena avisar que el análisis mostrado quedó atrás del móvil
const RETRASO_VISIBLE_KM = 1;

export function AnalisisBuffer() {
  const analisis = useSimulacionStore((s) => s.analisis);
  const metricas = useSimulacionStore((s) => s.metricasAnalisis);
  const aviso = useSimulacionStore((s) => s.avisoAnalisis);
  const intervaloMs = useSimulacionStore((s) => s.intervaloMs);
  const kmMovil = useSimulacionStore((s) => s.lectura?.distanciaKm ?? 0);
  const reproduciendo = useSimulacionStore((s) => s.lectura?.estado === "reproduciendo");

  const diagnostico = diagnosticarAnalisis(metricas, intervaloMs, reproduciendo);
  const retrasoKm = analisis ? kmMovil - analisis.km : 0;
  const tiempos = metricas?.ultimosTiempos;
  const totalTicks = metricas ? metricas.salteados + metricas.completados + metricas.errores : 0;

  return (
    <>
      {diagnostico ? (
        <calcite-notice open kind={diagnostico.nivel} icon="exclamation-mark-triangle" width="full" scale="s">
          <div slot="title">{diagnostico.titulo}</div>
          <div slot="message">{diagnostico.mensaje}</div>
        </calcite-notice>
      ) : (
        aviso && (
          <calcite-notice open kind="warning" icon="exclamation-mark-triangle" width="full" scale="s">
            <div slot="message">{aviso}</div>
          </calcite-notice>
        )
      )}

      <div className="sim-poblacion">
        <span className="sim-poblacion-valor">{analisis ? formatoEntero(analisis.poblacion.total) : "—"}</span>
        <span className="texto-secundario">
          habitantes estimados en {analisis ? `${analisis.poblacion.condados.length} ${analisis.poblacion.condados.length === 1 ? "condado" : "condados"}` : "el buffer"}
        </span>
      </div>

      <dl className="sim-datos">
        <dt>Analizado en</dt>
        <dd>
          {analisis ? `${formatoKm(analisis.km)} del recorrido` : metricas?.enCurso ? "calculando…" : "—"}
          {retrasoKm >= RETRASO_VISIBLE_KM && <span className="sim-retraso"> · {formatoKm(retrasoKm)} detrás</span>}
        </dd>
        <dt>Último análisis</dt>
        <dd>
          {tiempos ? formatoSegundos(tiempos.totalMs) : "—"}
        </dd>
        {tiempos && (
          <>
            <dt className="sim-detalle">buffer · condados · intersect</dt>
            <dd className="sim-detalle">
              {formatoSegundos(tiempos.bufferMs)} · {formatoSegundos(tiempos.condadosMs)} · {formatoSegundos(tiempos.poblacionMs)}
            </dd>
          </>
        )}
        <dt>Ticks salteados</dt>
        <dd>{metricas ? `${metricas.salteados} de ${totalTicks}` : "—"}</dd>
        {!!metricas?.errores && (
          <>
            <dt>Errores</dt>
            <dd>{metricas.errores}</dd>
          </>
        )}
      </dl>

      {analisis && <TablaCondados poblacion={analisis.poblacion} />}
    </>
  );
}
