import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-tabs";
import "@esri/calcite-components/components/calcite-tab-nav";
import "@esri/calcite-components/components/calcite-tab-title";
import "@esri/calcite-components/components/calcite-tab";
import "@esri/calcite-components/components/calcite-notice";
import "@esri/calcite-components/components/calcite-button";
import { MapaPrincipal } from "./shared/map/MapaPrincipal";
import { EventosPanel } from "./modules/persona-a/components/EventosPanel";
import { RutasPanel } from "./modules/persona-a/components/RutasPanel";
import { SimulacionPanel } from "./modules/persona-b/components/SimulacionPanel";

export function App() {
  return (
    <calcite-shell>
      <calcite-shell-panel slot="panel-start" position="start" width="l" resizable>
        <calcite-panel heading="SIG — Obligatorio 2" description="Simulación de móvil sobre rutas de EE. UU.">
          <calcite-tabs layout="center" bordered>
            <calcite-tab-nav slot="title-group">
              <calcite-tab-title iconStart="calendar">Eventos</calcite-tab-title>
              <calcite-tab-title iconStart="road-sign">Rutas</calcite-tab-title>
              <calcite-tab-title iconStart="car" selected>
                Simulación
              </calcite-tab-title>
            </calcite-tab-nav>
            <calcite-tab>
              <EventosPanel />
            </calcite-tab>
            <calcite-tab>
              <RutasPanel />
            </calcite-tab>
            <calcite-tab selected>
              <SimulacionPanel />
            </calcite-tab>
          </calcite-tabs>
        </calcite-panel>
      </calcite-shell-panel>
      <MapaPrincipal />
    </calcite-shell>
  );
}
