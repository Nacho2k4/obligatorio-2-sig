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
import { RutasPanel } from "./modules/persona-a/components/RutasPanel";
import { SimulacionPanel } from "./modules/persona-b/components/SimulacionPanel";
import { AvisoCambioEstado } from "./modules/persona-b/components/AvisoCambioEstado";
import { LeyendaSimulacion } from "./modules/persona-b/components/LeyendaSimulacion";

export function App() {
  return (
    <calcite-shell>
      <calcite-shell-panel slot="panel-start" position="start" width="l" resizable>
        <calcite-panel heading="SIG — Obligatorio 2" description="Simulación de móvil sobre rutas de EE. UU.">
          <calcite-tabs layout="center" bordered>
            <calcite-tab-nav slot="title-group">
              <calcite-tab-title iconStart="road-sign" selected>
                Rutas
              </calcite-tab-title>
              <calcite-tab-title iconStart="car">Simulación</calcite-tab-title>
            </calcite-tab-nav>
            <calcite-tab selected>
              <RutasPanel />
            </calcite-tab>
            <calcite-tab>
              <SimulacionPanel />
            </calcite-tab>
          </calcite-tabs>
        </calcite-panel>
      </calcite-shell-panel>
      <MapaPrincipal>
        <LeyendaSimulacion />
      </MapaPrincipal>
      <AvisoCambioEstado />
    </calcite-shell>
  );
}
