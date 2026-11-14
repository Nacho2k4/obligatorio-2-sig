import { useEffect } from "react";
import type { ResumenPoblacion } from "../services/PopulationCalculator";
import { controles } from "../services/SimulacionController";
import { formatoEntero, formatoPorcentaje } from "./formato";

interface Props {
  poblacion: ResumenPoblacion;
}

// pasar el mouse por una fila resalta el condado en el mapa; click o enter hace zoom
export function TablaCondados({ poblacion }: Props) {
  useEffect(() => () => controles.resaltarCondado(null), []);

  if (poblacion.condados.length === 0) {
    return <p className="texto-secundario">El buffer no intercepta ningún condado.</p>;
  }

  return (
    <table className="sim-tabla">
      <caption className="texto-secundario">Pasá el mouse por una fila para verlo en el mapa; click para acercar.</caption>
      <thead>
        <tr>
          <th scope="col">Condado</th>
          <th scope="col">Población</th>
          <th scope="col">% cubierto</th>
          <th scope="col">En buffer</th>
        </tr>
      </thead>
      <tbody>
        {poblacion.condados.map((c) => (
          <tr
            key={c.objectId}
            tabIndex={0}
            onMouseEnter={() => controles.resaltarCondado(c.objectId)}
            onMouseLeave={() => controles.resaltarCondado(null)}
            onFocus={() => controles.resaltarCondado(c.objectId)}
            onBlur={() => controles.resaltarCondado(null)}
            onClick={() => controles.enfocarCondado(c.objectId)}
            onKeyDown={(e) => {
              if (e.key === "Enter") controles.enfocarCondado(c.objectId);
            }}
          >
            <th scope="row">
              {c.nombre}
              <span className="texto-secundario">{c.estado}</span>
            </th>
            <td>{formatoEntero(c.poblacion)}</td>
            <td>
              <span className="sim-barra" style={{ width: `${c.porcentaje * 100}%` }} />
              {formatoPorcentaje(c.porcentaje)}
            </td>
            <td>{formatoEntero(c.poblacionPonderada)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td>{formatoEntero(poblacion.condados.reduce((s, c) => s + c.poblacion, 0))}</td>
          <td />
          <td>{formatoEntero(poblacion.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
