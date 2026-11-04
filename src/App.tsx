import { exportarRutaPdf } from './modules/persona-a/services/printService';
import { RoutePlanner } from './modules/persona-a/components/RoutePlanner';
import type { EventoParada } from './contracts/contracts';
import { useEffect, useRef, useState } from 'react';
import './App.css'

import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import TileLayer from '@arcgis/core/layers/TileLayer';
import MapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import Map from '@arcgis/core/Map';


const crearSimboloPin = (seleccionado: boolean) => ({
  type: "simple-marker",
  color: [255, 77, 79],
  size: seleccionado ? "22px" : "18px",
  outline: {
    color: seleccionado ? [24, 144, 255] : [255, 255, 255],
    width: seleccionado ? 3 : 2
  }
} as any);

const crearSimboloNumero = (texto: string, seleccionado: boolean) => ({
  type: "text",
  color: "white",
  text: texto,
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  yoffset: 0,
  font: {
    size: seleccionado ? 11 : 9,
    weight: "bold",
    family: "sans-serif"
  }
} as any);

function App() {
  const [paradaSeleccionada, setParadaSeleccionada] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const graphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const rutaActualRef = useRef<any>(null);
  const paradaSeleccionadaRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const graphicsLayer = new GraphicsLayer();
    graphicsLayerRef.current = graphicsLayer;

    const tiledLayer = new TileLayer({
      url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer"
    });

    const map = new Map({ layers: [tiledLayer, graphicsLayer] });

    const view = new MapView({
      container: mapRef.current,
      map: map,
      center: [-98.5795, 39.8283],
      zoom: 4
    });

    viewRef.current = view;

    view.ui.move([ "zoom" ], "top-right");

    // Detectar clics en la vista del mapa
    view.on("click", (event) => {
      view.hitTest(event).then((response) => {
        const graphicHit = response.results.find(
          (r: any) => r.type === "graphic" && r.graphic.layer === graphicsLayer
        ) as __esri.GraphicHit;

        if (graphicHit && graphicHit.graphic.attributes) {
          setParadaSeleccionada(graphicHit.graphic.attributes.eventId);
        } else {
          setParadaSeleccionada(null);
        }
      });
    });

    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, []);

  const centrarEnParada = (parada: EventoParada) => {
    setParadaSeleccionada(parada.eventId);
    if (viewRef.current) {
      viewRef.current.goTo({
        target: [parada.punto.x, parada.punto.y],
        zoom: 15
      }).catch(() => {});
    }
  };

  const actualizarMapa = (rutaDevuelta: any | null, paradas: EventoParada[]) => {
    const layer = graphicsLayerRef.current;
    if (!layer) return;
    layer.removeAll();

    rutaActualRef.current = rutaDevuelta;

    if (rutaDevuelta) {
      layer.add(new Graphic({
        geometry: rutaDevuelta.geometry,
        symbol: { type: "simple-line", color: [24, 144, 255, 0.8], width: 4 } as any
      }));
    }

    // Dibujar los pines de las paradas con numeración centrada
    paradas.forEach((parada, index) => {
      const isSelected = parada.eventId === paradaSeleccionadaRef.current;

      const pointGeometry = {
        type: "point",
        x: parada.punto.x,
        y: parada.punto.y,
        spatialReference: { wkid: 4326 }
      } as any;

      layer.addMany([
        new Graphic({
          geometry: pointGeometry,
          symbol: crearSimboloPin(isSelected),
          attributes: parada
        }),
        new Graphic({
          geometry: pointGeometry,
          symbol: crearSimboloNumero((index + 1).toString(), isSelected),
          attributes: parada
        })
      ]);
    });

    if (viewRef.current) {
      if (rutaDevuelta) {
        viewRef.current.goTo({
          target: rutaDevuelta.geometry.extent.clone().expand(1.6)
        }).catch(() => {});
      }
      else if (paradas.length > 0) {
        const ultimaParada = paradas[paradas.length - 1];
        viewRef.current.goTo({
          target: [ultimaParada.punto.x, ultimaParada.punto.y],
          zoom: 14
        }).catch(() => {});
      }
    }
  };

  // Efecto para iluminar el pin (y su número) en el mapa cuando cambia la selección
  useEffect(() => {
    paradaSeleccionadaRef.current = paradaSeleccionada;

    const layer = graphicsLayerRef.current;
    if (!layer) return;

    layer.graphics.forEach((graphic) => {
      if (graphic.geometry.type !== "point" || !graphic.attributes) return;
      const isSelected = graphic.attributes.eventId === paradaSeleccionada;
      const tipo = (graphic.symbol as any).type;

      if (tipo === "simple-marker") {
        graphic.symbol = crearSimboloPin(isSelected);
      } else if (tipo === "text") {
        graphic.symbol = crearSimboloNumero((graphic.symbol as any).text, isSelected);
      }
    });
  }, [paradaSeleccionada]);

  const imprimirMapa = async () => {
    const view = viewRef.current;
    const ruta = rutaActualRef.current;
    if (!view) return;

    const viewpointPrevio = view.viewpoint.clone(); // para devolver al usuario donde estaba

    try {
      if (ruta?.geometry) {
        await view.goTo(
          { target: ruta.geometry.extent.clone().expand(1.6) },
          { animate: false }
        );
        await reactiveUtils.whenOnce(() => !view.updating);
      }

      const urlPdf = await exportarRutaPdf(view, "Mi Ruta Planificada");
      if (urlPdf) {
        window.open(urlPdf, "_blank");
      } else {
        alert("No se pudo generar el PDF. Intenta de nuevo.");
      }
    } finally {
      view.goTo(viewpointPrevio).catch(() => {});
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <RoutePlanner
        onUpdateMap={actualizarMapa}
        paradaSeleccionada={paradaSeleccionada}
        onCentrarEnParada={centrarEnParada}
        onImprimirMapa={imprimirMapa}
      />
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default App;