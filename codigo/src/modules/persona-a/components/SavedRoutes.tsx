import { useRef, useState } from 'react';
import type { RutaGuardada } from '../../../contracts/contracts';
import type { ResumenRuta } from '../repositories/routeRepository';
import { leerRutaDesdeArchivo } from '../services/routeFileService';

interface SavedRoutesProps {
  rutas: ResumenRuta[];
  cargando: boolean;
  error: string | null;
  onActualizar: () => void;
  onCargar: (ruta: ResumenRuta) => Promise<void>;
  onExportar: (ruta: ResumenRuta) => Promise<void>;
  onImportar: (ruta: RutaGuardada) => void;
  onEliminar: (ruta: ResumenRuta) => Promise<void>;
}

type Accion = 'cargar' | 'exportar' | 'eliminar';

const estiloBoton = (activo: boolean, color: string): React.CSSProperties => ({
  flex: 1,
  padding: '8px',
  backgroundColor: activo ? color : '#ccc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: activo ? 'pointer' : 'not-allowed',
  fontWeight: 'bold'
});

export const SavedRoutes = ({ rutas, cargando, error, onActualizar, onCargar, onExportar, onImportar, onEliminar }: SavedRoutesProps) => {
  const [seleccionId, setSeleccionId] = useState('');
  const [enCurso, setEnCurso] = useState<Accion | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const rutaSeleccionada = rutas.find((r) => String(r.objectId) === seleccionId);
  const habilitado = !!rutaSeleccionada && enCurso === null;

  const ejecutar = async (accion: Accion, tarea: (ruta: ResumenRuta) => Promise<void>) => {
    if (!rutaSeleccionada) return;
    setEnCurso(accion);
    setMensaje(null);
    try {
      await tarea(rutaSeleccionada);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo completar la operación.');
    } finally {
      setEnCurso(null);
    }
  };

  const handleEliminar = () => {
    if (!rutaSeleccionada) return;
    if (!window.confirm(`¿Eliminar la ruta "${rutaSeleccionada.nombre}" del servidor? Esta acción no se puede deshacer. Los eventos de sus paradas se conservan.`)) return;
    void ejecutar('eliminar', async (ruta) => {
      await onEliminar(ruta);
      setSeleccionId('');
    });
  };

  const handleArchivoElegido = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    try {
      const ruta = await leerRutaDesdeArchivo(archivo);
      onImportar(ruta);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo importar la ruta.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#718096' }}>Rutas guardadas en el servidor (FeatureServer Trails)</span>
        <button onClick={onActualizar} disabled={cargando} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>
          {cargando ? 'Cargando...' : 'Actualizar lista'}
        </button>
      </div>

      {error && <p style={{ fontSize: '12px', color: '#c53030', margin: 0 }}>{error}</p>}

      {!cargando && !error && rutas.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Todavía no hay rutas guardadas.</p>
      ) : (
        <>
          <select
            value={seleccionId}
            onChange={(e) => setSeleccionId(e.target.value)}
            disabled={cargando}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', color: '#2d3748' }}
          >
            <option value="">{cargando ? 'Cargando rutas...' : 'Elegí una ruta...'}</option>
            {rutas.map((r) => (
              <option key={r.objectId} value={String(r.objectId)}>
                {r.nombre} ({r.cantidadParadas} paradas · {new Date(r.creada).toLocaleDateString()})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => void ejecutar('cargar', onCargar)} disabled={!habilitado} style={estiloBoton(habilitado, '#fa8c16')}>
              {enCurso === 'cargar' ? 'Cargando...' : 'Cargar ruta'}
            </button>
            <button onClick={() => void ejecutar('exportar', onExportar)} disabled={!habilitado} style={estiloBoton(habilitado, '#13a8a8')}>
              {enCurso === 'exportar' ? 'Exportando...' : 'Exportar archivo'}
            </button>
          </div>

          <button
            onClick={handleEliminar}
            disabled={!habilitado}
            style={{ ...estiloBoton(habilitado, '#ff4d4f'), flex: 'none' }}
          >
            {enCurso === 'eliminar' ? 'Eliminando...' : 'Eliminar ruta'}
          </button>
        </>
      )}

      {mensaje && <p style={{ fontSize: '12px', color: '#c53030', margin: 0 }}>{mensaje}</p>}

      <hr style={{ margin: '6px 0', border: '1px solid #ddd', width: '100%' }} />

      <input
        ref={inputArchivoRef}
        type="file"
        accept=".json,application/json"
        onChange={handleArchivoElegido}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => inputArchivoRef.current?.click()}
        style={{ ...estiloBoton(true, '#4a5568'), flex: 'none' }}
      >
        Importar desde archivo
      </button>
      <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>
        La ruta importada se abre en el planificador; apretá "Guardar" para subirla al servidor.
      </p>
    </div>
  );
};
