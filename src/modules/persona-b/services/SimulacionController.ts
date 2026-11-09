import type { RutaGuardada } from "../../../contracts/contracts";
import { useAppStore } from "../../../shared/store";
import {
  dibujarAvance,
  dibujarTramosEstado,
  limpiarRecorrido,
  limpiarSimulacion,
  marcarCruce,
  mostrarRuta,
  moverMovil,
} from "../map/simulacionMapa";
import { ESTADO_RECORRIDO_INICIAL, useSimulacionStore } from "../simulacionStore";
import { consultarEstadoEnPunto } from "./consultarEstado";
import { densificarRuta } from "./densificarRuta";
import { crearRecorrido, posicionEn, subRecorrido, ubicarParadas, type Recorrido } from "./Recorrido";
import { SimulationEngine, type LecturaGps } from "./SimulationEngine";
import { SpeedProfile } from "./SpeedProfile";
import { StateTracker } from "./StateTracker";

// une el motor puro con el store y el mapa; es el único lugar con estado mutable de la simulación
let motor: SimulationEngine | null = null;
let tracker: StateTracker | null = null;
let preparado: { recorrido: Recorrido; paradasKm: number[] } | null = null;
let version = 0;
let ultimoKm = 0;
let idCambio = 0;

function crearTracker(recorrido: Recorrido): StateTracker {
  return new StateTracker((km) => posicionEn(recorrido, km), consultarEstadoEnPunto, {
    tramos(tramos) {
      dibujarTramosEstado(tramos, recorrido);
      useSimulacionStore.setState({ tramosEstado: tramos, estadoActual: tramos[tramos.length - 1]?.estado ?? null, avisoEstado: null });
    },
    cambio(cambio) {
      marcarCruce(cambio);
      useSimulacionStore.setState({ ultimoCambio: { ...cambio, id: ++idCambio } });
    },
    error(error) {
      console.warn("No se pudo consultar el estado actual:", error);
      useSimulacionStore.setState({ avisoEstado: "No se pudo consultar el Estado actual; se reintenta en el próximo tick." });
    },
  });
}

function reiniciarRecorrido(): void {
  tracker?.reset();
  limpiarRecorrido();
  ultimoKm = 0;
  useSimulacionStore.setState(ESTADO_RECORRIDO_INICIAL);
  void tracker?.actualizar(0);
}

function manejarLectura(lectura: LecturaGps): void {
  useSimulacionStore.setState({ lectura });
  moverMovil(lectura);
  if (!preparado || lectura.distanciaKm <= ultimoKm) return;

  dibujarAvance(subRecorrido(preparado.recorrido, ultimoKm, lectura.distanciaKm), lectura.velocidadKmh);
  ultimoKm = lectura.distanciaKm;
  void tracker?.actualizar(lectura.distanciaKm);
}

function crearMotor(): void {
  motor?.destruir();
  tracker?.reset();
  if (!preparado) return;

  const { escalaTiempo, intervaloMs, semilla } = useSimulacionStore.getState();
  const perfil = new SpeedProfile(preparado.paradasKm, { semilla });
  motor = new SimulationEngine(preparado.recorrido, perfil, { escalaTiempo, intervaloMs });
  tracker = crearTracker(preparado.recorrido);
  reiniciarRecorrido();
  motor.suscribir(manejarLectura);
}

async function prepararRuta(ruta: RutaGuardada | null): Promise<void> {
  const actual = ++version;
  motor?.destruir();
  tracker?.reset();
  motor = null;
  tracker = null;
  preparado = null;
  limpiarSimulacion();
  useSimulacionStore.setState({ lectura: null, error: null, preparando: ruta !== null, ...ESTADO_RECORRIDO_INICIAL });
  if (!ruta) return;

  try {
    mostrarRuta(ruta);
    const puntos = await densificarRuta(ruta.geometria);
    if (actual !== version) return;

    const recorrido = crearRecorrido(puntos);
    preparado = { recorrido, paradasKm: ubicarParadas(recorrido, ruta.paradas) };
    crearMotor();
  } catch (error) {
    console.error("No se pudo preparar la simulación:", error);
    if (actual === version) useSimulacionStore.setState({ error: "No se pudo preparar la ruta para simular." });
  } finally {
    if (actual === version) useSimulacionStore.setState({ preparando: false });
  }
}

export function iniciarSimulacion(): () => void {
  void prepararRuta(useAppStore.getState().rutaActiva);
  const desuscribir = useAppStore.subscribe((estado, previo) => {
    if (estado.rutaActiva !== previo.rutaActiva) void prepararRuta(estado.rutaActiva);
  });
  return () => {
    desuscribir();
    version++;
    motor?.destruir();
    tracker?.reset();
    motor = null;
    tracker = null;
  };
}

export const controles = {
  play: () => motor?.play(),
  pausa: () => motor?.pausa(),
  reset() {
    motor?.reset();
    reiniciarRecorrido();
  },
  setEscalaTiempo(escala: number) {
    useSimulacionStore.setState({ escalaTiempo: escala });
    motor?.setEscalaTiempo(escala);
  },
  setIntervaloMs(ms: number) {
    useSimulacionStore.setState({ intervaloMs: ms });
    motor?.setIntervaloMs(ms);
  },
  // otra semilla es otro perfil de velocidad, así que la simulación arranca de cero
  setSemilla(semilla: number) {
    useSimulacionStore.setState({ semilla });
    crearMotor();
  },
};
