import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import type Polyline from '@arcgis/core/geometry/Polyline';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import type { GraphicHit } from '@arcgis/core/views/types';
import type { EventoParada } from '../../../contracts/contracts';
import { capas } from '../../../shared/map/capas';
import { obtenerVista, obtenerVista2D, type Vista } from '../../../shared/map/vista';
import { exportarRutaPdf } from '../services/printService';

const capa = capas.eventos;
let geometriaActual: Polyline | null = null;
let seleccionActual: number | null = null;

const crearSimboloPin = (seleccionado: boolean) => new SimpleMarkerSymbol({
  color: [255, 77, 79],
  size: seleccionado ? 22 : 18,
  outline: {
    color: seleccionado ? [24, 144, 255] : [255, 255, 255],
    width: seleccionado ? 3 : 2
  }
});

const crearSimboloNumero = (texto: string, seleccionado: boolean) => new TextSymbol({
  color: 'white',
  text: texto,
  horizontalAlignment: 'center',
  verticalAlignment: 'middle',
  font: {
    size: seleccionado ? 11 : 9,
    weight: 'bold',
    family: 'sans-serif'
  }
});

export const dibujarPlanificacion = (geometria: Polyline | null, paradas: EventoParada[]) => {
  capa.removeAll();
  geometriaActual = geometria;

  if (geometria) {
    capa.add(new Graphic({
      geometry: geometria,
      symbol: new SimpleLineSymbol({ color: [24, 144, 255, 0.8], width: 4 })
    }));
  }

  paradas.forEach((parada, index) => {
    const seleccionado = parada.eventId === seleccionActual;
    const punto = new Point({ x: parada.punto.x, y: parada.punto.y, spatialReference: { wkid: 4326 } });

    capa.addMany([
      new Graphic({ geometry: punto, symbol: crearSimboloPin(seleccionado), attributes: parada }),
      new Graphic({ geometry: punto, symbol: crearSimboloNumero((index + 1).toString(), seleccionado), attributes: parada })
    ]);
  });

  const view = obtenerVista();
  if (!view) return;
  if (geometria?.extent) {
    view.goTo({ target: geometria.extent.clone().expand(1.6) }).catch(() => {});
  } else if (paradas.length > 0) {
    const ultima = paradas[paradas.length - 1];
    view.goTo({ target: [ultima.punto.x, ultima.punto.y], zoom: 14 }).catch(() => {});
  }
};

export const marcarSeleccion = (eventId: number | null) => {
  seleccionActual = eventId;

  capa.graphics.forEach((graphic) => {
    if (graphic.geometry?.type !== 'point' || !graphic.attributes) return;
    const seleccionado = graphic.attributes.eventId === eventId;

    if (graphic.symbol instanceof SimpleMarkerSymbol) {
      graphic.symbol = crearSimboloPin(seleccionado);
    } else if (graphic.symbol instanceof TextSymbol) {
      graphic.symbol = crearSimboloNumero(graphic.symbol.text ?? '', seleccionado);
    }
  });
};

export const centrarEnParada = (parada: EventoParada) => {
  obtenerVista()?.goTo({ target: [parada.punto.x, parada.punto.y], zoom: 15 }).catch(() => {});
};

export const escucharClicks = (view: Vista, onSeleccion: (eventId: number | null) => void) =>
  view.on('click', async (event) => {
    const response = await view.hitTest(event);
    const hit = response.results.find(
      (r): r is GraphicHit => r.type === 'graphic' && r.graphic.layer === capa
    );
    onSeleccion(hit?.graphic.attributes ? hit.graphic.attributes.eventId : null);
  });

export const imprimirRuta = async (titulo: string) => {
  // siempre la vista 2d: si se está mostrando la 3d, la 2d sigue viva detrás y se imprime desde ahí
  const view = obtenerVista2D();
  if (!view) return;

  const viewpointPrevio = view.viewpoint.clone(); // para devolver al usuario donde estaba

  try {
    if (geometriaActual?.extent) {
      await view.goTo({ target: geometriaActual.extent.clone().expand(1.6) }, { animate: false });
      await reactiveUtils.whenOnce(() => !view.updating);
    }

    const urlPdf = await exportarRutaPdf(view, titulo);
    if (urlPdf) {
      window.open(urlPdf, '_blank');
    } else {
      alert('No se pudo generar el PDF. Intenta de nuevo.');
    }
  } finally {
    view.goTo(viewpointPrevio).catch(() => {});
  }
};
