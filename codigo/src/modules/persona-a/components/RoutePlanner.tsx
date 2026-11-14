import { useState, useEffect, useRef, useCallback } from 'react';
import type { EventoParada, RutaGuardada } from '../../../contracts/contracts';
import { useAppStore } from '../../../shared/store';
import { routeRepository } from '../repositories/repositorios';
import type { ResumenRuta } from '../repositories/routeRepository';
import { exportarRutaArchivo } from '../services/routeFileService';
import type { RutaCalculada } from '../services/routingService';
import { EventForm } from './EventForm';
import { EventList } from './EventList';
import { EventManager } from './EventManager';
import { SavedRoutes } from './SavedRoutes';

interface RoutePlannerProps {
  onUpdateMap?: (ruta: RutaCalculada | null, paradas: EventoParada[]) => void;
  paradaSeleccionada?: number | null; 
  onCentrarEnParada?: (parada: EventoParada) => void;
  onImprimirMapa?: () => Promise<void>;
}

type Vista = 'menu' | 'planificador' | 'eventos' | 'guardadas';

const estiloTitulo: React.CSSProperties = {
  margin: '0 0 20px 0',
  textAlign: 'center',
  color: '#2d3748'
};

const estiloBotonMenu: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#fff',
  color: '#2d3748',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

export const RoutePlanner = ({ onUpdateMap, paradaSeleccionada, onCentrarEnParada, onImprimirMapa }: RoutePlannerProps) => {
  const [paradas, setParadas] = useState<EventoParada[]>([]);
  const [rutaActiva, setRutaActiva] = useState<RutaCalculada | null>(null);
  const [rutasGuardadas, setRutasGuardadas] = useState<ResumenRuta[]>([]);
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('menu');

  const setRutaSimulacion = useAppStore((s) => s.setRutaActiva);

  const rutaPendienteRef = useRef<RutaCalculada | null>(null);

  useEffect(() => {
    const pendiente = rutaPendienteRef.current;
    rutaPendienteRef.current = null;

    setRutaActiva(pendiente);
    if (onUpdateMap) onUpdateMap(pendiente, paradas);
  }, [paradas]);

  // la ruta calculada o cargada pasa a ser la ruta activa de la simulación
  const manejarRutaCalculada = (ruta: RutaCalculada) => {
    setRutaActiva(ruta);
    if (onUpdateMap) onUpdateMap(ruta, paradas);
    setRutaSimulacion({
      id: `ruta-${Date.now()}`,
      nombre: 'Ruta calculada (sin guardar)',
      paradas: [...paradas],
      geometria: ruta.geometry,
      creada: new Date().toISOString()
    });
  };

  // las rutas guardadas viven en el featureserver de trails
  const consultarRutas = useCallback(
    () =>
      routeRepository
        .obtenerRutas()
        .then(setRutasGuardadas, () =>
          setErrorRutas('No se pudieron consultar las rutas guardadas en el servidor. Revisá la conexión y apretá "Actualizar lista".')
        )
        .finally(() => setCargandoRutas(false)),
    []
  );

  const refrescarRutasGuardadas = useCallback(async () => {
    setCargandoRutas(true);
    setErrorRutas(null);
    await consultarRutas();
  }, [consultarRutas]);

  // la primera consulta arranca con cargandoRutas ya en true
  useEffect(() => {
    void consultarRutas();
  }, [consultarRutas]);

  const abrirRuta = (ruta: RutaGuardada) => {
    rutaPendienteRef.current = { geometry: ruta.geometria };
    setParadas([...ruta.paradas]);
    setVista('planificador');
    setRutaSimulacion(ruta);
  };

  const cargarRutaGuardada = async (resumen: ResumenRuta) => {
    const { ruta, faltantes } = await routeRepository.cargarRuta(resumen.objectId);
    abrirRuta(ruta);
    if (faltantes > 0) {
      alert(`${faltantes} ${faltantes === 1 ? 'parada de esta ruta ya no existe' : 'paradas de esta ruta ya no existen'} en el servidor de eventos (otro usuario pudo haberlas borrado). La ruta se cargó sin ellas.`);
    }
  };

  const exportarRutaGuardada = async (resumen: ResumenRuta) => {
    const { ruta } = await routeRepository.cargarRuta(resumen.objectId);
    exportarRutaArchivo(ruta);
  };

  // la ruta importada se abre sin guardar: "Guardar" la sube al servidor y crea los eventos que falten
  const importarRuta = (ruta: RutaGuardada) => abrirRuta(ruta);

  const eliminarRutaGuardada = async (resumen: ResumenRuta) => {
    await routeRepository.eliminarRuta(resumen.objectId);
    await refrescarRutasGuardadas();
  };

  // al guardar, las paradas reciben el objectId de su evento; la ruta calculada se conserva
  const manejarRutaGuardada = (guardada: RutaGuardada) => {
    rutaPendienteRef.current = rutaActiva;
    setParadas((prev) => prev.map((p, i) => ({ ...p, objectId: guardada.paradas[i]?.objectId ?? p.objectId })));
    void refrescarRutasGuardadas();
  };

  const agregarParada = (nuevaParada: EventoParada) =>
    setParadas((prev) => [
      ...prev,
      { ...nuevaParada, eventId: Math.max(0, ...prev.map((p) => p.eventId)) + 1 }
    ]);

  // editar el nombre, tipo o fecha de un evento no cambia el recorrido, así que la ruta calculada se mantiene
  const actualizarEventoEnRuta = (evento: EventoParada) => {
    if (!paradas.some((p) => p.objectId === evento.objectId)) return;
    rutaPendienteRef.current = rutaActiva;
    setParadas((prev) =>
      prev.map((p) => (p.objectId === evento.objectId ? { ...p, nombre: evento.nombre, tipo: evento.tipo, fecha: evento.fecha } : p))
    );
  };

  const quitarEventoDeRuta = (objectId: number) => setParadas((prev) => prev.filter((p) => p.objectId !== objectId));
  const eliminarParada = (eventId: number) => setParadas((prev) => prev.filter((p) => p.eventId !== eventId));
  const moverParada = (index: number, direccion: 'up' | 'down') => {
    const nuevas = [...paradas];
    if (direccion === 'up' && index > 0) [nuevas[index - 1], nuevas[index]] = [nuevas[index], nuevas[index - 1]];
    else if (direccion === 'down' && index < nuevas.length - 1) [nuevas[index + 1], nuevas[index]] = [nuevas[index], nuevas[index + 1]];
    setParadas(nuevas);
  };

  return (
    <div>
      {vista !== 'menu' && (
        <button
          onClick={() => setVista('menu')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#4a5568',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            padding: '5px 5px 5px 0',
            marginBottom: '8px'
          }}
        >
          ← Menú
        </button>
      )}

      {/* Paso previo: elegir qué hacer */}
      {vista === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={estiloTitulo}>Menú</h2>

          <button onClick={() => setVista('planificador')} style={estiloBotonMenu}>
            <strong style={{ fontSize: '16px' }}>Planificador de Ruta</strong>
            <span style={{ fontSize: '12px', color: '#718096' }}>
              Ruta actual: {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'}
            </span>
          </button>

          <button onClick={() => setVista('eventos')} style={estiloBotonMenu}>
            <strong style={{ fontSize: '16px' }}>Eventos</strong>
            <span style={{ fontSize: '12px', color: '#718096' }}>
              Crear, editar, eliminar y consultar eventos del servidor
            </span>
          </button>

          <button onClick={() => setVista('guardadas')} style={estiloBotonMenu}>
            <strong style={{ fontSize: '16px' }}>Rutas Guardadas</strong>
            <span style={{ fontSize: '12px', color: '#718096' }}>
              {cargandoRutas ? 'Consultando el servidor…' : `${rutasGuardadas.length} ${rutasGuardadas.length === 1 ? 'ruta' : 'rutas'}`} · cargar, exportar, importar y eliminar
            </span>
          </button>
        </div>
      )}

      {/* Las vistas se ocultan (no se desmontan) para conservar lo escrito en el formulario */}
      <div style={{ display: vista === 'planificador' ? 'block' : 'none' }}>
        <h2 style={estiloTitulo}>Planificador de Ruta</h2>

        <EventForm onEventoCreado={agregarParada} />
        <hr style={{ margin: '1.5rem 0', border: '1px solid #ddd' }} />
        <EventList 
          paradas={paradas} 
          rutaCalculada={rutaActiva}
          onEliminarParada={eliminarParada} 
          onMoverParada={moverParada} 
          onRutaCalculada={manejarRutaCalculada}
          paradaSeleccionada={paradaSeleccionada}
          onCentrarEnParada={onCentrarEnParada}
          onImprimirMapa={onImprimirMapa}
          onRutaGuardada={manejarRutaGuardada}
        />
      </div>

      <div style={{ display: vista === 'eventos' ? 'block' : 'none' }}>
        <h2 style={estiloTitulo}>Eventos</h2>

        <EventManager
          activo={vista === 'eventos'}
          objectIdsEnRuta={paradas.flatMap((p) => (p.objectId === undefined ? [] : [p.objectId]))}
          onAgregarARuta={agregarParada}
          onEventoActualizado={actualizarEventoEnRuta}
          onEventoEliminado={quitarEventoDeRuta}
        />
      </div>

      <div style={{ display: vista === 'guardadas' ? 'block' : 'none' }}>
        <h2 style={estiloTitulo}>Rutas Guardadas</h2>

        <SavedRoutes
          rutas={rutasGuardadas}
          cargando={cargandoRutas}
          error={errorRutas}
          onActualizar={() => void refrescarRutasGuardadas()}
          onCargar={cargarRutaGuardada}
          onExportar={exportarRutaGuardada}
          onImportar={importarRuta}
          onEliminar={eliminarRutaGuardada}
        />
      </div>
    </div>
  );
};
