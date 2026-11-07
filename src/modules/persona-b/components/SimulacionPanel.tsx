import { useAppStore } from "../../../shared/store";

export function SimulacionPanel() {
  const rutaActiva = useAppStore((s) => s.rutaActiva);

  return (
    <div className="panel-contenido">
      {rutaActiva ? (
        <p>
          Ruta cargada: <strong>{rutaActiva.nombre}</strong> ({rutaActiva.paradas.length} paradas)
        </p>
      ) : (
        <calcite-notice open icon="information" width="full">
          <div slot="message">No hay ruta activa. Elegí una en la pestaña Rutas.</div>
        </calcite-notice>
      )}
    </div>
  );
}
