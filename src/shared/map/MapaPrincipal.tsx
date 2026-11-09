import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import type { ReactNode } from "react";
import { obtenerMapa } from "./capas";
import { registrarVista } from "./vista";

const CENTRO_INICIAL = "-98, 39";
const ZOOM_INICIAL = 4;

export function MapaPrincipal({ children }: { children?: ReactNode }) {
  return (
    <arcgis-map
      map={obtenerMapa()}
      center={CENTRO_INICIAL}
      zoom={ZOOM_INICIAL}
      onarcgisViewReadyChange={(e) => registrarVista(e.target.ready ? e.target.view : null)}
    >
      <arcgis-zoom slot="top-left" />
      <arcgis-home slot="top-left" />
      {children}
    </arcgis-map>
  );
}
