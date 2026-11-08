import { useRef, useState } from 'react';
import type { RutaGuardada } from '../../../contracts/contracts';
import { exportarRutaArchivo, leerRutaDesdeArchivo } from '../services/routeFileService';

interface SavedRoutesProps {
  rutas: RutaGuardada[];
  onCargar: (ruta: RutaGuardada) => void;
  onImportar: (ruta: RutaGuardada) => void;
  onEliminar: (id: string) => void;
}

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

export const SavedRoutes = ({ rutas, onCargar, onImportar, onEliminar }: SavedRoutesProps) => {
  const [seleccionId, setSeleccionId] = useState('');
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const ordenadas = [...rutas].reverse();
  const rutaSeleccionada = rutas.find((r) => r.id === seleccionId);

  const handleCargar = () => {
    if (rutaSeleccionada) onCargar(rutaSeleccionada);
  };

  const handleExportar = () => {
    if (rutaSeleccionada) exportarRutaArchivo(rutaSeleccionada);
  };

  const handleEliminar = () => {
    if (!rutaSeleccionada) return;
    if (!window.confirm(`¿Eliminar la ruta "${rutaSeleccionada.nombre}"? Esta acción no se puede deshacer.`)) return;

    onEliminar(rutaSeleccionada.id);
    setSeleccionId('');
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
      {rutas.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Todavía no hay rutas guardadas.</p>
      ) : (
        <>
          <select
            value={seleccionId}
            onChange={(e) => setSeleccionId(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', color: '#2d3748' }}
          >
            <option value="">Elegí una ruta...</option>
            {ordenadas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre} ({r.paradas.length} paradas · {new Date(r.creada).toLocaleDateString()})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCargar} disabled={!rutaSeleccionada} style={estiloBoton(!!rutaSeleccionada, '#fa8c16')}>
              Cargar ruta
            </button>
            <button onClick={handleExportar} disabled={!rutaSeleccionada} style={estiloBoton(!!rutaSeleccionada, '#13a8a8')}>
              Exportar archivo
            </button>
          </div>

          <button
            onClick={handleEliminar}
            disabled={!rutaSeleccionada}
            style={{ ...estiloBoton(!!rutaSeleccionada, '#ff4d4f'), flex: 'none' }}
          >
            Eliminar ruta
          </button>
        </>
      )}

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
    </div>
  );
};
