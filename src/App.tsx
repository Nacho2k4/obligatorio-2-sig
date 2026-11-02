import { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import TileLayer from '@arcgis/core/layers/TileLayer';

import { RoutePlanner } from './modules/persona-a/components/RoutePlanner';

function App() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const tiledLayer = new TileLayer({
      url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer"
    });

    const map = new Map({
      layers: [tiledLayer]
    });

    const view = new MapView({
      container: mapRef.current,
      map: map,
      center: [-98.5795, 39.8283], // Centro de EE. UU.
      zoom: 4
    });

    return () => view.destroy();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* El panel flotando a la izquierda */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 99 }}>
        <RoutePlanner />
      </div>
      
      {/* El mapa de fondo */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default App;