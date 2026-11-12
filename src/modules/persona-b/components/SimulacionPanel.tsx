import "@esri/calcite-components/components/calcite-block";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-notice";
import { useEffect } from "react";
import { useAppStore } from "../../../shared/store";
import { controles, iniciarSimulacion } from "../services/SimulacionController";
import { useSimulacionStore } from "../simulacionStore";
import { AnalisisBuffer } from "./AnalisisBuffer";
import { ConfiguracionSimulacion } from "./ConfiguracionSimulacion";
import { ControlesSimulacion } from "./ControlesSimulacion";
import { DatosRecorrido } from "./DatosRecorrido";
import { formatoDuracion, formatoKm } from "./formato";
import "./SimulacionPanel.css";

export function SimulacionPanel() {
  const rutaActiva = useAppStore((s) => s.rutaActiva);
  const error = useSimulacionStore((s) => s.error);
  const avisoEstado = useSimulacionStore((s) => s.avisoEstado);
  const radioBufferKm = useSimulacionStore((s) => s.radioBufferKm);
  const totalKm = useSimulacionStore((s) => s.lectura?.distanciaTotalKm);
  const finalizada = useSimulacionStore((s) => s.lectura?.estado === "finalizado");
  const tiempoTotal = useSimulacionStore((s) => s.lectura?.tiempoSimuladoSeg ?? 0);

  useEffect(() => iniciarSimulacion(), []);

  if (!rutaActiva) {
    return (
      <div className="panel-contenido">
        <calcite-notice open icon="information" width="full">
          <div slot="title">No hay ruta activa</div>
          <div slot="message">Calculá o cargá una ruta en la pestaña Rutas para simular el recorrido.</div>
        </calcite-notice>
      </div>
    );
  }

  return (
    <div className="panel-contenido sim-panel">
      <div>
        <strong>{rutaActiva.nombre}</strong>
        <p className="texto-secundario">
          {rutaActiva.paradas.length} paradas
          {totalKm !== undefined && ` · ${formatoKm(totalKm)}`}
        </p>
      </div>

      {error && (
        <calcite-notice open kind="danger" icon="exclamation-mark-triangle" width="full">
          <div slot="message">{error}</div>
          <calcite-button slot="actions-end" appearance="transparent" kind="danger" iconStart="refresh" onClick={() => void controles.reintentar()}>
            Reintentar
          </calcite-button>
        </calcite-notice>
      )}

      {finalizada && totalKm !== undefined && (
        <calcite-notice open kind="success" icon="check-circle" width="full" scale="s">
          <div slot="message">
            Recorrido completo: {formatoKm(totalKm)} en {formatoDuracion(tiempoTotal)} simulados. Reset para volver a empezar.
          </div>
        </calcite-notice>
      )}

      {avisoEstado && (
        <calcite-notice open kind="warning" icon="exclamation-mark-triangle" width="full" scale="s">
          <div slot="message">{avisoEstado}</div>
        </calcite-notice>
      )}

      <calcite-block heading="Recorrido" iconStart="car" expanded>
        <div className="sim-bloque">
          <ControlesSimulacion />
          <DatosRecorrido />
        </div>
      </calcite-block>

      <calcite-block
        heading={`Buffer de ${radioBufferKm} km`}
        description="Condados interceptados y población estimada"
        iconStart="buffer-polygon"
        expandable
        expanded
      >
        <div className="sim-bloque">
          <AnalisisBuffer />
        </div>
      </calcite-block>

      <calcite-block heading="Configuración" iconStart="gear" expandable>
        <div className="sim-bloque">
          <ConfiguracionSimulacion />
        </div>
      </calcite-block>
    </div>
  );
}
