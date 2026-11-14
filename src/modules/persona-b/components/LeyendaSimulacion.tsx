import { useAppStore } from "../../../shared/store";
import { useSimulacionStore } from "../simulacionStore";
import { CLASES_VELOCIDAD, COLOR_BUFFER, COLOR_CONDADO, COLOR_RUTA, PALETA_ESTADOS, colorEstado } from "../symbology/SymbologyFactory";
import "./LeyendaSimulacion.css";

export function LeyendaSimulacion() {
  const rutaActiva = useAppStore((s) => s.rutaActiva);
  const tramos = useSimulacionStore((s) => s.tramosEstado);
  const radioKm = useSimulacionStore((s) => s.radioBufferKm);
  if (!rutaActiva) return null;

  return (
    <div slot="bottom-right" className="leyenda-sim">
      <h3>Velocidad</h3>
      <p>Línea fina del tramo recorrido y color del móvil</p>
      <ul>
        {CLASES_VELOCIDAD.map((c) => (
          <li key={c.etiqueta}>
            <span className="muestra-linea" style={{ background: c.color }} />
            {c.etiqueta}
          </li>
        ))}
      </ul>

      <h3>Estado</h3>
      <p>Franja ancha debajo; el color alterna al cambiar de Estado</p>
      <ul>
        {tramos.length > 0
          ? tramos.map((t) => (
              <li key={`${t.estado.abreviatura}-${t.desdeKm}`}>
                <span className="muestra-franja" style={{ background: colorEstado(t.indiceColor) }} />
                {t.estado.nombre}
              </li>
            ))
          : PALETA_ESTADOS.map((color, i) => (
              <li key={color}>
                <span className="muestra-franja" style={{ background: color }} />
                Estado {i + 1}
              </li>
            ))}
        <li>
          <span className="muestra-rombo" style={{ background: colorEstado(1) }} />
          Cruce de frontera
        </li>
      </ul>

      <h3>Análisis</h3>
      <ul>
        <li>
          <span className="muestra-area muestra-area--punteada" style={{ borderColor: COLOR_BUFFER, background: "rgba(0, 151, 167, 0.18)" }} />
          Buffer de {radioKm} km
        </li>
        <li>
          <span className="muestra-area" style={{ borderColor: COLOR_CONDADO, background: "rgba(216, 27, 96, 0.1)" }} />
          Condado interceptado
        </li>
      </ul>

      <h3>Ruta</h3>
      <ul>
        <li>
          <span className="muestra-linea" style={{ background: COLOR_RUTA }} />
          Ruta completa
        </li>
        <li>
          <span className="muestra-punto" />
          Parada
        </li>
      </ul>
    </div>
  );
}
