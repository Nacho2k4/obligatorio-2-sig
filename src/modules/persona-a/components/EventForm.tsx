import { useState } from 'react';
import type { EventoParada } from '../../../contracts/contracts';
import { probarGeocoding } from '../services/geocodingService';

let idGenerador = 1;

interface EventFormProps {
  onAgregarParada: (parada: EventoParada) => void;
}

export const EventForm = ({ onAgregarParada }: EventFormProps) => {
  const [busqueda, setBusqueda] = useState('');
  const [tipoEvento, setTipoEvento] = useState(0);
  const [resultados, setResultados] = useState<{address: string, x: number, y: number}[]>([]);
  const [buscando, setBuscando] = useState(false);

  const buscarDireccion = async () => {
    if (!busqueda) return;
    setBuscando(true);
    
    const res = await probarGeocoding(busqueda);
    if (res) {
      setResultados(res);
    }
    
    setBuscando(false);
  };

  const agregarResultado = (resultado: {address: string, x: number, y: number}) => {
    const nuevaParada: EventoParada = {
      eventId: idGenerador++,
      nombre: resultado.address,
      tipo: Number(tipoEvento),
      punto: { x: resultado.x, y: resultado.y }
    };

    onAgregarParada(nuevaParada);
    
    setResultados([]);
    setBusqueda('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input 
        type="text" 
        placeholder="Buscar ciudad o dirección (ej. Miami)" 
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ padding: '8px' }}
      />
      
      <select 
        value={tipoEvento} 
        onChange={(e) => setTipoEvento(Number(e.target.value))}
        style={{ padding: '8px' }}
      >
        <option value={0}>Art Festival</option>
        <option value={1}>Farmers Market</option>
        <option value={2}>Movie Night</option>
        <option value={3}>Fair</option>
        <option value={4}>Parade</option>
        <option value={5}>Other</option>
      </select>

      <button 
        onClick={buscarDireccion} 
        disabled={buscando}
        style={{ padding: '8px', cursor: 'pointer' }}
      >
        {buscando ? 'Buscando...' : 'Buscar'}
      </button>

      {/* Lista de candidatos devueltos por el geocodificador */}
      {resultados.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0', border: '1px solid #ccc' }}>
          {resultados.map((res, index) => (
            <li 
              key={index} 
              style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ fontSize: '12px' }}>{res.address}</span>
              <button onClick={() => agregarResultado(res)} style={{ cursor: 'pointer' }}>
                Añadir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};