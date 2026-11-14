export const ARCGIS_API_KEY: string = import.meta.env.VITE_ARCGIS_API_KEY ?? "";

export const SERVICIOS = {
  basemapWorldStreet:
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
  // la letra exige usar este servicio para buffer e intersect, no la geometría local
  geometryServer:
    "https://tasks.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer",
  // el campo de población es POPULATION, no POPULATION_2020 como dice la letra
  condados:
    "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0",
  printing:
    "https://sampleserver5.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer",
  eventos:
    "https://sampleserver5.arcgisonline.com/arcgis/rest/services/LocalGovernment/Events/FeatureServer/0",
  rutasGuardadas:
    "https://sampleserver5.arcgisonline.com/arcgis/rest/services/LocalGovernment/Recreation/FeatureServer/1",
} as const;
