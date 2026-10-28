import { solve } from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";

const ROUTE_URL = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

export const probarRuteo = async () => {
  try {
    // Puntos de prueba en EE. UU. (Dallas y Oklahoma City)
    const puntoA = new Graphic({ geometry: new Point({ x: -96.7970, y: 32.7767 }) });
    const puntoB = new Graphic({ geometry: new Point({ x: -97.5164, y: 35.4676 }) });

    const routeParams = new RouteParameters({
      stops: new FeatureSet({ features: [puntoA, puntoB] }),
      returnRoutes: true,
      outSpatialReference: { wkid: 4326 }
    });

    const resultado = await solve(ROUTE_URL, routeParams);
    console.log("🛣️ Ruta calculada:", resultado.routeResults[0].route);
    return resultado.routeResults[0].route;
  } catch (error) {
    console.error("❌ Error en Ruteo:", error);
  }
};