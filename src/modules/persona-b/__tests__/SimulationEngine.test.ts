import { describe, expect, it } from "vitest";
import { crearRecorrido } from "../services/Recorrido";
import { SimulationEngine, type LecturaGps, type Temporizador } from "../services/SimulationEngine";
import type { PerfilVelocidad } from "../services/SpeedProfile";

// recorrido de ~111.2 km sobre el ecuador
const recorrido = crearRecorrido([[0, 0], [1, 0]]);

const constante = (kmh: number): PerfilVelocidad & { resets: number } => ({
  resets: 0,
  siguiente: () => kmh,
  reset() {
    this.resets++;
  },
});

function temporizadorManual() {
  let cb: (() => void) | null = null;
  let ms = 0;
  const t: Temporizador = {
    setInterval: (f, intervalo) => {
      cb = f;
      ms = intervalo;
      return 1;
    },
    clearInterval: () => {
      cb = null;
    },
  };
  return { t, avanzar: (n = 1) => { for (let i = 0; i < n; i++) cb?.(); }, activo: () => cb !== null, ms: () => ms };
}

describe("SimulationEngine", () => {
  it("avanza por distancia: velocidad · dt · escala", () => {
    const motor = new SimulationEngine(recorrido, constante(60), { intervaloMs: 1000, escalaTiempo: 60 });
    motor.tick();
    // 60 km/h durante 60 s simulados = 1 km
    expect(motor.lectura.distanciaKm).toBeCloseTo(1, 9);
    expect(motor.lectura.velocidadKmh).toBe(60);
    expect(motor.lectura.tiempoSimuladoSeg).toBe(60);

    motor.setEscalaTiempo(120);
    motor.tick();
    expect(motor.lectura.distanciaKm).toBeCloseTo(3, 9);
  });

  it("interpola la posición sobre el recorrido", () => {
    const motor = new SimulationEngine(recorrido, constante(recorrido.totalKm * 60), { intervaloMs: 1000, escalaTiempo: 30 });
    // 30 s simulados a totalKm·60 km/h recorren justo la mitad
    motor.tick();
    expect(motor.lectura.progreso).toBeCloseTo(0.5, 9);
    expect(motor.lectura.posicion.x).toBeCloseTo(0.5, 6);
    expect(motor.lectura.posicion.y).toBeCloseTo(0, 9);
  });

  it("play, pausa y reset controlan el temporizador y el estado", () => {
    const reloj = temporizadorManual();
    const perfil = constante(60);
    const motor = new SimulationEngine(recorrido, perfil, { intervaloMs: 500 }, reloj.t);
    const estados: string[] = [];
    motor.suscribir((l) => estados.push(l.estado));

    motor.play();
    expect(reloj.activo()).toBe(true);
    expect(reloj.ms()).toBe(500);
    reloj.avanzar(3);
    expect(motor.lectura.tick).toBe(3);

    motor.pausa();
    expect(reloj.activo()).toBe(false);
    reloj.avanzar(5);
    expect(motor.lectura.tick).toBe(3);

    motor.reset();
    expect(motor.lectura.distanciaKm).toBe(0);
    expect(motor.lectura.tick).toBe(0);
    expect(perfil.resets).toBe(1);
    expect(estados).toEqual(["detenido", "reproduciendo", "reproduciendo", "reproduciendo", "reproduciendo", "pausado", "detenido"]);
  });

  it("cambiar el intervalo mientras reproduce reinicia el temporizador", () => {
    const reloj = temporizadorManual();
    const motor = new SimulationEngine(recorrido, constante(60), {}, reloj.t);
    motor.play();
    motor.setIntervaloMs(250);
    expect(reloj.ms()).toBe(250);
    expect(reloj.activo()).toBe(true);
  });

  it("termina en el final del recorrido y deja de avanzar", () => {
    const reloj = temporizadorManual();
    const motor = new SimulationEngine(recorrido, constante(130), { escalaTiempo: 600 }, reloj.t);
    let ultima: LecturaGps | null = null;
    motor.suscribir((l) => (ultima = l));
    motor.play();
    reloj.avanzar(100);

    expect(motor.lectura.estado).toBe("finalizado");
    expect(motor.lectura.distanciaKm).toBe(recorrido.totalKm);
    expect(motor.lectura.progreso).toBe(1);
    expect(reloj.activo()).toBe(false);
    expect(ultima!.posicion).toEqual({ x: 1, y: 0 });

    motor.play();
    expect(motor.lectura.estado).toBe("finalizado");
  });

  it("desuscribir deja de notificar", () => {
    const motor = new SimulationEngine(recorrido, constante(60));
    let n = 0;
    const desuscribir = motor.suscribir(() => n++);
    desuscribir();
    motor.tick();
    expect(n).toBe(1);
  });
});
