import * as geodeticAreaOperator from "@arcgis/core/geometry/operators/geodeticAreaOperator.js";
import { intersect } from "@arcgis/core/rest/geometryService.js";
import { PopulationCalculator } from "./PopulationCalculator";

// arma el calculador real: intersect en el geometryserver y área geodésica local para las dos áreas
export function crearPopulationCalculator(urlGeometryServer: string): PopulationCalculator {
  return new PopulationCalculator(
    (geometrias, buffer, signal) => intersect(urlGeometryServer, geometrias, buffer, { signal }),
    (geometria) => {
      if (geometria?.type !== "polygon" || geometria.rings.length === 0) return 0;
      return geodeticAreaOperator.execute(geometria, { unit: "square-kilometers" });
    },
    async () => {
      if (!geodeticAreaOperator.isLoaded()) await geodeticAreaOperator.load();
    },
  );
}
