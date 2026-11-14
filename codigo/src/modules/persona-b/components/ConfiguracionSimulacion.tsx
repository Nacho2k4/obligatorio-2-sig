import "@esri/calcite-components/components/calcite-input-number";
import "@esri/calcite-components/components/calcite-label";
import { controles } from "../services/SimulacionController";
import { useSimulacionStore } from "../simulacionStore";

const acotar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);

export function ConfiguracionSimulacion() {
  const intervaloMs = useSimulacionStore((s) => s.intervaloMs);
  const radioBufferKm = useSimulacionStore((s) => s.radioBufferKm);
  const semilla = useSimulacionStore((s) => s.semilla);
  const preparando = useSimulacionStore((s) => s.preparando);

  return (
    <div className="sim-config">
      <calcite-label scale="s">
        Radio del buffer
        <calcite-input-number
          value={String(radioBufferKm)}
          min={1}
          max={200}
          step={5}
          suffixText="km"
          scale="s"
          disabled={preparando}
          oncalciteInputNumberChange={(e) => {
            const km = Number(e.target.value);
            if (Number.isFinite(km) && km > 0 && km !== radioBufferKm) controles.setRadioBufferKm(acotar(km, 1, 200));
          }}
        />
      </calcite-label>
      <calcite-label scale="s">
        Intervalo de tick
        <calcite-input-number
          value={String(intervaloMs)}
          min={200}
          max={5000}
          step={100}
          integer
          suffixText="ms"
          scale="s"
          oncalciteInputNumberChange={(e) => {
            const ms = Number(e.target.value);
            if (Number.isFinite(ms) && ms > 0) controles.setIntervaloMs(acotar(ms, 200, 5000));
          }}
        />
      </calcite-label>
      <calcite-label scale="s">
        Semilla del perfil de velocidad
        <calcite-input-number
          value={String(semilla)}
          integer
          min={0}
          scale="s"
          disabled={preparando}
          oncalciteInputNumberChange={(e) => {
            const s = Number(e.target.value);
            if (Number.isInteger(s) && s >= 0 && s !== semilla) controles.setSemilla(s);
          }}
        />
      </calcite-label>
      <p className="texto-secundario sim-config-nota">
        La misma semilla repite exactamente el mismo recorrido; cambiarla reinicia la simulación.
      </p>
    </div>
  );
}
