import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-input-number";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-notice";
import "@esri/calcite-components/components/calcite-progress";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import { useEffect } from "react";
import { useAppStore } from "../../../shared/store";
import { controles, iniciarSimulacion } from "../services/SimulacionController";
import type { EstadoMotor } from "../services/SimulationEngine";
import { useSimulacionStore } from "../simulacionStore";
import "./SimulacionPanel.css";

const ESCALAS = [10, 30, 60, 120, 300];

const TEXTO_ESTADO: Record<EstadoMotor, string> = {
  detenido: "Detenida",
  reproduciendo: "En curso",
  pausado: "Pausada",
  finalizado: "Finalizada",
};

const formatoTiempo = (seg: number) => {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return `${h} h ${m.toString().padStart(2, "0")} min`;
};

const acotar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);

export function SimulacionPanel() {
  const rutaActiva = useAppStore((s) => s.rutaActiva);
  const { lectura, preparando, error, escalaTiempo, intervaloMs, semilla, estadoActual, avisoEstado } = useSimulacionStore();

  useEffect(() => iniciarSimulacion(), []);

  if (!rutaActiva) {
    return (
      <div className="panel-contenido">
        <calcite-notice open icon="information" width="full">
          <div slot="message">No hay ruta activa. Calculá o cargá una en la pestaña Rutas.</div>
        </calcite-notice>
      </div>
    );
  }

  const estado = lectura?.estado ?? "detenido";
  const listo = !!lectura && !preparando;

  return (
    <div className="panel-contenido">
      <div>
        <strong>{rutaActiva.nombre}</strong>
        <p className="texto-secundario">
          {rutaActiva.paradas.length} paradas
          {lectura && ` · ${lectura.distanciaTotalKm.toFixed(1)} km`}
        </p>
      </div>

      {error && (
        <calcite-notice open kind="danger" icon="exclamation-mark-triangle" width="full">
          <div slot="message">{error}</div>
        </calcite-notice>
      )}

      {avisoEstado && (
        <calcite-notice open kind="warning" icon="exclamation-mark-triangle" width="full" scale="s">
          <div slot="message">{avisoEstado}</div>
        </calcite-notice>
      )}

      <div className="sim-controles">
        {estado === "reproduciendo" ? (
          <calcite-button iconStart="pause" kind="neutral" onClick={controles.pausa} width="full">
            Pausa
          </calcite-button>
        ) : (
          <calcite-button
            iconStart="play"
            onClick={controles.play}
            disabled={!listo || estado === "finalizado"}
            loading={preparando}
            width="full"
          >
            Play
          </calcite-button>
        )}
        <calcite-button iconStart="reset" appearance="outline" onClick={controles.reset} disabled={!listo} width="full">
          Reset
        </calcite-button>
      </div>

      <calcite-progress value={(lectura?.progreso ?? 0) * 100} label="Progreso del recorrido" />

      <dl className="sim-datos">
        <dt>Simulación</dt>
        <dd>{TEXTO_ESTADO[estado]}</dd>
        <dt>Estado actual</dt>
        <dd>{estadoActual?.nombre ?? "—"}</dd>
        <dt>Velocidad</dt>
        <dd>{lectura ? `${lectura.velocidadKmh.toFixed(0)} km/h` : "—"}</dd>
        <dt>Distancia</dt>
        <dd>{lectura ? `${lectura.distanciaKm.toFixed(1)} / ${lectura.distanciaTotalKm.toFixed(1)} km` : "—"}</dd>
        <dt>Tiempo simulado</dt>
        <dd>{lectura ? formatoTiempo(lectura.tiempoSimuladoSeg) : "—"}</dd>
        <dt>Posición (lat, lon)</dt>
        <dd>{lectura ? `${lectura.posicion.y.toFixed(4)}, ${lectura.posicion.x.toFixed(4)}` : "—"}</dd>
      </dl>

      <calcite-label>
        Velocidad de reproducción (segundos simulados por segundo real)
        <calcite-segmented-control
          width="full"
          oncalciteSegmentedControlChange={(e) => controles.setEscalaTiempo(Number(e.target.value))}
        >
          {ESCALAS.map((x) => (
            <calcite-segmented-control-item key={x} value={String(x)} checked={x === escalaTiempo}>
              {x}×
            </calcite-segmented-control-item>
          ))}
        </calcite-segmented-control>
      </calcite-label>

      <div className="sim-config">
        <calcite-label>
          Intervalo de tick
          <calcite-input-number
            value={String(intervaloMs)}
            min={200}
            max={5000}
            step={100}
            integer
            suffixText="ms"
            oncalciteInputNumberChange={(e) => {
              const ms = Number(e.target.value);
              if (Number.isFinite(ms) && ms > 0) controles.setIntervaloMs(acotar(ms, 200, 5000));
            }}
          />
        </calcite-label>
        <calcite-label>
          Semilla
          <calcite-input-number
            value={String(semilla)}
            integer
            min={0}
            oncalciteInputNumberChange={(e) => {
              const s = Number(e.target.value);
              if (Number.isInteger(s) && s >= 0) controles.setSemilla(s);
            }}
          />
        </calcite-label>
      </div>
    </div>
  );
}
