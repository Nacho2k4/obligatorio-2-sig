import { useState, useEffect, useRef } from 'react';
import type { EventoParada, RutaGuardada } from '../../../contracts/contracts';
import { eliminarRuta, guardarRuta, obtenerRutas } from '../repositories/routeRepository';
import { EventForm } from './EventForm';
import { EventList } from './EventList';
import { SavedRoutes } from './SavedRoutes';

interface RoutePlannerProps {
  onUpdateMap?: (ruta: any | null, paradas: EventoParada[]) => void;
  paradaSeleccionada?: number | null; 
  onCentrarEnParada?: (parada: EventoParada) => void;
  onImprimirMapa?: () => Promise<void>;
}

type Vista = 'menu' | 'planificador' | 'guardadas';

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
  const [rutaActiva, setRutaActiva] = useState<any>(null);
  const [rutasGuardadas, setRutasGuardadas] = useState<RutaGuardada[]>(() => obtenerRutas());
  const [vista, setVista] = useState<Vista>('menu');

  const rutaPendienteRef = useRef<any>(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(true);
      else setIsOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const pendiente = rutaPendienteRef.current;
    rutaPendienteRef.current = null;

    setRutaActiva(pendiente);
    if (onUpdateMap) onUpdateMap(pendiente, paradas);
  }, [paradas]);

  const manejarRutaCalculada = (ruta: any) => {
    setRutaActiva(ruta);
    if (onUpdateMap) onUpdateMap(ruta, paradas);
  };

  const refrescarRutasGuardadas = () => setRutasGuardadas(obtenerRutas());

  const cargarRutaGuardada = (ruta: RutaGuardada) => {
    rutaPendienteRef.current = ruta.geometria ? { geometry: ruta.geometria } : null;
    setParadas([...ruta.paradas]);
    setVista('planificador');
    if (isMobile) setIsOpen(false);
  };

  const importarRuta = (ruta: RutaGuardada) => {
    guardarRuta(ruta);
    refrescarRutasGuardadas();
    cargarRutaGuardada(ruta);
  };

  const eliminarRutaGuardada = (id: string) => {
    eliminarRuta(id);
    refrescarRutasGuardadas();
  };

  const agregarParada = (nuevaParada: EventoParada) =>
    setParadas((prev) => [
      ...prev,
      { ...nuevaParada, eventId: Math.max(0, ...prev.map((p) => p.eventId)) + 1 }
    ]);
  const eliminarParada = (eventId: number) => setParadas((prev) => prev.filter((p) => p.eventId !== eventId));
  const moverParada = (index: number, direccion: 'up' | 'down') => {
    const nuevas = [...paradas];
    if (direccion === 'up' && index > 0) [nuevas[index - 1], nuevas[index]] = [nuevas[index], nuevas[index - 1]];
    else if (direccion === 'down' && index < nuevas.length - 1) [nuevas[index + 1], nuevas[index]] = [nuevas[index], nuevas[index + 1]];
    setParadas(nuevas);
  };

  const hayFilaSuperior = isMobile || vista !== 'menu';

  return (
    <>
      {/* Botón Hamburguesa */}
      {isMobile && !isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            padding: '10px 14px',
            backgroundColor: '#fff',
            color: '#4a5568',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Abrir panel"
        >
          ☰
        </button>
      )}

      {/* Panel Lateral */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: isOpen ? 0 : '-400px', 
          width: '350px',
          maxWidth: '100vw',
          height: '100vh', 
          padding: '20px',
          backgroundColor: '#f8f9fa', 
          boxShadow: isOpen ? '4px 0 15px rgba(0,0,0,0.2)' : 'none',
          transition: 'left 0.3s ease-in-out',
          zIndex: 999,
          boxSizing: 'border-box',
          overflowY: 'auto' 
        }}
      >
        {/* Fila superior: "← Menú" a la izquierda y la cruz a la derecha, en el mismo renglón */}
        {hayFilaSuperior && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                  padding: '5px 5px 5px 0'
                }}
              >
                ← Menú
              </button>
            )}

            {isMobile && (
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  marginLeft: 'auto', // la cruz siempre pegada a la derecha, aunque no haya botón "Menú"
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#4a5568',
                  fontWeight: 'bold',
                  padding: '5px'
                }}
                title="Cerrar panel"
              >
                ✕
              </button>
            )}
          </div>
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

            <button onClick={() => setVista('guardadas')} style={estiloBotonMenu}>
              <strong style={{ fontSize: '16px' }}>Rutas Guardadas</strong>
              <span style={{ fontSize: '12px', color: '#718096' }}>
                {rutasGuardadas.length} {rutasGuardadas.length === 1 ? 'ruta' : 'rutas'} · cargar, exportar, importar y eliminar
              </span>
            </button>
          </div>
        )}

        {/* Las vistas se ocultan (no se desmontan) para conservar lo escrito en el formulario */}
        <div style={{ display: vista === 'planificador' ? 'block' : 'none' }}>
          <h2 style={estiloTitulo}>Planificador de Ruta</h2>

          <EventForm onAgregarParada={agregarParada} />
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
            onRutaGuardada={refrescarRutasGuardadas}
          />
        </div>

        <div style={{ display: vista === 'guardadas' ? 'block' : 'none' }}>
          <h2 style={estiloTitulo}>Rutas Guardadas</h2>

          <SavedRoutes
            rutas={rutasGuardadas}
            onCargar={cargarRutaGuardada}
            onImportar={importarRuta}
            onEliminar={eliminarRutaGuardada}
          />
        </div>
      </div>
    </>
  );
};
