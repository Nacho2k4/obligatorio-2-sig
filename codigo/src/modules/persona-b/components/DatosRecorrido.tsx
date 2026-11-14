import type { EstadoMotor } from "../services/SimulationEngine";
import { useSimulacionStore } from "../simulacionStore";
import { colorVelocidad } from "../symbology/SymbologyFactory";
import { formatoDuracion, formatoKm, formatoKmh, formatoLatLon } from "./formato";

const TEXTO_ESTADO: Record<EstadoMotor, string> = {
  detenido: "Detenida",
  reproduciendo: "En curso",
  pausado: "Pausada",
  finalizado: "Finalizada",
};

export function DatosRecorrido() {
  const lectura = useSimulacionStore((s) => s.lectura);
  const estadoActual = useSimulacionStore((s) => s.estadoActual);

  return (
    <dl className="sim-datos">
      <dt>Simulación</dt>
      <dd>{TEXTO_ESTADO[lectura?.estado ?? "detenido"]}</dd>
      <dt>Estado actual</dt>
      <dd>{estadoActual?.nombre ?? "—"}</dd>
      <dt>Velocidad</dt>
      <dd>
        {lectura ? (
          <>
            <span className="sim-punto-color" style={{ background: colorVelocidad(lectura.velocidadKmh) }} />
            {formatoKmh(lectura.velocidadKmh)}
          </>
        ) : (
          "—"
        )}
      </dd>
      <dt>Distancia</dt>
      <dd>{lectura ? `${formatoKm(lectura.distanciaKm)} de ${formatoKm(lectura.distanciaTotalKm)}` : "—"}</dd>
      <dt>Tiempo simulado</dt>
      <dd>{lectura ? formatoDuracion(lectura.tiempoSimuladoSeg) : "—"}</dd>
      <dt>Posición</dt>
      <dd>{lectura ? formatoLatLon(lectura.posicion.y, lectura.posicion.x) : "—"}</dd>
    </dl>
  );
}
