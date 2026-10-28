import { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import TileLayer from '@arcgis/core/layers/TileLayer';

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

  return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />;
}

export default App;