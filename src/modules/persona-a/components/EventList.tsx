import { useState } from 'react';
import type { EventoParada, RutaGuardada } from '../../../contracts/contracts';
import { calcularRuta } from '../services/routingService';
import { guardarRuta } from '../repositories/routeRepository';

const MAPA_TIPOS_EVENTO: Record<number, string> = {
  0: 'Art Festival', 1: 'Farmers Market', 2: 'Movie Night',
  3: 'Fair', 4: 'Parade', 5: 'Other'
};

interface EventListProps {
  paradas: EventoParada[];
  rutaCalculada: any;
  onEliminarParada: (eventId: number) => void;
  onMoverParada: (index: number, direccion: 'up' | 'down') => void;
  onRutaCalculada: (ruta: any) => void;
  paradaSeleccionada?: number | null; 
  onCentrarEnParada?: (parada: EventoParada) => void;
  onImprimirMapa?: () => Promise<void>;
}

export const EventList = ({ 
  paradas, 
  rutaCalculada, 
  onEliminarParada, 
  onMoverParada, 
  onRutaCalculada, 
  paradaSeleccionada, 
  onCentrarEnParada,
  onImprimirMapa
}: EventListProps) => {
  const [nombreRuta, setNombreRuta] = useState('Mi Ruta de Eventos');
  const [isPrinting, setIsPrinting] = useState(false);

  const handleCalcularRuta = async () => {
    if (paradas.length < 2) return;
    const resultado = await calcularRuta(paradas);
    if (resultado) {
      console.log("✅ Ruta final generada:", resultado);
      onRutaCalculada(resultado);
    }
  };

  const handleGuardarRuta = () => {
    if (!rutaCalculada || !nombreRuta.trim()) return alert("Ingresa un nombre válido.");
    
    const nuevaRuta: RutaGuardada = {
      id: `ruta-${Date.now()}`,
      nombre: nombreRuta.trim(),
      paradas: [...paradas],
      geometria: rutaCalculada.geometry,
      creada: new Date().toISOString()
    };
    guardarRuta(nuevaRuta);
    alert("¡Ruta guardada correctamente!");
  };

  const handleImprimir = async () => {
    if (!onImprimirMapa) return;
    setIsPrinting(true);
    await onImprimirMapa();
    setIsPrinting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Ruta Actual ({paradas.length} paradas)</h3>
      
      {paradas.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#666' }}>No hay paradas agregadas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {paradas.map((parada, index) => {
            const isSelected = parada.eventId === paradaSeleccionada;
            
            return (
              <li 
                key={parada.eventId} 
                style={{ 
                  padding: '10px 12px', 
                  backgroundColor: isSelected ? '#e6f7ff' : '#fff', 
                  border: isSelected ? '2px solid #1890ff' : '1px solid #e2e8f0', 
                  marginBottom: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  gap: '16px', 
                  borderRadius: '8px', 
                  boxShadow: isSelected ? '0 4px 8px rgba(24, 144, 255, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease-in-out',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div 
                  onClick={() => onCentrarEnParada && onCentrarEnParada(parada)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', flex: 1, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#718096', minWidth: '24px', textAlign: 'center' }}>
                    {index + 1}
                  </span>
                  <div style={{ width: '3px', minWidth: '3px', alignSelf: 'stretch', backgroundColor: '#a0aec0', borderRadius: '2px', margin: '4px 0' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '15px', color: '#4a5568', display: 'block', wordWrap: 'break-word' }}>
                      {parada.nombre}
                    </strong>
                    <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                      Tipo: {MAPA_TIPOS_EVENTO[parada.tipo] || 'Desconocido'}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <button 
                    onClick={() => onMoverParada(index, 'up')}
                    disabled={index === 0}
                    style={{ 
                      width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: index === 0 ? '#cbd5e0' : '#4a5568', color: 'white', border: 'none', 
                      borderRadius: '6px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', lineHeight: 1
                    }}
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
                  >
                    X
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button 
        onClick={handleCalcularRuta} disabled={paradas.length < 2}
        style={{ padding: '10px', backgroundColor: paradas.length < 2 ? '#ccc' : '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: paradas.length < 2 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
      >
        Calcular Ruta Múltiple
      </button>

      {rutaCalculada && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'left', color: '#2d3748' }}>Nombre para guardar la ruta:</label>
          <input type="text" value={nombreRuta} onChange={(e) => setNombreRuta(e.target.value)} style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} />
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button 
              onClick={handleGuardarRuta} 
              style={{ flex: 1, padding: '8px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Guardar
            </button>
            <button 
              onClick={handleImprimir} 
              disabled={isPrinting}
              style={{ flex: 1, padding: '8px', backgroundColor: isPrinting ? '#ccc' : '#722ed1', color: 'white', border: 'none', borderRadius: '4px', cursor: isPrinting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {isPrinting ? 'Exportando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};