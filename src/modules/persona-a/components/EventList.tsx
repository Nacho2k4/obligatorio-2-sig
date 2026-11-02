import type { EventoParada } from '../../../contracts/contracts';
import { calcularRuta } from '../services/routingService';

const MAPA_TIPOS_EVENTO: Record<number, string> = {
  0: 'Art Festival',
  1: 'Farmers Market',
  2: 'Movie Night',
  3: 'Fair',
  4: 'Parade',
  5: 'Other'
};

interface EventListProps {
  paradas: EventoParada[];
  onEliminarParada: (eventId: number) => void;
}

export const EventList = ({ paradas, onEliminarParada }: EventListProps) => {
  
  const handleCalcularRuta = async () => {
    if (paradas.length < 2) return;
    const ruta = await calcularRuta(paradas);
    if (ruta) console.log("Ruta final generada:", ruta);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Ruta Actual ({paradas.length} paradas)</h3>
      
      {paradas.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#666' }}>No hay paradas agregadas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {paradas.map((parada) => (
            <li 
              key={parada.eventId} 
              style={{ 
                padding: '8px', 
                backgroundColor: '#fff', 
                border: '1px solid #ddd', 
                marginBottom: '5px', 
                display: 'flex', 
                justifyContent: 'space-between',
                borderRadius: '4px'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div>
                    <strong>{parada.nombre}</strong>
                    {/* Diccionario para mostrar el texto en vez del número */}
                    <div style={{ fontSize: '12px', color: '#666' }}>
                    Tipo: {MAPA_TIPOS_EVENTO[parada.tipo] || 'Desconocido'}
                    </div>
                </div>
              </div>
              <button 
                onClick={() => onEliminarParada(parada.eventId)}
                style={{ backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}
              >
                X
              </button>
            </li>
          ))}
        </ul>
      )}

      <button 
        onClick={handleCalcularRuta} 
        disabled={paradas.length < 2}
        style={{ 
          padding: '10px', 
          backgroundColor: paradas.length < 2 ? '#ccc' : '#1890ff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: paradas.length < 2 ? 'not-allowed' : 'pointer',
          marginTop: '10px',
          fontWeight: 'bold'
        }}
      >
        Calcular Ruta Múltiple
      </button>
    </div>
  );
};