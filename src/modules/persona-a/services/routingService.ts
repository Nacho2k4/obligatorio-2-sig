import { solve } from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import type { EventoParada } from "../../../contracts/contracts";

const ROUTE_URL = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

export const calcularRuta = async (paradas: EventoParada[]) => {
  try {
    // Convertir el arreglo de EventoParada a Graphics (Point) de ArcGIS
    const stopsGraphics = paradas.map(parada => {
      return new Graphic({
        geometry: new Point({ 
          x: parada.punto.x, 
          y: parada.punto.y 
        }),
        attributes: {
          Name: parada.nombre
        }
      });
    });

    // Configurar los parámetros del servicio
    const routeParams = new RouteParameters({
      stops: new FeatureSet({ features: stopsGraphics }),
      returnRoutes: true,
      outSpatialReference: { wkid: 4326 } // Coordenadas WGS84 (Lat/Lon estándar)
    });

    // Ejecutar el cálculo en el servidor de Esri
    const resultado = await solve(ROUTE_URL, routeParams);
    return resultado.routeResults[0].route;
    
  } catch (error) {
    console.error("Error al calcular la ruta:", error);
    alert("Ocurrió un error al calcular la ruta.");
  }
};