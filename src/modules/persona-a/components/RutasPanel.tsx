import { useAppStore } from "../../../shared/store";
import { mockRuta } from "../../../mocks/mockRuta";

export function RutasPanel() {
  const rutaActiva = useAppStore((s) => s.rutaActiva);
  const setRutaActiva = useAppStore((s) => s.setRutaActiva);

  return (
    <div className="panel-contenido">
      <calcite-notice open icon="clock" width="full">
        <div slot="title">Próximamente</div>
        <div slot="message">Rutas con paradas ordenadas, ruteo, guardado y exportación a PDF.</div>
      </calcite-notice>

      <calcite-notice open kind="warning" icon="code" width="full">
        <div slot="title">Desarrollo</div>
        <div slot="message">Carga una ruta ficticia (I-35 Dallas → Wichita) para probar la simulación.</div>
      </calcite-notice>
      <calcite-button
        appearance="outline"
        kind="neutral"
        iconStart="code"
        width="full"
        onClick={() => setRutaActiva(mockRuta)}
      >
        [DEV] Usar ruta de prueba
      </calcite-button>

      {rutaActiva && (
        <p className="texto-secundario">
          Ruta activa: <strong>{rutaActiva.nombre}</strong>
        </p>
      )}
    </div>
  );
}
