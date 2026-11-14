import "@arcgis/map-components/components/arcgis-compass";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-navigation-toggle";
import "@arcgis/map-components/components/arcgis-scene";
import "@arcgis/map-components/components/arcgis-zoom";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import { useState, type ReactNode } from "react";
import { obtenerMapa } from "./capas";
import { registrarVista, setModoVista, useModoVista, type ModoVista } from "./vista";
import "./MapaPrincipal.css";

const CENTRO_INICIAL = "-98, 39";
const ZOOM_INICIAL = 4;

function SelectorVista({ modo }: { modo: ModoVista }) {
  return (
    <calcite-segmented-control
      slot="top-right"
      scale="s"
      label="Tipo de vista"
      oncalciteSegmentedControlChange={(e) => setModoVista(e.target.value as ModoVista)}
    >
      <calcite-segmented-control-item value="2d" checked={modo === "2d"}>
        2D
      </calcite-segmented-control-item>
      <calcite-segmented-control-item value="3d" checked={modo === "3d"}>
        3D
      </calcite-segmented-control-item>
    </calcite-segmented-control>
  );
}

// las dos vistas usan el mismo map, así que capas y gráficos de la simulación son los mismos en 2d y 3d.
// la escena se monta la primera vez que se pide y después solo se oculta: desmontarla destruiría el map
export function MapaPrincipal({ children }: { children?: ReactNode }) {
  const modo = useModoVista((s) => s.modo);
  const [escenaMontada, setEscenaMontada] = useState(false);
  if (modo === "3d" && !escenaMontada) setEscenaMontada(true);

  return (
    <div className="mapa-contenedor">
      <arcgis-map
        className={modo === "2d" ? "vista-activa" : "vista-oculta"}
        map={obtenerMapa()}
        center={CENTRO_INICIAL}
        zoom={ZOOM_INICIAL}
        onarcgisViewReadyChange={(e) => registrarVista("2d", e.target.ready ? e.target.view : null)}
      >
        <arcgis-zoom slot="top-left" />
        <arcgis-home slot="top-left" />
        <SelectorVista modo={modo} />
        {modo === "2d" && children}
      </arcgis-map>

      {escenaMontada && (
        <arcgis-scene
          className={modo === "3d" ? "vista-activa" : "vista-oculta"}
          map={obtenerMapa()}
          onarcgisViewReadyChange={(e) => registrarVista("3d", e.target.ready ? e.target.view : null)}
        >
          <arcgis-zoom slot="top-left" />
          <arcgis-navigation-toggle slot="top-left" />
          <arcgis-compass slot="top-left" />
          <arcgis-home slot="top-left" />
          <SelectorVista modo={modo} />
          {modo === "3d" && children}
        </arcgis-scene>
      )}
    </div>
  );
}
