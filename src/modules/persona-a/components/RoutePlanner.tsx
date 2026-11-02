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

  return (
    <div style={{ width: '350px', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginTop: 0 }}>Planificador de Ruta</h2>
      
      {/* Componente para buscar direcciones y agregar eventos */}
      <EventForm onAgregarParada={agregarParada} />
      
      <hr style={{ margin: '1.5rem 0', border: '1px solid #ddd' }} />
      
      {/* Componente para ver la lista actual y calcular la ruta final */}
      <EventList 
        paradas={paradas} 
        onEliminarParada={eliminarParada} 
      />
    </div>
  );
};