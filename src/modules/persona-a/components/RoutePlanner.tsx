import { useState, useEffect } from 'react';
import type { EventoParada } from '../../../contracts/contracts';
import { EventForm } from './EventForm';
import { EventList } from './EventList';

interface RoutePlannerProps {
  onUpdateMap?: (ruta: any | null, paradas: EventoParada[]) => void;
  paradaSeleccionada?: number | null; 
  onCentrarEnParada?: (parada: EventoParada) => void;
  onImprimirMapa?: () => Promise<void>;
}

export const RoutePlanner = ({ onUpdateMap, paradaSeleccionada, onCentrarEnParada, onImprimirMapa }: RoutePlannerProps) => {
  const [paradas, setParadas] = useState<EventoParada[]>([]);
  const [rutaActiva, setRutaActiva] = useState<any>(null);
  
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
    setRutaActiva(null);
    if (onUpdateMap) onUpdateMap(null, paradas);
  }, [paradas]);

  const manejarRutaCalculada = (ruta: any) => {
    setRutaActiva(ruta);
    if (onUpdateMap) onUpdateMap(ruta, paradas);
  };

  const agregarParada = (nuevaParada: EventoParada) => setParadas((prev) => [...prev, nuevaParada]);
  const eliminarParada = (eventId: number) => setParadas((prev) => prev.filter((p) => p.eventId !== eventId));
  const moverParada = (index: number, direccion: 'up' | 'down') => {
    const nuevas = [...paradas];
    if (direccion === 'up' && index > 0) [nuevas[index - 1], nuevas[index]] = [nuevas[index], nuevas[index - 1]];
    else if (direccion === 'down' && index < nuevas.length - 1) [nuevas[index + 1], nuevas[index]] = [nuevas[index], nuevas[index + 1]];
    setParadas(nuevas);
  };

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
        {/* Botón Cruz */}
        {isMobile && (
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
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

        {/* Título */}
        <h2 style={{ 
          marginTop: 0, 
          paddingRight: isMobile ? '30px' : '0',
          color: '#2d3748'
        }}>
          Planificador de Ruta
        </h2>
        
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
        />
      </div>
    </>
  );
};