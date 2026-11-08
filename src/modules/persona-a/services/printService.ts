import * as print from "@arcgis/core/rest/print";
import PrintTemplate from "@arcgis/core/rest/support/PrintTemplate";
import PrintParameters from "@arcgis/core/rest/support/PrintParameters";
import MapView from "@arcgis/core/views/MapView";

const PRINT_SERVICE_URL = "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task";

export const exportarRutaPdf = async (view: MapView, titulo: string = "Mapa de Ruta") => {
  try {
    const template = new PrintTemplate({
      format: "pdf",
      layout: "a4-landscape",
      layoutOptions: {
        titleText: titulo,
        authorText: "Planificador de Rutas SIG"
      }
    });

    const params = new PrintParameters({
      view: view,
      template: template
    });

    const result = await print.execute(PRINT_SERVICE_URL, params);
    return result.url;
  } catch (error) {
    console.error("Error al exportar el mapa:", error);
    return null;
  }
};