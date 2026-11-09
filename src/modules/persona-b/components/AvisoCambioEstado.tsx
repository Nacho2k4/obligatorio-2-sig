import "@esri/calcite-components/components/calcite-alert";
import { useSimulacionStore } from "../simulacionStore";

// se monta en el slot "alerts" del shell para que se vea aunque la pestaña de simulación esté oculta
export function AvisoCambioEstado() {
  const cambio = useSimulacionStore((s) => s.ultimoCambio);
  if (!cambio) return null;

  return (
    <calcite-alert
      key={cambio.id}
      slot="alerts"
      open
      autoClose
      autoCloseDuration="medium"
      kind="brand"
      icon="pin-tear"
      placement="top"
      label="Cambio de Estado"
    >
      <div slot="title">Entró a {cambio.a.nombre}</div>
      <div slot="message">
        Desde {cambio.de.nombre}, en el km {cambio.km.toFixed(1)}
      </div>
    </calcite-alert>
  );
}
