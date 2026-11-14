import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventoParada } from '../../../contracts/contracts';
import { alCambiarVista } from '../../../shared/map/vista';
import {
  centrarEnEvento,
  COLORES_TIPO_EVENTO,
  escucharClicksEventosServidor,
  mostrarEventosServidor,
  resaltarEventoServidor
} from '../map/capaEventosServidor';
import { LARGO_MAXIMO_NOMBRE } from '../repositories/eventRepository';
import { eventRepository } from '../repositories/repositorios';
import { EventForm } from './EventForm';

const TIPOS_EVENTO = ['Art Festival', 'Farmers Market', 'Movie Night', 'Fair', 'Parade', 'Other'];

interface EventManagerProps {
  activo: boolean;
  objectIdsEnRuta: number[];
  onAgregarARuta: (evento: EventoParada) => void;
  onEventoActualizado: (evento: EventoParada) => void;
  onEventoEliminado: (objectId: number) => void;
}

interface Edicion {
  objectId: number;
  nombre: string;
  tipo: number;
  fecha: string;
}

const estiloBoton = (color: string, habilitado = true): React.CSSProperties => ({
  padding: '4px 8px',
  backgroundColor: habilitado ? color : '#ccc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: habilitado ? 'pointer' : 'not-allowed',
  fontSize: '12px',
  fontWeight: 'bold'
});

const estiloCampo: React.CSSProperties = { padding: '6px', border: '1px solid #ccc', borderRadius: '4px' };

// alta, baja, modificación y consulta de eventos del featureserver de events
export const EventManager = ({ activo, objectIdsEnRuta, onAgregarARuta, onEventoActualizado, onEventoEliminado }: EventManagerProps) => {
  const [texto, setTexto] = useState('');
  const [eventos, setEventos] = useState<EventoParada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const yaCargo = useRef(false);
  const lista = useRef<HTMLUListElement>(null);

  const buscar = useCallback(async (filtro: string) => {
    setCargando(true);
    setMensaje(null);
    try {
      setEventos(await eventRepository.buscarEventos(filtro));
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudieron consultar los eventos del servidor. Revisá la conexión y volvé a buscar.' });
    } finally {
      setCargando(false);
    }
  }, []);

  const seleccionar = useCallback((evento: EventoParada) => {
    setSeleccionado(evento.objectId ?? null);
    void resaltarEventoServidor(evento.objectId ?? null);
    centrarEnEvento(evento.punto);
  }, []);

  // la capa del servidor solo se ve mientras esta pantalla está abierta
  useEffect(() => {
    mostrarEventosServidor(activo);
    if (activo && !yaCargo.current) {
      yaCargo.current = true;
      void buscar('');
    }
  }, [activo, buscar]);

  // click en un evento del mapa: se selecciona en la lista, trayéndolo del servidor si no estaba
  useEffect(() => {
    let handle: { remove(): void } | null = null;
    const desuscribir = alCambiarVista((vista) => {
      handle?.remove();
      handle = vista
        ? escucharClicksEventosServidor(vista, async (objectId) => {
            setSeleccionado(objectId);
            void resaltarEventoServidor(objectId);
            const [evento] = await eventRepository.obtenerEventos([objectId]).catch(() => []);
            if (evento) setEventos((prev) => (prev.some((e) => e.objectId === objectId) ? prev : [evento, ...prev]));
          })
        : null;
    });
    return () => {
      desuscribir();
      handle?.remove();
    };
  }, []);

  useEffect(() => {
    if (seleccionado === null) return;
    lista.current?.querySelector(`[data-objectid="${seleccionado}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [seleccionado, eventos]);

  const alCrear = (evento: EventoParada) => {
    setEventos((prev) => [evento, ...prev]);
    setMensaje({ tipo: 'ok', texto: `Evento "${evento.nombre}" creado en el servidor.` });
    seleccionar(evento);
  };

  const guardarEdicion = async () => {
    if (!edicion) return;
    if (!edicion.nombre.trim()) return setMensaje({ tipo: 'error', texto: 'El nombre del evento no puede quedar vacío.' });
    setOcupado(edicion.objectId);
    setMensaje(null);
    try {
      const cambios = { nombre: edicion.nombre.trim(), tipo: edicion.tipo, fecha: edicion.fecha || undefined };
      await eventRepository.actualizarEvento(edicion.objectId, cambios);
      const anterior = eventos.find((e) => e.objectId === edicion.objectId);
      if (anterior) {
        const actualizado = { ...anterior, ...cambios };
        setEventos((prev) => prev.map((e) => (e.objectId === edicion.objectId ? actualizado : e)));
        onEventoActualizado(actualizado);
      }
      setEdicion(null);
      setMensaje({ tipo: 'ok', texto: 'Evento actualizado.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar el evento.' });
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (evento: EventoParada) => {
    const objectId = evento.objectId;
    if (objectId === undefined) return;
    const enRuta = objectIdsEnRuta.includes(objectId);
    const aviso = enRuta ? ' También se va a quitar de la ruta que estás armando.' : '';
    if (!window.confirm(`¿Eliminar el evento "${evento.nombre}" del servidor? Esta acción no se puede deshacer.${aviso}`)) return;

    setOcupado(objectId);
    setMensaje(null);
    try {
      await eventRepository.eliminarEvento(objectId);
      setEventos((prev) => prev.filter((e) => e.objectId !== objectId));
      if (seleccionado === objectId) {
        setSeleccionado(null);
        void resaltarEventoServidor(null);
      }
      onEventoEliminado(objectId);
      setMensaje({ tipo: 'ok', texto: 'Evento eliminado.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo eliminar el evento.' });
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: 0 }}>Nuevo evento</h3>
        <EventForm onEventoCreado={alCrear} textoAccion="Crear evento" />
      </section>

      <hr style={{ margin: '4px 0', border: '1px solid #ddd', width: '100%' }} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: 0 }}>Eventos en el servidor</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Filtrar por nombre (ej. Oklahoma)"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void buscar(texto); }}
            style={{ ...estiloCampo, flex: 1, padding: '8px' }}
          />
          <button onClick={() => void buscar(texto)} disabled={cargando} style={{ padding: '8px', cursor: 'pointer' }}>
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>
          Se muestran los 100 más recientes. El servicio es compartido: también aparecen eventos de otros usuarios. Hacé clic en un evento del mapa para seleccionarlo.
        </p>

        {mensaje && (
          <p style={{ fontSize: '12px', margin: 0, color: mensaje.tipo === 'error' ? '#c53030' : '#2f855a' }}>{mensaje.texto}</p>
        )}

        {!cargando && eventos.length === 0 && !mensaje && (
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>No hay eventos que coincidan.</p>
        )}

        <ul ref={lista} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {eventos.map((evento) => {
            const id = evento.objectId as number;
            const esSeleccionado = id === seleccionado;
            const enRuta = objectIdsEnRuta.includes(id);
            const editando = edicion?.objectId === id;

            return (
              <li
                key={id}
                data-objectid={id}
                style={{
                  padding: '8px 10px',
                  border: esSeleccionado ? '2px solid #1890ff' : '1px solid #e2e8f0',
                  backgroundColor: esSeleccionado ? '#e6f7ff' : '#fff',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {editando && edicion ? (
                  <>
                    <input
                      type="text"
                      value={edicion.nombre}
                      maxLength={LARGO_MAXIMO_NOMBRE}
                      onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                      style={estiloCampo}
                      aria-label="Nombre del evento"
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select
                        value={edicion.tipo}
                        onChange={(e) => setEdicion({ ...edicion, tipo: Number(e.target.value) })}
                        style={{ ...estiloCampo, flex: 1 }}
                        aria-label="Tipo de evento"
                      >
                        {TIPOS_EVENTO.map((t, i) => <option key={t} value={i}>{t}</option>)}
                      </select>
                      <input
                        type="date"
                        value={edicion.fecha}
                        onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })}
                        style={estiloCampo}
                        aria-label="Fecha del evento"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => void guardarEdicion()} disabled={ocupado === id} style={estiloBoton('#52c41a', ocupado !== id)}>
                        {ocupado === id ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEdicion(null)} style={estiloBoton('#718096')}>Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div onClick={() => seleccionar(evento)} style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span
                        style={{ width: '10px', height: '10px', borderRadius: '50%', marginTop: '5px', flexShrink: 0, backgroundColor: COLORES_TIPO_EVENTO[evento.tipo] ?? '#9e9e9e' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: '14px', color: '#4a5568', display: 'block', wordWrap: 'break-word' }}>{evento.nombre}</strong>
                        <span style={{ fontSize: '12px', color: '#718096' }}>
                          {TIPOS_EVENTO[evento.tipo] ?? 'Sin tipo'}
                          {evento.fecha && ` · ${new Date(`${evento.fecha}T12:00:00Z`).toLocaleDateString()}`}
                          {enRuta && ' · en la ruta'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => onAgregarARuta(evento)} disabled={enRuta} style={estiloBoton('#1890ff', !enRuta)}>
                        {enRuta ? 'En la ruta' : 'Agregar a la ruta'}
                      </button>
                      <button
                        onClick={() => setEdicion({ objectId: id, nombre: evento.nombre, tipo: evento.tipo, fecha: evento.fecha ?? '' })}
                        style={estiloBoton('#4a5568')}
                      >
                        Editar
                      </button>
                      <button onClick={() => void eliminar(evento)} disabled={ocupado === id} style={estiloBoton('#ff4d4f', ocupado !== id)}>
                        {ocupado === id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};
