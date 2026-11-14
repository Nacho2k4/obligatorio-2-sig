import type MapView from "@arcgis/core/views/MapView.js";
import type SceneView from "@arcgis/core/views/SceneView.js";
import { describe, expect, it, vi } from "vitest";
import { alCambiarVista, obtenerVista, obtenerVista2D, registrarVista, setModoVista, useModoVista } from "../map/vista";

interface ViewpointFalso {
  nombre: string;
  targetGeometry: { nombre: string };
  clone(): ViewpointFalso;
}
const viewpoint = (nombre: string): ViewpointFalso => ({ nombre, targetGeometry: { nombre }, clone: () => viewpoint(`copia de ${nombre}`) });
const nombreViewpoint = (v: { viewpoint: unknown }) => (v.viewpoint as ViewpointFalso).nombre;

const mapView = () =>
  ({ type: "2d", viewpoint: viewpoint("2d"), scale: 1e6, rotation: 15 }) as unknown as MapView;

const sceneView = () =>
  ({
    type: "3d",
    viewpoint: viewpoint("3d"),
    goTo: vi.fn(() => Promise.resolve()),
  }) as unknown as SceneView & { goTo: ReturnType<typeof vi.fn> };

describe("registro de vistas 2d/3d", () => {
  it("cambia la vista activa sin perder la 2d y avisa a los suscriptores", () => {
    const v2 = mapView();
    const v3 = sceneView();
    const vistas: unknown[] = [];
    registrarVista("2d", v2);
    const desuscribir = alCambiarVista((v) => vistas.push(v));

    expect(obtenerVista()).toBe(v2);

    // la escena se crea recién al pedir 3d: mientras carga no hay vista activa
    setModoVista("3d");
    expect(useModoVista.getState().modo).toBe("3d");
    expect(obtenerVista()).toBeNull();

    // cuando está lista toma la ubicación de la 2d inclinada, con goTo alrededor del mismo objetivo
    registrarVista("3d", v3);
    expect(obtenerVista()).toBe(v3);
    expect(v3.goTo).toHaveBeenCalledWith(
      expect.objectContaining({ target: v2.viewpoint.targetGeometry, scale: 1e6, tilt: 50 }),
      { animate: false },
    );
    expect(obtenerVista2D()).toBe(v2);

    // al volver a 2d copia el punto de vista de la 3d y deja el norte arriba
    setModoVista("2d");
    expect(obtenerVista()).toBe(v2);
    expect(nombreViewpoint(v2)).toBe("copia de 3d");
    expect(v2.rotation).toBe(0);

    // la segunda entrada a 3d solo copia el punto de vista, sin volver a inclinar
    setModoVista("3d");
    expect(v3.goTo).toHaveBeenCalledTimes(1);
    expect(nombreViewpoint(v3)).toBe("copia de copia de 3d");

    expect(vistas).toEqual([v2, null, v3, v2, v3]);
    desuscribir();
    setModoVista("2d");
  });
});
