import { addressToLocations } from "@arcgis/core/rest/locator";

const GEOPORAL_URL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

export const probarGeocoding = async (busqueda: string) => {
  try {
    const resultados = await addressToLocations(GEOPORAL_URL, {
      address: { SingleLine: busqueda },
      countryCode: "USA",
      maxLocations: 5
    });

    const coordenadas = resultados.flatMap(candidato =>
      candidato.location
        ? [{
            address: candidato.address,
            x: candidato.location.x, // Longitud
            y: candidato.location.y  // Latitud
          }]
        : []
    );

    console.log("Coordenadas encontradas:", coordenadas);
    
    return coordenadas;
  } catch (error) {
    console.error("Error en Geocodificación:", error);
  }
};