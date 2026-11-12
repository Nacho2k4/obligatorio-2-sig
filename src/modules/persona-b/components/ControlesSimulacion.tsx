import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-progress";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import { controles } from "../services/SimulacionController";
import { useSimulacionStore } from "../simulacionStore";

const ESCALAS = [10, 30, 60, 120, 300];

export function ControlesSimulacion() {
  const lectura = useSimulacionStore((s) => s.lectura);
  const preparando = useSimulacionStore((s) => s.preparando);
  const escalaTiempo = useSimulacionStore((s) => s.escalaTiempo);

  const estado = lectura?.estado ?? "detenido";
  const listo = !!lectura && !preparando;

  return (
    <>
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
            {estado === "pausado" ? "Continuar" : "Play"}
          </calcite-button>
        )}
        <calcite-button iconStart="reset" appearance="outline" onClick={controles.reset} disabled={!listo} width="full">
          Reset
        </calcite-button>
      </div>

      <calcite-progress value={(lectura?.progreso ?? 0) * 100} label="Progreso del recorrido" />

      <calcite-label scale="s">
        Velocidad de reproducción (segundos simulados por segundo real)
        <calcite-segmented-control
          width="full"
          scale="s"
          disabled={preparando}
          oncalciteSegmentedControlChange={(e) => controles.setEscalaTiempo(Number(e.target.value))}
        >
          {ESCALAS.map((x) => (
            <calcite-segmented-control-item key={x} value={String(x)} checked={x === escalaTiempo}>
              {x}×
            </calcite-segmented-control-item>
          ))}
        </calcite-segmented-control>
      </calcite-label>
    </>
  );
}
