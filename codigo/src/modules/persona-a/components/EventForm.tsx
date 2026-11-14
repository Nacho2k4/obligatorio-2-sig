import { useState } from 'react';
import type { EventoParada } from '../../../contracts/contracts';
import { eventRepository } from '../repositories/repositorios';
import { probarGeocoding } from '../services/geocodingService';

interface EventFormProps {
  // recibe el evento ya creado en el featureserver (con su objectId)
  onEventoCreado: (evento: EventoParada) => void;
  textoAccion?: string;
}

const hoy = () => new Date().toISOString().slice(0, 10);

export const EventForm = ({ onEventoCreado, textoAccion = 'Añadir' }: EventFormProps) => {
  const [busqueda, setBusqueda] = useState('');
  const [tipoEvento, setTipoEvento] = useState(0);
  const [fecha, setFecha] = useState(hoy);
  const [resultados, setResultados] = useState<{address: string, x: number, y: number}[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const buscarDireccion = async () => {
    if (!busqueda) return;
    setBuscando(true);
    setMensaje(null);

    const res = await probarGeocoding(busqueda);
    if (res) {
      setResultados(res);
      if (res.length === 0) setMensaje('No se encontraron lugares con ese nombre en EE. UU.');
    } else {
      setMensaje('No se pudo buscar el lugar. Revisá la conexión o la API key.');
    }

    setBuscando(false);
  };

  // el evento se da de alta en el servidor antes de usarse como parada
  const agregarResultado = async (resultado: {address: string, x: number, y: number}, indice: number) => {
    setGuardando(indice);
    setMensaje(null);
    try {
      const evento = await eventRepository.crearEvento({
        nombre: resultado.address,
        tipo: Number(tipoEvento),
        fecha,
        punto: { x: resultado.x, y: resultado.y }
      });
      onEventoCreado(evento);
      setResultados([]);
      setBusqueda('');
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo crear el evento.');
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <style>{`
            .input-personalizado::placeholder {
            color: #c2c4c7; /* Cambia este código por el color que quieras (ej. Azul) */
            opacity: 1;     /* Evita que se vea transparente en algunos navegadores */
            }
      `}</style>

      <input
        type="text"
        className="input-personalizado"
        placeholder="Buscar ciudad o dirección (ej. Miami)"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') buscarDireccion(); }}
        style={{ padding: '8px'}}
      />

      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={tipoEvento}
          onChange={(e) => setTipoEvento(Number(e.target.value))}
          style={{ padding: '8px', flex: 1 }}
          aria-label="Tipo de evento"
        >
          <option value={0}>Art Festival</option>
          <option value={1}>Farmers Market</option>
          <option value={2}>Movie Night</option>
          <option value={3}>Fair</option>
          <option value={4}>Parade</option>
          <option value={5}>Other</option>
        </select>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ padding: '8px' }}
          aria-label="Fecha del evento"
        />
      </div>

      <button
        onClick={buscarDireccion}
        disabled={buscando}
        style={{ padding: '8px', cursor: 'pointer' }}
      >
        {buscando ? 'Buscando...' : 'Buscar'}
      </button>

      {mensaje && <p style={{ fontSize: '12px', color: '#c53030', margin: 0 }}>{mensaje}</p>}

      {/* Lista de candidatos devueltos por el geocodificador */}
      {resultados.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0', border: '1px solid #ccc' }}>
          {resultados.map((res, index) => (
            <li
              key={index}
              style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ fontSize: '12px' }}>{res.address}</span>
              <button onClick={() => agregarResultado(res, index)} disabled={guardando !== null} style={{ cursor: 'pointer', flexShrink: 0 }}>
                {guardando === index ? 'Guardando...' : textoAccion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
