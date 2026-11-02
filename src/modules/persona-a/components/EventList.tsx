import type { EventoParada } from '../../../contracts/contracts';
import { calcularRuta } from '../services/routingService';
import { guardarRuta } from '../repositories/routeRepository';
import type { RutaGuardada } from '../../../contracts/contracts';
import { useState, useEffect } from 'react';

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
  onMoverParada: (index: number, direccion: 'up' | 'down') => void;
}

export const EventList = ({ paradas, onEliminarParada, onMoverParada }: EventListProps) => {
  const [rutaCalculada, setRutaCalculada] = useState<any>(null);
  const [nombreRuta, setNombreRuta] = useState('Mi Ruta de Eventos');
  
  useEffect(() => {
    setRutaCalculada(null);
  }, [paradas]);

  const handleCalcularRuta = async () => {
    if (paradas.length < 2) return;
    setRutaCalculada(null);

    const resultado = await calcularRuta(paradas);
    if (resultado) {
      console.log("Ruta final generada:", rutaCalculada);
      setRutaCalculada(resultado);
    }
  };

  const handleGuardarRuta = () => {
    if (!rutaCalculada || !nombreRuta.trim()) {
      alert("Por favor, ingresa un nombre válido para la ruta.");
      return;
    }
      
    const nuevaRuta: RutaGuardada = {
      id: `ruta-${Date.now()}`,
      nombre: nombreRuta,
      paradas: [...paradas],
      geometria: rutaCalculada.geometry,
      creada: new Date().toISOString()
    };
        
    guardarRuta(nuevaRuta);
    alert("Ruta guardada correctamente.");
  };

  // Si el usuario modifica las paradas, invalidamos la ruta calculada
  useEffect(() => {
    setRutaCalculada(null);
  }, [paradas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>
        Ruta Actual ({paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'})
      </h3>
      
      {paradas.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#666' }}>No hay paradas agregadas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {paradas.map((parada, index) => (
            <li 
              key={parada.eventId} 
              style={{ 
                padding: '10px 12px', 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0', 
                marginBottom: '8px', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {/* Sección izquierda: Índice + Barra Vertical + Textos */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', flex: 1 }}>
                {/* Número de parada */}
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#718096', minWidth: '24px', textAlign: 'center' }}>
                  {index + 1}
                </span>

                {/* Barra vertical adaptable */}
                <div style={{ 
                  width: '3px', 
                  minWidth: '3px',
                  alignSelf: 'stretch',
                  backgroundColor: '#a0aec0', 
                  borderRadius: '2px',
                  margin: '4px 0' 
                }} />

                {/* Información del evento */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: '15px', color: '#4a5568', display: 'block', wordWrap: 'break-word' }}>
                    {parada.nombre}
                  </strong>
                  <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                    Tipo: {MAPA_TIPOS_EVENTO[parada.tipo] || 'Desconocido'}
                  </div>
                </div>
              </div>
              
              {/* Sección derecha: Botones protegidos contra compresión */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <button 
                  onClick={() => onMoverParada(index, 'up')}
                  disabled={index === 0}
                  style={{ 
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: index === 0 ? '#cbd5e0' : '#4a5568', color: 'white', border: 'none', 
                    borderRadius: '6px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', lineHeight: 1
                  }}
                  title="Subir parada"
                >
                  ↑
                </button>

                <button 
                  onClick={() => onMoverParada(index, 'down')}
                  disabled={index === paradas.length - 1}
                  style={{ 
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: index === paradas.length - 1 ? '#cbd5e0' : '#4a5568', color: 'white', border: 'none', 
                    borderRadius: '6px', cursor: index === paradas.length - 1 ? 'not-allowed' : 'pointer', fontSize: '14px', lineHeight: 1
                  }}
                  title="Bajar parada"
                >
                  ↓
                </button>

                <button 
                  onClick={() => onEliminarParada(parada.eventId)}
                  style={{ 
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '6px', 
                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', lineHeight: 1
                  }}
                  title="Eliminar parada"
                >
                  X
                </button>
              </div>
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

      {rutaCalculada && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'left' }}>
            Nombre para guardar la ruta:
          </label>
          <input 
            type="text" 
            value={nombreRuta}
            onChange={(e) => setNombreRuta(e.target.value)}
            style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button 
            onClick={handleGuardarRuta} 
            style={{ 
              padding: '8px', 
              backgroundColor: '#52c41a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Guardar Ruta
          </button>
        </div>
      )}
    </div>
  );
};