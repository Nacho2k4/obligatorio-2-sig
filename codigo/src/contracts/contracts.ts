import type Polyline from "@arcgis/core/geometry/Polyline";

export interface EventoParada {
  eventId: number;
  objectId?: number; // objectid del evento en el featureserver de events, si ya está guardado
  fecha?: string; // eventdate como fecha iso (yyyy-mm-dd)
  nombre: string;
  tipo: number; // 0: Art Festival, 1: Farmers Market, 2: Movie Night, 3: Fair, 4: Parade, 5: Other
  punto: {
    x: number; // Longitud
    y: number; // Latitud
  };
}

export interface RutaGuardada {
  id: string;
  nombre: string;
  paradas: EventoParada[];
  geometria: Polyline; // wgs84, obligatoria porque la simulación recorre esta polilínea
  creada: string;
}
