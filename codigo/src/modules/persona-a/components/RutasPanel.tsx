import { useEffect, useState } from "react";
import { useAppStore } from "../../../shared/store";
import { alCambiarVista } from "../../../shared/map/vista";
import { mockRuta } from "../../../mocks/mockRuta";
import {
  centrarEnParada,
  dibujarPlanificacion,
  escucharClicks,
  imprimirRuta,
  marcarSeleccion,
} from "../map/planificadorMapa";
import { RoutePlanner } from "./RoutePlanner";

export function RutasPanel() {
  const rutaActiva = useAppStore((s) => s.rutaActiva);
  const setRutaActiva = useAppStore((s) => s.setRutaActiva);
  const [paradaSeleccionada, setParadaSeleccionada] = useState<number | null>(null);

  useEffect(() => {
    let handle: { remove(): void } | null = null;
    const desuscribir = alCambiarVista((vista) => {
      handle?.remove();
      handle = vista ? escucharClicks(vista, setParadaSeleccionada) : null;
    });
    return () => {
      desuscribir();
      handle?.remove();
    };
  }, []);

  useEffect(() => marcarSeleccion(paradaSeleccionada), [paradaSeleccionada]);

  return (
    <div className="panel-contenido">
      <RoutePlanner
        onUpdateMap={(ruta, paradas) => dibujarPlanificacion(ruta?.geometry ?? null, paradas)}
        paradaSeleccionada={paradaSeleccionada}
        onCentrarEnParada={(parada) => {
          setParadaSeleccionada(parada.eventId);
          centrarEnParada(parada);
        }}
        onImprimirMapa={() => imprimirRuta("Mi Ruta Planificada")}
      />

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
          Ruta activa para simular: <strong>{rutaActiva.nombre}</strong>
        </p>
      )}
    </div>
  );
}
