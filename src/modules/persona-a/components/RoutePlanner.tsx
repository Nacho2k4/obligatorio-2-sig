import { useState } from 'react';
import type { EventoParada } from '../../../contracts/contracts';
import { EventForm } from './EventForm';
import { EventList } from './EventList';

export const RoutePlanner = () => {
  // Estado centralizado: mantiene la lista de eventos agregados a la ruta
  const [paradas, setParadas] = useState<EventoParada[]>([]);

  const agregarParada = (nuevaParada: EventoParada) => {
    setParadas((prev) => [...prev, nuevaParada]);
  };

  const eliminarParada = (eventId: number) => {
    setParadas((prev) => prev.filter((parada) => parada.eventId !== eventId));
  };

  const moverParada = (index: number, direccion: 'up' | 'down') => {
    const nuevasParadas = [...paradas];
    if (direccion === 'up' && index > 0) {
      const temp = nuevasParadas[index - 1];
      nuevasParadas[index - 1] = nuevasParadas[index];
      nuevasParadas[index] = temp;
    } else if (direccion === 'down' && index < nuevasParadas.length - 1) {
      const temp = nuevasParadas[index + 1];
      nuevasParadas[index + 1] = nuevasParadas[index];
      nuevasParadas[index] = temp;
    }
    setParadas(nuevasParadas);
  };

  return (
    <div style={{ width: '350px', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginTop: 0, color: '#5c5e61' }}>Planificador de Ruta</h2>
      
      <EventForm onAgregarParada={agregarParada} />
      
      <hr style={{ margin: '1.5rem 0', border: '1px solid #ddd' }} />
      
      <EventList 
        paradas={paradas} 
        onEliminarParada={eliminarParada} 
        onMoverParada={moverParada}
      />
    </div>
  );
};