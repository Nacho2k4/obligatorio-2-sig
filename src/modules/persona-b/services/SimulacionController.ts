import type { RutaGuardada } from "../../../contracts/contracts";
import { SERVICIOS } from "../../../shared/config";
import { alCambiarVista } from "../../../shared/map/vista";
import { useAppStore } from "../../../shared/store";
import {
  dibujarAvance,
  dibujarBuffer,
  dibujarCondados,
  enfocarCondado,
  limpiarAnalisis,
  dibujarTramosEstado,
  limpiarRecorrido,
  limpiarSimulacion,
  marcarCruce,
  mostrarRuta,
  moverMovil,
  resaltarCondado,
  seguirConCamara,
} from "../map/simulacionMapa";
import { ESTADO_RECORRIDO_INICIAL, useSimulacionStore } from "../simulacionStore";
import { AnalysisPipeline } from "./AnalysisPipeline";
import { BufferService } from "./BufferService";
import { consultarEstadoEnPunto } from "./consultarEstado";
import { CountyQueryService } from "./CountyQueryService";
import { densificarRuta } from "./densificarRuta";
import { crearPopulationCalculator } from "./poblacionGeometryServer";
import { crearRecorrido, posicionEn, rumboEn, subRecorrido, ubicarParadas, type Recorrido } from "./Recorrido";
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

const bufferService = new BufferService(SERVICIOS.geometryServer);
const countyService = new CountyQueryService(SERVICIOS.condados);
const populationCalculator = crearPopulationCalculator(SERVICIOS.geometryServer);

const pipeline = new AnalysisPipeline(
  {
    buffer: (punto, radioKm, signal) => bufferService.generar(punto, radioKm, signal),
    condados: (buffer, signal) => countyService.interceptados(buffer, signal),
    poblacion: (buffer, condados, signal) => populationCalculator.calcular(buffer, condados, signal),
  },
  {
    buffer: (buffer) => dibujarBuffer(buffer),
    resultado({ solicitud, condados, poblacion, tiempos }) {
      dibujarCondados(condados, poblacion.condados);
      useSimulacionStore.setState({
        analisis: { km: solicitud.km, radioKm: solicitud.radioKm, poblacion, tiempos },
        avisoAnalisis: null,
      });
    },
    error(error) {
      console.warn("Falló el análisis espacial:", error);
      useSimulacionStore.setState({ avisoAnalisis: "No se pudo completar el análisis del buffer; se reintenta en el próximo tick." });
    },
    metricas: (metricasAnalisis) => useSimulacionStore.setState({ metricasAnalisis }),
  },
);

function analizar(km: number): void {
  if (!preparado) return;
  pipeline.solicitar({ punto: posicionEn(preparado.recorrido, km), radioKm: useSimulacionStore.getState().radioBufferKm, km });
}

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
  pipeline.invalidar();
  limpiarRecorrido();
  ultimoKm = 0;
  useSimulacionStore.setState(ESTADO_RECORRIDO_INICIAL);
  pipeline.reiniciarMetricas();
  void tracker?.actualizar(0);
  analizar(0);
}

function manejarLectura(lectura: LecturaGps): void {
  useSimulacionStore.setState({ lectura });
  moverMovil(lectura);
  if (!preparado || lectura.distanciaKm <= ultimoKm) return;

  dibujarAvance(subRecorrido(preparado.recorrido, ultimoKm, lectura.distanciaKm), lectura.velocidadKmh);
  ultimoKm = lectura.distanciaKm;
  void tracker?.actualizar(lectura.distanciaKm);
  analizar(lectura.distanciaKm);
  seguir(false);
}

// la cámara apunta medio tick adelante: el móvil salta un tick por vez y así queda alrededor del centro
function seguir(inicial: boolean): void {
  const { seguirMovil, intervaloMs, escalaTiempo, lectura } = useSimulacionStore.getState();
  if (!seguirMovil || !preparado) return;
  const avanceKm = ((lectura?.velocidadKmh ?? 0) * (intervaloMs / 1000) * escalaTiempo) / 3600;
  const objetivoKm = Math.min(ultimoKm + (inicial ? 0 : avanceKm / 2), preparado.recorrido.totalKm);
  seguirConCamara(
    posicionEn(preparado.recorrido, objetivoKm),
    rumboEn(preparado.recorrido, objetivoKm),
    intervaloMs,
    avanceKm,
    inicial,
  );
}

// si el usuario mueve el mapa a mano se apaga el seguimiento, para no pelearle la cámara
function apagarSeguimientoAlInteractuar(): () => void {
  let handles: { remove(): void }[] = [];
  const apagar = () => {
    if (useSimulacionStore.getState().seguirMovil) useSimulacionStore.setState({ seguirMovil: false });
  };
  const desuscribir = alCambiarVista((vista) => {
    handles.forEach((h) => h.remove());
    handles = vista ? [vista.on("drag", apagar), vista.on("mouse-wheel", apagar)] : [];
    seguir(true);
  });
  return () => {
    desuscribir();
    handles.forEach((h) => h.remove());
  };
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
  pipeline.invalidar();
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

    if (puntos.length < 2) {
      useSimulacionStore.setState({ error: "La ruta no tiene tramos para recorrer. Volvé a calcularla en la pestaña Rutas." });
      return;
    }
    const recorrido = crearRecorrido(puntos);
    preparado = { recorrido, paradasKm: ubicarParadas(recorrido, ruta.paradas) };
    crearMotor();
  } catch (error) {
    console.error("No se pudo preparar la simulación:", error);
    if (actual === version) useSimulacionStore.setState({ error: "No se pudo preparar la ruta para simular. Revisá la conexión y reintentá." });
  } finally {
    if (actual === version) useSimulacionStore.setState({ preparando: false });
  }
}

export function iniciarSimulacion(): () => void {
  void prepararRuta(useAppStore.getState().rutaActiva);
  const desuscribir = useAppStore.subscribe((estado, previo) => {
    if (estado.rutaActiva !== previo.rutaActiva) void prepararRuta(estado.rutaActiva);
  });
  const quitarInteraccion = apagarSeguimientoAlInteractuar();
  return () => {
    desuscribir();
    quitarInteraccion();
    version++;
    motor?.destruir();
    tracker?.reset();
    pipeline.invalidar();
    motor = null;
    tracker = null;
  };
}

export const controles = {
  reintentar: () => prepararRuta(useAppStore.getState().rutaActiva),
  resaltarCondado,
  enfocarCondado,
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
  setSeguirMovil(seguirMovil: boolean) {
    useSimulacionStore.setState({ seguirMovil });
    seguir(true);
  },
  // el análisis en vuelo usa el radio viejo, así que se descarta y se rehace en la posición actual
  setRadioBufferKm(radioKm: number) {
    useSimulacionStore.setState({ radioBufferKm: radioKm });
    pipeline.invalidar();
    limpiarAnalisis();
    useSimulacionStore.setState({ analisis: null });
    analizar(ultimoKm);
  },
  // otra semilla es otro perfil de velocidad, así que la simulación arranca de cero
  setSemilla(semilla: number) {
    useSimulacionStore.setState({ semilla });
    crearMotor();
  },
};
