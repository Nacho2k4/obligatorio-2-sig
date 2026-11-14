import Point from "@arcgis/core/geometry/Point.js";
import { executeQueryJSON } from "@arcgis/core/rest/query.js";
import Query from "@arcgis/core/rest/support/Query.js";
import { SERVICIOS } from "../../../shared/config";
import type { ConsultarEstado } from "./StateTracker";

export const consultarEstadoEnPunto: ConsultarEstado = async ([x, y], signal) => {
  const resultado = await executeQueryJSON(
    SERVICIOS.condados,
    new Query({
      geometry: new Point({ x, y, spatialReference: { wkid: 4326 } }),
      spatialRelationship: "intersects",
      outFields: ["STATE_NAME", "STATE_ABBR"],
      returnGeometry: false,
    }),
    { signal },
  );
  const atributos = resultado.features[0]?.attributes;
  return atributos ? { nombre: atributos.STATE_NAME, abreviatura: atributos.STATE_ABBR } : null;
};
