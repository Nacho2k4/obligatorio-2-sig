import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import { SERVICIOS } from "../../../shared/config";
import { capaEventosServidor } from "../map/capaEventosServidor";
import { EventRepository } from "./eventRepository";
import { RouteRepository } from "./routeRepository";

// instancias reales contra los featureservers de sampleserver5
export const eventRepository = new EventRepository(capaEventosServidor);
export const routeRepository = new RouteRepository(
  new FeatureLayer({ url: SERVICIOS.rutasGuardadas, outFields: ["objectid", "notes", "recordedon"] }),
  eventRepository,
);
